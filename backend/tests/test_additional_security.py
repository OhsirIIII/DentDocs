from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.main import create_app
from app.database import Audit
from conftest import sign_in, staff


def test_staged_file_cannot_be_taken_by_another_account(client, setup):
    from test_api import upload, documents
    file_id = upload(client)
    template = documents(client)[0]
    credentials = staff(client, 'dentist')
    with TestClient(create_app(**setup)) as dentist:
        sign_in(dentist, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        result = dentist.post('/api/documents', json={'document': template, 'fileId': file_id})
        assert result.status_code == 403
    assert client.post('/api/documents', json={'document': template, 'fileId': file_id}).status_code == 201
    assert client.post('/api/documents', json={'document': template, 'fileId': file_id}).status_code == 403


def test_historical_clinical_file_not_exposed_after_reclassification(client, setup):
    from test_api import create
    doc = create(client)
    assert client.patch(f'/api/documents/{doc["id"]}', json={'expectedRevision': doc['revision'], 'updates': {'type': 'Billing/Receipt'}}).status_code == 200
    # A synthetic legacy history entry is deliberately clinical.
    from app.database import Document, Version
    with Session(client.app.state.engine) as db:
        row = db.get(Document, doc['id'])
        data = dict(row.data)
        data['versionHistory'] = [{'type': 'Prescription', 'extractedText': 'Clinical secret', 'versionNumber': 0}]
        row.data = data
        original = db.scalar(select(Version).where(Version.document_id == doc['id']))
        original.snapshot = {**original.snapshot, 'type': 'Patient Record'}
        db.commit()
    credentials = staff(client, 'front_desk')
    with TestClient(create_app(**setup)) as front:
        sign_in(front, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        visible = front.get(f'/api/documents/{doc["id"]}')
        assert visible.status_code == 200 and visible.json()['versionHistory'] == []
        assert front.get(f'/api/documents/{doc["id"]}/file').status_code == 403


def test_new_notice_requires_fresh_acknowledgement(client, monkeypatch):
    import app.security as security
    monkeypatch.setattr(security, 'NOTICE_VERSION', 'next-approved-notice')
    identity = client.get('/api/auth/me').json()
    assert identity['privacyAcknowledged'] is False
    assert client.get('/api/bootstrap').status_code == 403
    assert client.post('/api/privacy-acknowledgements', json={'noticeVersion': 'next-approved-notice'}).status_code == 200
    assert client.get('/api/bootstrap').status_code == 200
