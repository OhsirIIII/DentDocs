import hashlib
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete
from sqlalchemy.exc import DatabaseError

from app.database import HandwritingDraft
from app.main import create_app
from conftest import staff, sign_in

IMAGE = b'\x89PNG\r\n\x1a\nFictional signature-only API fixture'


def stage(client):
    patient = client.get('/api/bootstrap').json()['patients'][0]
    file_id = client.post('/api/files', files={'file': ('test.png', IMAGE)}).json()['id']
    return patient, file_id


def reader(payload, rotation, box):
    return {'text': 'Resto #23', 'sourceSha256': hashlib.sha256(payload).hexdigest(),
            'engine': 'trocr-base-amr-experimental', 'modelSha256': 'a' * 64,
            'confidence': 99, 'status': 'approved'}  # API must keep this a draft, unscored.


def test_handwriting_draft_save_forces_review_and_preserves_sources(client, monkeypatch):
    monkeypatch.setattr('app.main.read_region', reader)
    patient, file_id = stage(client)
    path = f'/api/files/{file_id}/handwriting'
    body = {'patientId': patient['id'], 'rotation': 90, 'box': [.1, .2, .8, .3]}
    generated = client.post(path, json=body)
    assert generated.status_code == 200, generated.text
    draft = generated.json()
    assert draft['confidence'] is None and draft['status'] == 'draft' and draft['requiresStaffVerification']
    assert draft['rotation'] == 90 and draft['suggestedBy']
    template = client.get('/api/bootstrap').json()['documents'][0]
    template.update(patientId=patient['id'], extractedText='Staff corrected: Resto #23', confidenceScore=100,
                    completenessStatus='complete', handwritingSources=[{'text': 'forged'}])
    saved = client.post('/api/documents', json={'document': template, 'fileId': file_id})
    assert saved.status_code == 201, saved.text
    doc = client.get('/api/documents/' + saved.json()['id']).json()
    assert doc['extractedText'] == 'Staff corrected: Resto #23'
    assert doc['confidenceScore'] == 0 and doc['completenessStatus'] == 'needs_review'
    assert doc['review']['status'] == 'pending' and doc['validity']['status'] == 'unknown'
    assert doc['handwritingSources'] == [draft]
    assert client.get(f'/api/documents/{doc["id"]}/file').content == IMAGE
    assert client.post(path, json=body).status_code == 403
    for statement in [update(HandwritingDraft).values(data={}), delete(HandwritingDraft)]:
        with Session(client.app.state.engine) as db, pytest.raises(DatabaseError):
            db.execute(statement)


def test_invalid_regions_patient_and_pdf_rejected(client, monkeypatch):
    monkeypatch.setattr('app.main.read_region', reader)
    patient, file_id = stage(client)
    path = f'/api/files/{file_id}/handwriting'
    for box in [[.8, .1, .2, .3], [-1, 0, .5, .5], [0, 0, 1.1, 1], [0, 0, 0, 0], [0, 1]]:
        assert client.post(path, json={'patientId': patient['id'], 'box': box}).status_code == 422
    assert client.post(path, json={'patientId': patient['id'], 'rotation': 45, 'box': [0, 0, 1, 1]}).status_code == 422
    assert client.post(path, json={'patientId': 'missing', 'box': [0, 0, 1, 1]}).status_code == 422
    pdf = client.post('/api/files', files={'file': ('test.pdf', b'%PDF-invalid')}).json()['id']
    assert client.post(f'/api/files/{pdf}/handwriting', json={'patientId': patient['id'], 'box': [0, 0, 1, 1]}).status_code == 422


def test_handwriting_csrf_ownership_and_front_desk(client, setup, monkeypatch):
    monkeypatch.setattr('app.main.read_region', reader)
    patient, file_id = stage(client)
    body = {'patientId': patient['id'], 'box': [0, 0, .9, .2]}
    path = f'/api/files/{file_id}/handwriting'
    assert client.post(path, json=body, headers={'X-CSRF-Token': ''}).status_code == 403
    for role in ['assistant', 'front_desk']:
        account = staff(client, role)
        with TestClient(create_app(**setup)) as other:
            sign_in(other, account['user']['email'], temporary=account['temporaryPassword'])
            assert other.post(path, json=body).status_code == 403
            _, own = stage(other)
            response = other.post(f'/api/files/{own}/handwriting', json=body)
            assert response.status_code == (403 if role == 'front_desk' else 200)


def test_handwriting_failure_does_not_create_source_and_is_retryable(client, monkeypatch):
    patient, file_id = stage(client)
    body = {'patientId': patient['id'], 'box': [0, 0, .9, .2]}
    path = f'/api/files/{file_id}/handwriting'
    def fail(*args):
        raise HTTPException(503, 'Reader offline')
    monkeypatch.setattr('app.main.read_region', fail)
    assert client.post(path, json=body).status_code == 503
    with Session(client.app.state.engine) as db:
        assert not list(db.scalars(select(HandwritingDraft)))
    monkeypatch.setattr('app.main.read_region', reader)
    assert client.post(path, json=body).status_code == 200
    patients = client.get('/api/bootstrap').json()['patients']
    assert client.post(path, json={**body, 'patientId': patients[1]['id']}).status_code == 409
    assert any(log['action'] == 'HANDWRITING_FAILED' for log in client.get('/api/bootstrap').json()['auditLogs'])


def test_handwriting_original_integrity_and_reader_integrity(client, setup, monkeypatch):
    from pathlib import Path
    patient, file_id = stage(client)
    path = f'/api/files/{file_id}/handwriting'
    body = {'patientId': patient['id'], 'box': [0, 0, .9, .2]}
    monkeypatch.setattr('app.main.read_region', lambda *args: {**reader(*args), 'sourceSha256': 'wrong'})
    assert client.post(path, json=body).status_code == 503
    (Path(setup['file_root']) / file_id).write_bytes(b'broken encrypted original')
    assert client.post(path, json=body).status_code == 503


def test_replacing_handwriting_original_clears_source_and_restore_recovers_it(client, monkeypatch):
    monkeypatch.setattr('app.main.read_region', reader)
    patient, file_id = stage(client)
    client.post(f'/api/files/{file_id}/handwriting', json={'patientId': patient['id'], 'box': [0, 0, 1, 1]})
    template = client.get('/api/bootstrap').json()['documents'][0]
    template['patientId'] = patient['id']
    doc = client.post('/api/documents', json={'document': template, 'fileId': file_id}).json()
    _, replacement = stage(client)
    revised = client.post(f'/api/documents/{doc["id"]}/versions', json={'expectedRevision': doc['revision'], 'fileId': replacement, 'note': 'Fictional replacement', 'updates': {}}).json()
    assert 'handwritingSources' not in revised and revised['extractedText'] == ''
    restored = client.post(f'/api/documents/{doc["id"]}/versions/1/restore', json={'expectedRevision': revised['revision'], 'note': 'Restore original'}).json()
    assert restored['handwritingSources'] == doc['handwritingSources']


def test_handwriting_suggestion_count_is_bounded(client, monkeypatch):
    monkeypatch.setattr('app.main.read_region', reader)
    patient, file_id = stage(client)
    for _ in range(20):
        assert client.post(f'/api/files/{file_id}/handwriting', json={'patientId': patient['id'], 'box': [0, 0, 1, 1]}).status_code == 200
    assert client.post(f'/api/files/{file_id}/handwriting', json={'patientId': patient['id'], 'box': [0, 0, 1, 1]}).status_code == 422
