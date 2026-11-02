from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, delete, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import DatabaseError

from app.main import create_app
from app.database import Document, ReviewItem, ReviewEvent, ValidityEvent
from app.workflows import validity_state
from conftest import sign_in, staff
from test_api import documents, upload


def flagged(client, mismatch=False, blurry=False):
    doc = dict(documents(client)[0])
    doc.update(title='Fictional uncertain scan', confidenceScore=50, isNameMismatch=mismatch, isBlurryWarning=blurry, completenessStatus='incomplete', missingFields=['Signature'])
    result = client.post('/api/documents', json={'document': doc, 'fileId': upload(client)})
    assert result.status_code == 201, result.text
    return result.json()


def item_for(client, doc):
    return next(item for item in client.get('/api/reviews').json()['items'] if item['documentId'] == doc['id'] and item['version'] == doc['version'])


def decision(item, doc, **extra):
    return dict(expectedRevision=item['revision'], expectedDocumentRevision=doc['revision'], decision='approve', note='Checked fictional source', **extra)


def validity_body(doc, **extra):
    return dict(expectedRevision=0, expectedDocumentRevision=doc['revision'], basis='explicit', category='general', issuedOn='2026-11-01', expiresOn='2026-11-10', warningDays=3, staffConfirmed=True, note='Expiry read from fictional original', **extra)


def draft_rule(client, doc_type='Billing/Receipt'):
    result = client.post('/api/validity-rules', json={'documentType': doc_type, 'validForDays': 30, 'warningDays': 5, 'reference': 'Fictional test policy — not clinic guidance'})
    assert result.status_code == 201, result.text
    return result.json()


def approve_rule(client, rule):
    result = client.post(f'/api/validity-rules/{rule["id"]}/approve', json={'expectedRevision': rule['revision'], 'note': 'Fictional administrative policy approved for test'})
    assert result.status_code == 200, result.text
    return result.json()


def test_queue_backfill_is_persistent_and_idempotent(client, setup):
    first = client.get('/api/reviews').json()['items']
    assert first and any('low_confidence' in item['reasons'] for item in first)
    with TestClient(create_app(**setup)) as restarted:
        sign_in(restarted)
        assert {item['id'] for item in restarted.get('/api/reviews').json()['items']} == {item['id'] for item in first}


def test_mismatch_and_blur_require_explicit_checks_without_completeness_change(client):
    doc = flagged(client, mismatch=True, blurry=True)
    item = item_for(client, doc)
    url = f'/api/reviews/{item["id"]}/decision'
    assert client.post(url, json=decision(item, doc)).status_code == 422
    assert client.post(url, json=decision(item, doc, patientVerified=True)).status_code == 422
    result = client.post(url, json=decision(item, doc, patientVerified=True, readableConfirmed=True))
    assert result.status_code == 200, result.text
    saved = client.get(f'/api/documents/{doc["id"]}').json()
    assert saved['review']['status'] == 'approved'
    assert saved['completenessStatus'] == 'incomplete' and saved['missingFields'] == ['Signature']
    assert saved['validity']['status'] == 'unknown'


def test_patient_correction_updates_links_and_restore_uses_correct_patient(client):
    doc = flagged(client, mismatch=True)
    patient = next(p for p in client.get('/api/bootstrap').json()['patients'] if p['id'] != doc['patientId'])
    item = item_for(client, doc)
    result = client.post(f'/api/reviews/{item["id"]}/decision', json=decision(item, doc, patientVerified=True, patientId=patient['id']))
    assert result.status_code == 200, result.text
    current = client.get(f'/api/documents/{doc["id"]}').json()
    assert current['patientRecordNo'] == patient['recordNo'] and current['patientName'] == patient['fullName']
    with Session(client.app.state.engine) as db:
        assert db.get(Document, doc['id']).patient_id == patient['id']


def test_assignment_checks_and_stale_decision(client):
    doc = flagged(client)
    item = item_for(client, doc)
    assistant = staff(client, 'assistant')['user']
    assert client.patch(f'/api/reviews/{item["id"]}', json={'expectedRevision': item['revision'], 'assigneeId': assistant['id']}).status_code == 422
    me = client.get('/api/auth/me').json()['user']
    assigned = client.patch(f'/api/reviews/{item["id"]}', json={'expectedRevision': item['revision'], 'assigneeId': me['id']})
    assert assigned.status_code == 200
    assert client.post(f'/api/reviews/{item["id"]}/decision', json=decision(item, doc)).status_code == 409
    current = assigned.json()
    changes = decision(current, doc)
    changes['decision'] = 'request_changes'
    assert client.post(f'/api/reviews/{item["id"]}/decision', json=changes).json()['status'] == 'changes_requested'


def test_source_change_reopens_approval_and_new_version_supersedes_pending(client):
    doc = flagged(client)
    item = item_for(client, doc)
    assert client.post(f'/api/reviews/{item["id"]}/decision', json=decision(item, doc)).status_code == 200
    current = client.get(f'/api/documents/{doc["id"]}').json()
    changed = client.patch(f'/api/documents/{doc["id"]}', json={'expectedRevision': current['revision'], 'updates': {'tags': ['corrected metadata']}}).json()
    assert item_for(client, changed)['status'] == 'pending'
    revised = client.post(f'/api/documents/{doc["id"]}/versions', json={'expectedRevision': changed['revision'], 'note': 'New fictional original', 'updates': {'title': 'New revision'}})
    assert revised.status_code == 200, revised.text
    queue = [i for i in client.get('/api/reviews').json()['items'] if i['documentId'] == doc['id']]
    assert any(i['version'] == 1 and i['status'] == 'superseded' for i in queue)
    assert any(i['version'] == 2 and i['status'] == 'pending' for i in queue)


def test_referral_does_not_set_completeness_or_duplicate_item(client):
    doc = documents(client)[0]
    for _ in range(2):
        result = client.post('/api/reviews/referrals', json={'documentId': doc['id'], 'expectedDocumentRevision': doc['revision'], 'note': 'Please verify source'})
        assert result.status_code == 201
    assert len([i for i in client.get('/api/reviews').json()['items'] if i['documentId'] == doc['id']]) == 1
    saved = client.get(f'/api/documents/{doc["id"]}').json()
    assert saved['completenessStatus'] == doc['completenessStatus'] and saved['revision'] == doc['revision']


def test_review_permissions_and_archived_exclusion(client, setup):
    doc = flagged(client)
    item = item_for(client, doc)
    credentials = staff(client, 'front_desk')
    with TestClient(create_app(**setup)) as front:
        sign_in(front, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        assert doc['id'] not in {i['documentId'] for i in front.get('/api/reviews').json()['items']}
        assert front.get(f'/api/reviews/{item["id"]}').status_code == 403
        assert front.post(f'/api/reviews/{item["id"]}/decision', json=decision(item, doc)).status_code == 403
    assert client.post(f'/api/documents/{doc["id"]}/archive', json={'expectedRevision': doc['revision']}).status_code == 200
    assert doc['id'] not in {i['documentId'] for i in client.get('/api/reviews').json()['items']}


def test_unknown_is_default_and_expiry_boundaries_are_inclusive(client, monkeypatch):
    doc = documents(client)[0]
    url = f'/api/documents/{doc["id"]}/validity'
    assert client.get(url).json()['status'] == 'unknown'
    assert client.get('/api/validity-rules').json() == []
    result = client.put(url, json=validity_body(doc))
    assert result.status_code == 200, result.text
    with Session(client.app.state.engine) as db:
        row = db.get(Document, doc['id'])
        assert validity_state(db, row, date(2026, 11, 6))['status'] == 'valid'
        assert validity_state(db, row, date(2026, 11, 7))['status'] == 'expiring'
        assert validity_state(db, row, date(2026, 11, 10))['status'] == 'expiring'
        assert validity_state(db, row, date(2026, 11, 11))['status'] == 'expired'
        assert validity_state(db, row, date(2026, 10, 31))['status'] == 'unknown'
    saved = client.get(f'/api/documents/{doc["id"]}').json()
    assert not saved.get('archived') and saved['completenessStatus'] == doc['completenessStatus']


def test_validity_requires_staff_note_and_cas(client):
    doc = documents(client)[0]
    url = f'/api/documents/{doc["id"]}/validity'
    body = validity_body(doc)
    assert client.put(url, json={**body, 'staffConfirmed': False}).status_code == 422
    assert client.put(url, json={**body, 'expiresOn': '2026-10-01'}).status_code == 422
    assert client.put(url, json={**body, 'note': '   '}).status_code == 422
    assert client.put(url, json=body).status_code == 200
    assert client.put(url, json=body).status_code == 409


def test_draft_policy_cannot_apply_approved_policy_pins_version_and_retirement_invalidates(client):
    doc = next(d for d in documents(client) if d['type'] == 'Billing/Receipt')
    rule = draft_rule(client)
    body = {**validity_body(doc), 'basis': 'rule', 'ruleId': rule['id'], 'issuedOn': '2026-11-01', 'expiresOn': None}
    url = f'/api/documents/{doc["id"]}/validity'
    assert client.put(url, json=body).status_code == 422
    approved = approve_rule(client, rule)
    result = client.put(url, json=body)
    assert result.status_code == 200, result.text
    assert result.json()['expiresOn'] == '2026-11-30' and result.json()['ruleVersion'] == 1
    next_rule = draft_rule(client)
    assert next_rule['version'] == 2
    assert client.get(url).json()['ruleVersion'] == 1
    retired = client.post(f'/api/validity-rules/{rule["id"]}/retire', json={'expectedRevision': approved['revision'], 'note': 'Fictional policy withdrawn'})
    assert retired.status_code == 200
    assert client.get(url).json()['status'] == 'unknown'
    assert 'staff_referral' in item_for(client, doc)['reasons']


def test_clinical_policy_approval_requires_dentist(client, setup):
    rule = draft_rule(client, 'Laboratory Report')
    body = {'expectedRevision': rule['revision'], 'note': 'Reviewed fictional clinic policy'}
    assert client.post(f'/api/validity-rules/{rule["id"]}/approve', json=body).status_code == 403
    credentials = staff(client, 'dentist')
    with TestClient(create_app(**setup)) as dentist:
        sign_in(dentist, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        assert dentist.post(f'/api/validity-rules/{rule["id"]}/approve', json=body).status_code == 200
        assert dentist.post('/api/validity-rules', json={'documentType': 'X-ray', 'validForDays': 30, 'warningDays': 0, 'reference': 'Not allowed'}).status_code == 403


def test_source_revision_and_new_version_invalidate_validity(client):
    doc = documents(client)[0]
    url = f'/api/documents/{doc["id"]}'
    assert client.put(url + '/validity', json=validity_body(doc)).status_code == 200
    changed = client.patch(url, json={'expectedRevision': doc['revision'], 'updates': {'date': '2026-11-02'}}).json()
    assert client.get(url + '/validity').json()['status'] == 'unknown'
    new = client.post(url + '/versions', json={'expectedRevision': changed['revision'], 'note': 'New source', 'updates': {'title': 'Revision'}})
    assert new.status_code == 200
    assert client.get(url + '/validity').json()['revision'] == 0


def test_consent_requires_same_patient_appointment_scope(client):
    docs = documents(client)
    consent = next(d for d in docs if d['type'] == 'Consent Form')
    matching = [d for d in docs if d['type'] == 'Appointment Record' and d['patientId'] == consent['patientId']]
    if not matching:
        appointment = {**consent, 'type': 'Appointment Record', 'title': 'Fictional appointment scope test'}
        created = client.post('/api/documents', json={'document': appointment, 'fileId': upload(client)})
        assert created.status_code == 201, created.text
        matching = [created.json()]
    body = validity_body(consent)
    url = f'/api/documents/{consent["id"]}/validity'
    assert client.put(url, json=body).status_code == 422
    wrong = next(d for d in docs if d['type'] == 'Appointment Record' and d['patientId'] != consent['patientId'])
    assert client.put(url, json={**body, 'appointmentId': wrong['id']}).status_code == 422
    assert client.put(url, json={**body, 'appointmentId': matching[0]['id']}).status_code == 200
    assert client.patch(f'/api/documents/{matching[0]["id"]}', json={'expectedRevision': matching[0]['revision'], 'updates': {'tags': ['changed appointment']}}).status_code == 200
    assert client.get(url).json()['status'] == 'unknown'


def test_workflow_histories_are_append_only_and_not_applicable_requires_note(client):
    doc = flagged(client)
    url = f'/api/documents/{doc["id"]}/validity'
    body = {**validity_body(doc), 'basis': 'not_applicable', 'issuedOn': None, 'expiresOn': None, 'note': 'No expiry applies under the fictional record policy'}
    assert client.put(url, json=body).json()['status'] == 'not_applicable'
    with Session(client.app.state.engine) as db:
        for model in (ReviewEvent, ValidityEvent):
            with pytest.raises(DatabaseError):
                db.execute(delete(model))
            db.rollback()
