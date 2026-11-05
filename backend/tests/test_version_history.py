"""Version history must remain flat and independently scoped by source type."""
import copy
import json

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Document, Version
from app.main import create_app
from conftest import sign_in, staff
from test_api import create


def revise(client, document, **updates):
    response = client.post(f'/api/documents/{document["id"]}/versions', json={
        'expectedRevision': document['revision'], 'note': 'Fictional revision',
        'updates': updates,
    })
    assert response.status_code == 200, response.text
    return response.json()


def test_repeated_versions_and_restore_keep_flat_history(client):
    document = create(client)
    for number in range(2, 8):
        document = revise(client, document, title=f'Fictional revision {number}')
        assert len(document['versionHistory']) == number - 1
        assert all('versionHistory' not in entry for entry in document['versionHistory'])
    response = client.post(f'/api/documents/{document["id"]}/versions/2/restore', json={
        'expectedRevision': document['revision'], 'note': 'Restore fictional version',
    })
    assert response.status_code == 200, response.text
    restored = response.json()
    assert restored['version'] == 8 and restored['title'] == 'Fictional revision 2'
    assert len(restored['versionHistory']) == 7
    assert all('versionHistory' not in entry for entry in restored['versionHistory'])
    with Session(client.app.state.engine) as db:
        snapshots = db.scalars(select(Version).where(Version.document_id == document['id']))
        assert all('versionHistory' not in version.snapshot for version in snapshots)


def test_front_desk_cannot_read_nested_clinical_history(client, setup):
    document = revise(client, create(client), type='Patient Record', extractedText='FICTIONAL CLINICAL SECRET')
    document = revise(client, document, type='Billing/Receipt', extractedText='Fictional receipt amount 100')
    document = revise(client, document, title='Fictional administrative revision')
    # Preserve the legacy shape explicitly so reads are safe without a data migration.
    with Session(client.app.state.engine) as db:
        row = db.get(Document, document['id'])
        data = copy.deepcopy(row.data)
        billing = next(entry for entry in data['versionHistory'] if entry['type'] == 'Billing/Receipt')
        billing['versionHistory'] = [{'type': 'Patient Record', 'extractedText': 'FICTIONAL CLINICAL SECRET'}]
        row.data = data
        db.commit()
    credentials = staff(client, 'front_desk')
    with TestClient(create_app(**setup)) as front:
        sign_in(front, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        for method, path, body in [
            ('GET', '/api/bootstrap', None),
            ('GET', f'/api/documents/{document["id"]}', None),
            ('POST', '/api/documents/search', {'query': 'Fictional administrative revision'}),
            ('POST', '/api/search', {'query': 'Fictional administrative revision', 'mode': 'keyword'}),
        ]:
            response = front.request(method, path, json=body)
            assert response.status_code == 200, response.text
            assert 'FICTIONAL CLINICAL SECRET' not in json.dumps(response.json()), path
        assert front.get(f'/api/documents/{document["id"]}/file?version=2').status_code == 403


def test_front_desk_cannot_read_historical_clinical_review_notes(client, setup):
    from test_workflows import flagged, item_for, decision

    document = flagged(client)
    item = item_for(client, document)
    body = {**decision(item, document), 'note': 'FICTIONAL CLINICAL REVIEW SECRET'}
    response = client.post(f'/api/reviews/{item["id"]}/decision', json=body)
    assert response.status_code == 200, response.text
    document = client.get(f'/api/documents/{document["id"]}').json()
    document = revise(client, document, type='Billing/Receipt', extractedText='Fictional receipt')
    allowed = item_for(client, document)
    credentials = staff(client, 'front_desk')
    with TestClient(create_app(**setup)) as front:
        sign_in(front, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        queue = front.get('/api/reviews')
        assert queue.status_code == 200
        assert item['id'] not in {entry['id'] for entry in queue.json()['items']}
        assert 'FICTIONAL CLINICAL REVIEW SECRET' not in queue.text
        assert front.get(f'/api/reviews/{item["id"]}').status_code == 403
        assert front.get(f'/api/reviews/{allowed["id"]}').status_code == 200
    # Historical clinical review remains available to authorized clinical staff.
    assert client.get(f'/api/reviews/{item["id"]}').json()['decisionNote'] == body['note']


def test_legacy_nested_history_is_flattened_on_edit_and_restore(client):
    document = revise(client, create(client), title='Fictional saved version')
    with Session(client.app.state.engine) as db:
        row = db.get(Document, document['id'])
        legacy = copy.deepcopy(row.data)
        legacy['versionHistory'][0]['versionHistory'] = [{'type': 'Patient Record', 'title': 'Nested duplicate'}]
        row.data = legacy
        original = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == 1))
        original.snapshot = {**original.snapshot, 'versionHistory': legacy['versionHistory']}
        db.commit()
    url = f'/api/documents/{document["id"]}'
    edited = client.patch(url, json={'expectedRevision': document['revision'], 'updates': {'tags': ['reviewed']}})
    assert edited.status_code == 200, edited.text
    with Session(client.app.state.engine) as db:
        assert all('versionHistory' not in entry for entry in db.get(Document, document['id']).data['versionHistory'])
    restored = client.post(url + '/versions/1/restore', json={
        'expectedRevision': edited.json()['revision'], 'note': 'Restore legacy fictional source',
    })
    assert restored.status_code == 200, restored.text
    assert restored.json()['version'] == 3
    assert all('versionHistory' not in entry for entry in restored.json()['versionHistory'])
