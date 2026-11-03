"""Private bounded OCR endpoint. No database, file-store or model access."""
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import threading
from app.ocr_native import run_native
from app.ocr_protocol import OcrError, MAX_FILE, validate_result


class Server(ThreadingHTTPServer):
    daemon_threads=True
    request_queue_size=8
    def __init__(self,address,token):
        self.token=token
        self.connections=threading.BoundedSemaphore(8)
        self.jobs=threading.BoundedSemaphore(1)
        super().__init__(address,Handler)
    def process_request(self,request,address):
        if not self.connections.acquire(blocking=False):
            self.shutdown_request(request);return
        try:super().process_request(request,address)
        except BaseException:self.connections.release();raise
    def process_request_thread(self,request,address):
        try:super().process_request_thread(request,address)
        finally:self.connections.release()


class Handler(BaseHTTPRequestHandler):
    server_version='DentDocsOCR'
    def log_message(self,*args):pass
    def setup(self):
        super().setup();self.connection.settimeout(15)
    def reply(self,status,value):
        self.close_connection=True
        payload=json.dumps(value,allow_nan=False,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(payload)))
        self.send_header('Cache-Control','no-store')
        self.send_header('Connection','close')
        self.end_headers();self.wfile.write(payload)
    def do_GET(self):
        self.reply(200 if self.path=='/health' else 404,{'status':'ready'} if self.path=='/health' else {'detail':'Not found'})
    def do_POST(self):
        if self.path!='/extract':self.reply(404,{'detail':'Not found'});return
        values=self.headers.get_all('Authorization',[])
        if len(values)!=1 or not values[0].isascii() or not hmac.compare_digest(values[0],'Bearer '+self.server.token):
            self.reply(403,{'detail':'Forbidden'});return
        if not self.server.jobs.acquire(blocking=False):self.reply(503,{'detail':'Busy'});return
        try:
            lengths=self.headers.get_all('Content-Length',[])
            types=self.headers.get_all('Content-Type',[])
            if len(lengths)!=1 or len(types)!=1 or self.headers.get('Transfer-Encoding'):raise ValueError()
            size=int(lengths[0]);mime=types[0]
            if not 0<size<=MAX_FILE or mime not in {'application/pdf','image/png','image/jpeg'}:raise ValueError()
            payload=self.rfile.read(size)
            signature={'application/pdf':b'%PDF-','image/png':b'\x89PNG\r\n\x1a\n','image/jpeg':b'\xff\xd8\xff'}[mime]
            if len(payload)!=size or not payload.startswith(signature):raise ValueError()
            result=validate_result(run_native(payload,mime),mime)
            self.reply(200,result)
        except (ValueError,OcrError):self.reply(422,{'detail':'Cannot process scan'})
        except (TimeoutError,ConnectionError):pass
        except Exception:self.reply(503,{'detail':'OCR unavailable'})
        finally:self.server.jobs.release()


def main():
    token=os.environ.get('OCR_TOKEN','')
    if len(token)<32 or not token.isascii():raise RuntimeError('Configure private OCR credential')
    forbidden={'DATABASE_URL','FILE_ENCRYPTION_KEY','APP_DB_PASSWORD','POSTGRES_PASSWORD','HANDWRITING_TOKEN','BOOTSTRAP_ADMIN_PASSWORD'}
    if forbidden.intersection(os.environ):raise RuntimeError('OCR service must not receive data-store credentials')
    print('Isolated OCR service ready',flush=True)
    Server(('0.0.0.0',8092),token).serve_forever()


if __name__=='__main__':main()
