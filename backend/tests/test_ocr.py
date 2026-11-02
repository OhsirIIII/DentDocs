"""Fictional local OCR contracts, including real rasterization/recognition in Docker."""
import shutil
import subprocess

import pytest
from fastapi.testclient import TestClient

from app.ocr import extract_fields, parse_tsv, run_local, OcrError, SLOTS
from app.main import create_app
from conftest import staff, sign_in


PATIENT = {'id': 'fictional', 'recordNo': 'PT-2026-0001', 'fullName': 'Alex Test'}


def fictional_pdf(lines, pages=1):
    """Small valid PDF containing only fictional, large printed text."""
    stream = ('BT /F1 18 Tf 50 750 Td 28 TL ' + ' '.join(f'({line}) Tj T*' for line in lines) + ' ET').encode()
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
               f'<< /Type /Pages /Kids [{" ".join(f"{5+i} 0 R" for i in range(pages))}] /Count {pages} >>'.encode(),
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
               f'<< /Length {len(stream)} >>\nstream\n'.encode() + stream + b'\nendstream']
    objects += [b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>'] * pages
    output, offsets = b'%PDF-1.4\n', [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output += f'{index} 0 obj\n'.encode() + obj + b'\nendobj\n'
    start = len(output)
    output += f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()
    output += b''.join(f'{offset:010} 00000 n \n'.encode() for offset in offsets[1:])
    return output + f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF'.encode()


def test_extraction_never_invents_patient_content_or_completeness():
    value = extract_fields({'text': '', 'confidence': 0, 'pages': 1}, PATIENT)
    assert value['extractedText'] == value['date'] == ''
    assert value['toothNumbers'] == [] and value['confidenceScore'] == 0
    assert value['extraction']['status'] == 'no_text'
    assert value['completenessStatus'] == 'needs_review'
    assert not value['isBlurryWarning']  # Unreadability is not a validated blur detector.


def test_fields_mismatch_ambiguous_dates_and_conflicting_types():
    value = extract_fields({'text': 'Prescription\nPatient: Someone Else\nPT-2026-0002\nDate: 2026-11-02\nTooth 47', 'confidence': 96, 'pages': 1}, PATIENT)
    assert value['isNameMismatch'] and value['fieldConfidence']['recordNo'] == 0
    assert value['type'] == 'Prescription' and value['toothNumbers'] == [47]
    assert value['date'] == '2026-11-02'
    ambiguous = extract_fields({'text': 'Prescription Official Receipt 2026-11-01 2026-11-02', 'confidence': 99, 'pages': 1}, PATIENT)
    assert ambiguous['fieldConfidence']['documentType'] == 0 and ambiguous['date'] == ''
    assert ambiguous['procedureCategory'] == 'Restorative' and ambiguous['fieldConfidence']['procedureCategory'] == 0


def test_word_confidence_ignores_layout_rows():
    header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tconf\ttext\n'
    text, score = parse_tsv(header + '4\t1\t1\t1\t1\t0\t-1\t\n5\t1\t1\t1\t1\t1\t80\tTest\n')
    assert text == 'Test' and score == 80


def test_busy_worker_does_not_start_more_processes():
    SLOTS.acquire(); SLOTS.acquire()
    try:
        with pytest.raises(OcrError, match='busy'):
            run_local(b'bad', 'application/pdf')
    finally:
        SLOTS.release(); SLOTS.release()


def test_api_provenance_review_and_original_bytes(client, monkeypatch):
    bootstrap = client.get('/api/bootstrap').json()
    patient = bootstrap['patients'][0]
    original = fictional_pdf(['Prescription', f'Patient: {patient["fullName"]}', patient['recordNo'], 'Date: 2026-11-02'])
    file_id = client.post('/api/files', files={'file': ('receipt_mismatch.pdf', original)}).json()['id']
    calls = []
    def recognize(*args):
        calls.append(args)
        return {'text': f'Prescription\nPatient: Wrong Person\nDate: 2026-11-02', 'confidence': 78, 'pages': 1}
    monkeypatch.setattr('app.main.run_local', recognize)
    path = f'/api/files/{file_id}/extract'
    response = client.post(path, json={'patientId': patient['id']})
    assert response.status_code == 200, response.text
    result = response.json()
    assert client.post(path, json={'patientId': patient['id']}).json() == result and len(calls) == 1
    assert client.post(path, json={'patientId': bootstrap['patients'][1]['id']}).status_code == 409
    tampered = {**result, 'confidenceScore': 100, 'fieldConfidence': {'date': 100}, 'isNameMismatch': False, 'completenessStatus': 'complete'}
    saved = client.post('/api/documents', json={'document': tampered, 'fileId': file_id})
    assert saved.status_code == 201, saved.text
    doc = client.get('/api/documents/' + saved.json()['id']).json()
    assert doc['confidenceScore'] == 78 and doc['isNameMismatch']
    assert doc['extraction']['engine'] == 'tesseract-eng'
    assert doc['review']['status'] == 'pending' and doc['completenessStatus'] == 'needs_review'
    assert client.get('/api/documents/' + doc['id'] + '/file').content == original
    assert client.post(path, json={'patientId': patient['id']}).status_code == 403


def test_ocr_ownership_front_desk_and_csrf(client, setup, monkeypatch):
    patient = client.get('/api/bootstrap').json()['patients'][0]
    file_id = client.post('/api/files', files={'file': ('test.pdf', fictional_pdf(['Prescription']))}).json()['id']
    path = f'/api/files/{file_id}/extract'
    assert client.post(path, json={'patientId': patient['id']}, headers={'X-CSRF-Token': ''}).status_code == 403
    for role in ['assistant', 'front_desk']:
        account = staff(client, role)
        with TestClient(create_app(**setup)) as other:
            sign_in(other, account['user']['email'], temporary=account['temporaryPassword'])
            assert other.post(path, json={'patientId': patient['id']}).status_code == 403
            own = other.post('/api/files', files={'file': ('test.pdf', fictional_pdf(['Prescription']))}).json()['id']
            if role == 'front_desk':
                assert other.post(f'/api/files/{own}/extract', json={'patientId': patient['id']}).status_code == 403


def test_failed_ocr_can_retry_and_is_audited(client, monkeypatch):
    patient = client.get('/api/bootstrap').json()['patients'][0]
    file_id = client.post('/api/files', files={'file': ('bad.pdf', b'%PDF-invalid')}).json()['id']
    def fail(*args):
        raise OcrError('Unreadable scan')
    monkeypatch.setattr('app.main.run_local', fail)
    path = f'/api/files/{file_id}/extract'
    assert client.post(path, json={'patientId': patient['id']}).status_code == 422
    monkeypatch.setattr('app.main.run_local', lambda *args: {'text': '', 'confidence': 0, 'pages': 1})
    assert client.post(path, json={'patientId': patient['id']}).json()['extraction']['status'] == 'no_text'
    assert any(log['action'] == 'OCR_FAILED' for log in client.get('/api/bootstrap').json()['auditLogs'])


def test_replacement_original_clears_previous_extraction(client, monkeypatch):
    template = client.get('/api/bootstrap').json()['documents'][0]
    monkeypatch.setattr('app.main.run_local', lambda *args: {'text': 'Prescription\nDate: 2026-11-02', 'confidence': 95, 'pages': 1})
    first = client.post('/api/files', files={'file': ('first.pdf', fictional_pdf(['Prescription']))}).json()['id']
    client.post(f'/api/files/{first}/extract', json={'patientId': template['patientId']})
    doc = client.post('/api/documents', json={'fileId': first, 'document': template}).json()
    assert doc['extraction']['engine'] == 'tesseract-eng'
    replacement = client.post('/api/files', files={'file': ('second.pdf', fictional_pdf(['Official Receipt']))}).json()['id']
    revised = client.post(f'/api/documents/{doc["id"]}/versions', json={'expectedRevision': doc['revision'], 'fileId': replacement, 'updates': {}, 'note': 'Fictional replacement'}).json()
    assert 'extraction' not in revised and revised['extractedText'] == ''
    assert revised['confidenceScore'] == 0 and revised['completenessStatus'] == 'needs_review'
    restored = client.post(f'/api/documents/{doc["id"]}/versions/1/restore', json={'expectedRevision': revised['revision'], 'note': 'Restore original'}).json()
    assert restored['extraction']['engine'] == 'tesseract-eng' and restored['fileId'] == first


def test_extraction_source_is_append_only(client, monkeypatch):
    from sqlalchemy.orm import Session
    from sqlalchemy import update, delete
    from sqlalchemy.exc import DatabaseError
    from app.database import Extraction
    patient = client.get('/api/bootstrap').json()['patients'][0]
    file_id = client.post('/api/files', files={'file': ('test.pdf', fictional_pdf(['Prescription']))}).json()['id']
    monkeypatch.setattr('app.main.run_local', lambda *args: {'text': '', 'confidence': 0, 'pages': 1})
    assert client.post(f'/api/files/{file_id}/extract', json={'patientId': patient['id']}).status_code == 200
    for statement in [update(Extraction).values(result={}), delete(Extraction)]:
        with Session(client.app.state.engine) as db, pytest.raises(DatabaseError):
            db.execute(statement)


@pytest.mark.skipif(not shutil.which('tesseract') or not shutil.which('pdftoppm'), reason='Real OCR acceptance runs in the Docker image with packaged tools')
def test_real_pdf_png_and_rejection(tmp_path):
    lines = ['Prescription', 'Patient: Alex Test', 'PT-2026-0001', 'Date: 2026-11-02', 'Tooth 47', 'FICTIONAL OCR TEST ONLY']
    pdf = fictional_pdf(lines, pages=2)
    raw = run_local(pdf, 'application/pdf')
    fields = extract_fields(raw, PATIENT)
    assert raw['pages'] == 2 and raw['confidence'] >= 85, raw
    assert fields['type'] == 'Prescription' and fields['date'] == '2026-11-02'
    assert fields['toothNumbers'] == [47] and not fields['isNameMismatch']
    source = tmp_path / 'test.pdf'; source.write_bytes(pdf)
    subprocess.run(['pdftoppm', '-f', '1', '-singlefile', '-png', '-scale-to', '1800', str(source), str(tmp_path / 'scan')], check=True, capture_output=True)
    image_raw = run_local((tmp_path / 'scan.png').read_bytes(), 'image/png')
    assert 'Prescription' in image_raw['text'] and 'Alex Test' in image_raw['text']
    subprocess.run(['pdftoppm', '-f', '1', '-singlefile', '-jpeg', '-scale-to', '1800', str(source), str(tmp_path / 'scan')], check=True, capture_output=True)
    jpeg_raw = run_local((tmp_path / 'scan.jpg').read_bytes(), 'image/jpeg')
    assert 'Prescription' in jpeg_raw['text'] and 'Alex Test' in jpeg_raw['text']
    assert extract_fields(run_local(fictional_pdf([' ']), 'application/pdf'), PATIENT)['extraction']['status'] == 'no_text'
    for payload, mime in [(b'%PDF-broken', 'application/pdf'), (fictional_pdf(lines, pages=11), 'application/pdf'), (b'\x89PNG\r\n\x1a\nbroken', 'image/png')]:
        with pytest.raises(OcrError):
            run_local(payload, mime)


@pytest.mark.skipif(not shutil.which('tesseract') or not shutil.which('pdftoppm'), reason='Packaged OCR tools required')
@pytest.mark.parametrize('heading,kind', [
    ('Informed Consent', 'Consent Form'), ('Prescription', 'Prescription'),
    ('Official Receipt', 'Billing/Receipt'), ('Appointment Confirmation', 'Appointment Record'),
    ('Treatment Plan', 'Treatment Plan'), ('Laboratory Report', 'Laboratory Report'),
    ('Panoramic Radiograph', 'X-ray'), ('Patient Record', 'Patient Record'),
])
def test_real_fictional_document_types(heading, kind):
    import time
    start = time.monotonic()
    raw = run_local(fictional_pdf([heading, 'Patient: Alex Test', 'PT-2026-0001', 'Date: 2026-11-02', 'Tooth 47', 'FICTIONAL TEST ONLY']), 'application/pdf')
    result = extract_fields(raw, PATIENT)
    assert result['type'] == kind and result['fieldConfidence']['documentType'] >= 85, raw
    assert result['date'] == '2026-11-02' and result['toothNumbers'] == [47]
    assert result['fieldConfidence']['recordNo'] >= 85 and not result['isNameMismatch']
    print(f'{kind}: confidence={raw["confidence"]}, seconds={time.monotonic()-start:.2f}')
