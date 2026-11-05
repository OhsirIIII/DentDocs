import http.client
import threading
import unittest
from unittest.mock import patch
import server

GOOD={'text':'No appointment scheduled.','confidence':90,'pages':1,'pageResults':[{'page':1,'confidence':90,'characters':25}]}
TOKEN='fictional-service-test-'+'x'*40

class ServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=server.Server(('127.0.0.1',0),TOKEN)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def request(self,body=b'%PDF-fictional',**changes):
        headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/pdf',**changes}
        connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
        try:
            connection.request('POST','/extract',body,headers)
            response=connection.getresponse();return response.status,response.read()
        finally:connection.close()
    def test_unauthorized_never_parses(self):
        with patch.object(server,'run_native') as native:
            for token in ['', 'Bearer incorrect']:
                self.assertEqual(self.request(Authorization=token)[0],403)
            native.assert_not_called()
    def test_invalid_signature_length_type_and_transfer_rejected(self):
        with patch.object(server,'run_native') as native:
            for body,headers in [(b'not pdf',{}),(b'%PDF-fake',{'Content-Type':'text/html'}),(b'',{'Content-Length':str(20*1024**2+1)}),(b'%PDF-fake',{'Transfer-Encoding':'chunked'})]:
                self.assertEqual(self.request(body,**headers)[0],422)
            native.assert_not_called()
    def test_busy_then_success_and_result_shape(self):
        self.server.jobs.acquire()
        try:self.assertEqual(self.request()[0],503)
        finally:self.server.jobs.release()
        with patch.object(server,'run_native',return_value=GOOD) as native:
            status,body=self.request();self.assertEqual(status,200)
            self.assertNotIn(TOKEN.encode(),body);native.assert_called_once_with(b'%PDF-fictional','application/pdf')
    def test_failure_releases_slot_and_hides_internal_details(self):
        with patch.object(server,'run_native',side_effect=RuntimeError('sensitive internal detail')):
            status,body=self.request();self.assertEqual(status,503);self.assertNotIn(b'sensitive',body)
        with patch.object(server,'run_native',return_value=GOOD):self.assertEqual(self.request()[0],200)

if __name__=='__main__':unittest.main()
