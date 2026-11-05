"""Native parser execution: copied only into the isolated worker image."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
from .ocr_protocol import OcrError

SLOTS = threading.BoundedSemaphore(1)

def run_native(payload, mime):
    if not SLOTS.acquire(blocking=False):
        raise OcrError('Local OCR is busy. Please retry shortly.')
    try:
        with tempfile.TemporaryDirectory(prefix='dentdocs-ocr-') as directory:
            source = Path(directory) / ('original.pdf' if mime == 'application/pdf' else 'original.image')
            source.write_bytes(payload)
            environment = {key: value for key, value in os.environ.items() if key in {'PATH', 'SYSTEMROOT', 'WINDIR', 'LANG', 'PYTHONPATH'}}
            environment['OMP_THREAD_LIMIT'] = '1'
            process = subprocess.Popen([sys.executable, '-m', 'app.ocr_worker', str(source), mime],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       start_new_session=os.name == 'posix', env=environment)
            try:
                output, _ = process.communicate(timeout=90)
            except subprocess.TimeoutExpired:
                if os.name == 'posix':
                    os.killpg(process.pid, signal.SIGKILL)
                else:
                    process.kill()
                process.communicate()
                raise
            if process.returncode:
                raise OcrError('Cannot process this file. Use a readable, unencrypted PDF (up to 10 pages) or PNG/JPEG.')
            return json.loads(output)
    except FileNotFoundError:
        raise OcrError('Local OCR tools are unavailable. Contact the administrator.')
    except (subprocess.TimeoutExpired, ValueError):
        raise OcrError('Local OCR did not finish. Try a smaller or clearer scan.')
    finally:
        SLOTS.release()
