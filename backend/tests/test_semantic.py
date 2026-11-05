import copy
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import create_app
from app.database import SearchChunk, Document
from app.semantic import chunks, source_hash, SLOT
from conftest import staff, sign_in


def embeddings(texts):
    vectors = []
    for text in texts:
        relevant = any(word in text.lower() for word in ['endodontic', 'root canal'])
        vector = [0.] * 384; vector[0 if relevant else 1] = 1.
        vectors.append(vector)
    return vectors


def create(client, text='Endodontic therapy for tooth 46. CLINICAL_ONLY_MARKER', kind='Patient Record'):
    d = copy.deepcopy(client.get('/api/bootstrap').json()['documents'][0])
    d.update(title='Fictional semantic evaluation', extractedText=text, type=kind, tags=[], toothNumbers=[46])
    f = client.post('/api/files', files={'file': ('fictional.pdf', b'%PDF-fictional semantic acceptance')}).json()['id']
    result = client.post('/api/documents', json={'document': d, 'fileId': f})
    assert result.status_code == 201, result.text
    return result.json()


def test_semantic_match_without_literal_keyword_and_attribution(client, monkeypatch):
    monkeypatch.setattr('app.semantic.embed', embeddings)
    d = create(client)
    query = {'query': 'root canal', 'filters': {'patientId': d['patientId']}}
    literal = client.post('/api/search', json={**query, 'mode': 'keyword'}).json()
    assert not any(r['id'] == d['id'] for r in literal['results'])
    result = client.post('/api/search', json={**query, 'mode': 'semantic'})
    assert result.status_code == 200, result.text
    match = next(r for r in result.json()['results'] if r['id'] == d['id'])['searchMatch']
    assert match['method'] == 'semantic' and match['version'] == d['version'] and match['revision'] == d['revision']
    assert 'Endodontic' in match['snippet'] and match['field'] == 'extractedText'
    assert d['extractedText'][match['start']:match['end']] == match['snippet']
    filtered = client.post('/api/search', json={**query, 'mode': 'semantic', 'filters': {'type': 'Billing/Receipt'}}).json()
    assert not any(r['id'] == d['id'] for r in filtered['results'])


def test_hybrid_failure_explicit_keyword_fallback_and_semantic_error(client, monkeypatch):
    d = create(client, 'Unique literal fixture phrase')
    def fail(*args): raise HTTPException(503, 'Reader unavailable')
    monkeypatch.setattr('app.semantic.embed', fail)
    response = client.post('/api/search', json={'query': 'Unique literal fixture', 'mode': 'hybrid'}).json()
    assert response['modeUsed'] == 'keyword' and 'keyword results only' in response['notice']
    assert any(r['id'] == d['id'] for r in response['results'])
    assert client.post('/api/search', json={'query': 'Unique literal fixture', 'mode': 'semantic'}).status_code == 503
    assert client.post('/api/search', json={'query': 'Unique literal fixture', 'mode': 'keyword'}).status_code == 200


def test_index_reused_then_refreshed_for_new_source(client, monkeypatch):
    calls = []
    def capture(texts): calls.append(texts); return embeddings(texts)
    monkeypatch.setattr('app.semantic.embed', capture)
    d = create(client)
    query = {'query': 'root canal', 'mode': 'semantic', 'filters': {'patientId': d['patientId']}}
    assert client.post('/api/search', json=query).status_code == 200
    calls.clear()
    assert client.post('/api/search', json=query).status_code == 200
    assert calls == [['root canal']]
    revised = client.post(f'/api/documents/{d["id"]}/versions', json={'expectedRevision': d['revision'], 'updates': {'extractedText': 'Routine cleaning only'}, 'note': 'Fictional new transcription'}).json()
    result = client.post('/api/search', json=query).json()
    assert not any(r['id'] == d['id'] for r in result['results'])
    with Session(client.app.state.engine) as db:
        rows = list(db.scalars(select(SearchChunk).where(SearchChunk.document_id == d['id'])))
        assert rows and all(row.revision == revised['revision'] for row in rows)


def test_permissions_applied_before_embedding_and_archives_excluded(client, setup, monkeypatch):
    calls = []
    def capture(texts): calls.extend(texts); return embeddings(texts)
    monkeypatch.setattr('app.semantic.embed', capture)
    clinical = create(client)
    administrative = create(client, 'Appointment scheduling and visit date', 'Appointment Record')
    account = staff(client, 'front_desk')
    with TestClient(create_app(**setup)) as front:
        sign_in(front, account['user']['email'], temporary=account['temporaryPassword'])
        response = front.post('/api/search', json={'query': 'root canal', 'mode': 'semantic'})
        assert response.status_code == 200
        assert not any(r['id'] == clinical['id'] for r in response.json()['results'])
        assert not any('CLINICAL_ONLY_MARKER' in value for value in calls)
    client.post(f'/api/documents/{administrative["id"]}/archive', json={'expectedRevision': administrative['revision'], 'note': 'Fictional archive'})
    result = client.post('/api/search', json={'query': '', 'mode': 'hybrid'}).json()
    assert not any(r['id'] == administrative['id'] for r in result['results'])


def test_concurrent_source_change_cannot_return_stale_excerpt(client, monkeypatch):
    d = create(client)
    def change_on_query(texts):
        if texts == ['root canal']:
            with Session(client.app.state.engine) as db:
                row = db.get(Document, d['id']); row.revision += 1
                row.data = {**row.data, 'extractedText': 'Changed during inference'}; db.commit()
        return embeddings(texts)
    monkeypatch.setattr('app.semantic.embed', change_on_query)
    result = client.post('/api/search', json={'query': 'root canal', 'mode': 'semantic'}).json()
    assert not any(r['id'] == d['id'] for r in result['results'])
    assert 'changed' in result['notice']


def test_busy_validation_empty_query_and_csrf(client, monkeypatch):
    monkeypatch.setattr('app.semantic.embed', lambda texts: pytest.fail('Must not embed'))
    assert client.post('/api/search', json={'query': ''}).status_code == 200
    assert client.post('/api/search', json={'query': 'x'*201}).status_code == 422
    assert client.post('/api/search', json={'query': 'root canal'}, headers={'X-CSRF-Token': ''}).status_code == 403
    SLOT.acquire()
    try:
        response = client.post('/api/search', json={'query': 'root canal'}).json()
        assert response['modeUsed'] == 'keyword' and response['notice']
        assert client.post('/api/search', json={'query': 'root canal', 'mode': 'semantic'}).status_code == 503
    finally: SLOT.release()


def test_chunks_cover_source_and_fingerprint_changes():
    d = {'extractedText': 'abcd '*1000, 'title': 'Fictional source'}
    pieces = [row for row in chunks(d) if row['field'] == 'extractedText']
    assert pieces[0]['start'] == 0 and pieces[-1]['end'] == len(d['extractedText'])
    assert all(d['extractedText'][row['start']:row['end']] == row['snippet'] for row in pieces)
    assert source_hash(d) != source_hash({**d, 'title': 'Changed'})


def test_low_similarity_is_not_returned_as_a_match(client, monkeypatch):
    def weak(texts):
        return [([1., 0.] if value == 'root canal' else [.35, (1-.35**2)**.5]) + [0.]*382 for value in texts]
    monkeypatch.setattr('app.semantic.embed', weak)
    create(client)
    result = client.post('/api/search', json={'query': 'root canal', 'mode': 'semantic'}).json()
    assert result['results'] == [] and result['modeUsed'] == 'semantic'
