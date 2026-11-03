"""Actual PDF/image tests run only in the isolated native image."""
import subprocess
import base64
import tempfile
from pathlib import Path
import unittest
from app.ocr_native import run_native,SLOTS
from app.ocr_protocol import OcrError


def pdf(lines,pages=1):
    stream=('BT /F1 18 Tf 50 750 Td 28 TL '+' '.join(f'({line}) Tj T*' for line in lines)+' ET').encode()
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',f'<< /Type /Pages /Kids [{" ".join(f"{5+i} 0 R" for i in range(pages))}] /Count {pages} >>'.encode(),b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',f'<< /Length {len(stream)} >>\nstream\n'.encode()+stream+b'\nendstream']
    objects += [b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>']*pages
    output=b'%PDF-1.4\n';offsets=[0]
    for index,item in enumerate(objects,1):offsets.append(len(output));output+=f'{index} 0 obj\n'.encode()+item+b'\nendobj\n'
    start=len(output);output+=f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()+b''.join(f'{value:010} 00000 n \n'.encode() for value in offsets[1:])
    return output+f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF'.encode()


class NativeTests(unittest.TestCase):
    def test_real_pdf_png_jpeg_and_temporary_cleanup(self):
        before=set(Path('/tmp').glob('dentdocs-ocr-*'))
        payload=pdf(['Prescription','Patient: Alex Test','Tooth 47','FICTIONAL OCR ONLY'],pages=2)
        raw=run_native(payload,'application/pdf');self.assertEqual(raw['pages'],2);self.assertIn('Prescription',raw['text'])
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'source.pdf';source.write_bytes(payload)
            for extension,flag,mime in [('png','-png','image/png'),('jpg','-jpeg','image/jpeg')]:
                output=Path(directory)/'scan'
                subprocess.run(['pdftoppm','-f','1','-singlefile',flag,'-scale-to','1800',str(source),str(output)],check=True,capture_output=True)
                self.assertIn('Prescription',run_native(output.with_suffix('.'+extension).read_bytes(),mime)['text'])
        self.assertEqual(set(Path('/tmp').glob('dentdocs-ocr-*')),before)
    def test_rejection_and_page_limit_cleanup(self):
        before=set(Path('/tmp').glob('dentdocs-ocr-*'))
        for payload,mime in [(base64.b64decode('JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPGVjYzM5NjZiNWM+Cj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbIDQgMCBSIF0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9SZXNvdXJjZXMgPDwKPj4KL01lZGlhQm94IFsgMC4wIDAuMCA2MTIgNzkyIF0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovViAyCi9SIDMKL0xlbmd0aCAxMjgKL1AgNDI5NDk2NzI5MgovRmlsdGVyIC9TdGFuZGFyZAovTyA8Zjk0OGFmNzdmYTlkYzIyMzYwYjJkMjRmMTM5YjliODUyZTUxOTgzODlhYzE3MzM0MDM2ZGQ5YzM0MDBjYTg4Mz4KL1UgPDc5MGM4YzkyNzk1YjVmZjJiN2I5YzczMjNjNTM1MDVjMjhiZjRlNWU0ZTc1OGE0MTY0MDA0ZTU2ZmZmYTAxMDg+Cj4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA1OSAwMDAwMCBuIAowMDAwMDAwMTE4IDAwMDAwIG4gCjAwMDAwMDAxNjcgMDAwMDAgbiAKMDAwMDAwMDI2MSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMyAwIFIKL0luZm8gMSAwIFIKL0lEIFsgPDM1NjEzMTMyNjIzNzY0MzczODM1NjEzNjY0MzUzNTM3MzUzNjM5NjI2MjM3MzA2NDMyMzQzMjMyNjEzNzMwMzk+IDwzNTYxMzEzMjYyMzc2NDM3MzgzNTYxMzY2NDM1MzUzNzM1MzYzOTYyNjIzNzMwNjQzMjM0MzIzMjYxMzczMDM5PiBdCi9FbmNyeXB0IDUgMCBSCj4+CnN0YXJ0eHJlZgo0NzYKJSVFT0YK'),'application/pdf'),(b'%PDF-broken','application/pdf'),(pdf(['Fictional'],11),'application/pdf'),(b'\x89PNG\r\n\x1a\nbad','image/png')]:
            with self.assertRaises(OcrError):run_native(payload,mime)
        self.assertEqual(set(Path('/tmp').glob('dentdocs-ocr-*')),before)
    def test_native_slot_is_bounded(self):
        SLOTS.acquire()
        try:
            with self.assertRaisesRegex(OcrError,'busy'):run_native(b'%PDF-fictional','application/pdf')
        finally:SLOTS.release()

if __name__=='__main__':unittest.main()
