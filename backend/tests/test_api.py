"""Run with pytest; SQLite is the fast contract suite, PostgreSQL is the deployment gate."""
from pathlib import Path

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.main import create_app


from conftest import sign_in


def documents(client):
    return client.get('/api/bootstrap').json()['documents']


def upload(client, contents=b'%PDF-1.4\nFictional test scan\n%%EOF'):
    result = client.post('/api/files', files={'file': ('../../unsafe.pdf', contents, 'application/pdf')})
    assert result.status_code == 201, result.text
    return result.json()['id']


def create(client):
    fixture = documents(client)[0]
    fixture['title'] = 'Fictional uploaded original'
    result = client.post('/api/documents', json={'document': fixture, 'fileId': upload(client)})
    assert result.status_code == 201, result.text
    return result.json()


def test_fail_closed_without_mock_mode(monkeypatch):
    monkeypatch.delenv('DENTDOCS_MODE', raising=False)
    with pytest.raises(RuntimeError, match='mock'):
        create_app()


def test_seed_is_idempotent_across_restarts(setup):
    with TestClient(create_app(**setup)) as client:
        sign_in(client)
        first = client.get('/api/bootstrap').json()
        assert len(first['patients']) == 12
        assert len(first['documents']) == 30
    with TestClient(create_app(**setup)) as client:
        sign_in(client)
        second = client.get('/api/bootstrap').json()
        assert len(second['documents']) == 30
        assert {a['id'] for a in first['auditLogs']}.issubset({a['id'] for a in second['auditLogs']})


def test_edit_conflict_and_persistence(setup):
    with TestClient(create_app(**setup)) as client:
        sign_in(client)
        doc = documents(client)[0]
        url = f'/api/documents/{doc["id"]}'
        body = {'expectedRevision': doc['revision'], 'updates': {'title': 'Verified fictional title'}}
        result = client.patch(url, json=body)
        assert result.status_code == 200, result.text
        assert result.json()['revision'] == doc['revision'] + 1
        assert client.patch(url, json=body).status_code == 409
    with TestClient(create_app(**setup)) as client:
        sign_in(client)
        assert client.get(url).json()['title'] == 'Verified fictional title'


def test_archive_restore_and_search(client):
    doc = documents(client)[0]
    url = f'/api/documents/{doc["id"]}'
    body = {'expectedRevision': doc['revision']}
    archived = client.post(url + '/archive', json=body, headers={'X-Demo-Role': 'admin'})
    assert archived.status_code == 200, archived.text
    results = client.post('/api/documents/search', json={}).json()
    assert doc['id'] not in {d['id'] for d in results}
    restored = client.post(url + '/restore-archive', json={'expectedRevision': archived.json()['revision']}, headers={'X-Demo-Role': 'admin'})
    assert restored.status_code == 200
    assert restored.json()['archived'] is False


def test_file_encryption_and_retrieval(client, setup):
    doc = create(client)
    payload = client.get(f'/api/documents/{doc["id"]}/file')
    assert payload.status_code == 200
    assert payload.content.startswith(b'%PDF-')
    assert payload.headers['cache-control'] == 'no-store'
    encrypted = (Path(setup['file_root']) / doc['fileId']).read_bytes()
    assert b'%PDF-' not in encrypted
    assert Fernet(setup['encryption_key']).decrypt(encrypted) == payload.content


def test_version_restore_preserves_original_and_metadata(client):
    doc = create(client)
    url = f'/api/documents/{doc["id"]}'
    replacement = upload(client, b'%PDF-1.4\nSecond fictional original\n%%EOF')
    revised = client.post(url + '/versions', json={'expectedRevision': doc['revision'], 'note': 'Replace scan', 'fileId': replacement, 'updates': {'title': 'Revised scan', 'tags': ['revision']}})
    assert revised.status_code == 200, revised.text
    assert revised.json()['version'] == 2
    assert revised.json()['fileId'] == replacement
    assert client.get(url + '/file?version=1').content != client.get(url + '/file').content
    restored = client.post(url + '/versions/1/restore', json={'expectedRevision': revised.json()['revision'], 'note': 'Restore verified original'})
    assert restored.status_code == 200, restored.text
    result = restored.json()
    assert result['version'] == 3
    assert result['title'] == doc['title']
    assert result['fileId'] == doc['fileId']
    assert client.get(url + '/file').content == client.get(url + '/file?version=1').content
    stale = client.post(url + '/versions', json={'expectedRevision': revised.json()['revision'], 'note': 'Stale revision'})
    assert stale.status_code == 409


def test_fixture_history_can_be_restored(client):
    doc = next(d for d in documents(client) if d['versionHistory'])
    target = doc['versionHistory'][0]['versionNumber']
    result = client.post(f'/api/documents/{doc["id"]}/versions/{target}/restore', json={'expectedRevision': doc['revision'], 'note': 'Fictional history test'})
    assert result.status_code == 200, result.text
    assert result.json()['version'] == doc['version'] + 1


def test_upload_and_metadata_validation(client):
    assert client.post('/api/files', files={'file': ('bad.pdf', b'<script>alert(1)</script>', 'application/pdf')}).status_code == 415
    assert client.post('/api/files', files={'file': ('empty.pdf', b'', 'application/pdf')}).status_code == 413
    assert client.post('/api/files', files={'file': ('big.pdf', b'%PDF-' + b'x' * (20 * 1024 * 1024), 'application/pdf')}).status_code == 413
    doc = documents(client)[0]
    url = f'/api/documents/{doc["id"]}'
    assert client.patch(url, json={'expectedRevision': doc['revision'], 'updates': {'patientId': 'other'}}).status_code == 422
    assert client.patch(url, json={'expectedRevision': doc['revision'], 'updates': {'toothNumbers': [19]}}).status_code == 422
    assert client.post(url + '/completeness-resolution', json={'expectedRevision': doc['revision'], 'note': '  '}).status_code == 422


def test_fixture_has_no_invented_original(client):
    doc = documents(client)[0]
    assert client.get(f'/api/documents/{doc["id"]}/file').status_code == 404


def test_search_filters_and_server_audit(client):
    doc = documents(client)[0]
    before = len(client.get('/api/bootstrap').json()['auditLogs'])
    result = client.patch(f'/api/documents/{doc["id"]}', json={'expectedRevision': doc['revision'], 'updates': {'title': 'Unique fictional search title'}})
    assert result.status_code == 200
    results = client.post('/api/documents/search', json={'query': 'Unique fictional search title', 'filters': {'patientId': doc['patientId']}}).json()
    assert [r['id'] for r in results] == [doc['id']]
    assert len(client.get('/api/bootstrap').json()['auditLogs']) == before + 1
