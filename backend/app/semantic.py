"""Permission-scoped hybrid retrieval with local embeddings and exact pgvector ranking."""
import hashlib
import json
import math
import os
import threading
from uuid import uuid4

import httpx
from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal
from sqlalchemy import select, delete, text, bindparam

from .database import SearchChunk, Document, User
from .security import can_read

MODEL = 'sentence-transformers/all-MiniLM-L6-v2@1110a243fdf4706b3f48f1d95db1a4f5529b4d41'
SLOT = threading.BoundedSemaphore(1)


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    query: str = Field(default='', max_length=200)
    filters: dict = Field(default_factory=dict)
    mode: Literal['hybrid', 'semantic', 'keyword'] = 'hybrid'
    limit: int = Field(default=30, ge=1, le=100)


def embed(texts):
    url, token = os.getenv('HANDWRITING_URL', ''), os.getenv('HANDWRITING_TOKEN', '')
    if not url or not token:
        raise HTTPException(503, 'Local semantic reader is unavailable')
    vectors = []
    try:
        with httpx.Client(timeout=httpx.Timeout(45, connect=3, write=15, pool=3), trust_env=False, follow_redirects=False) as client:
            for start in range(0, len(texts), 32):
                with client.stream('POST', url + '/embed', json={'texts': texts[start:start+32]},
                                   headers={'Authorization': 'Bearer ' + token, 'Accept-Encoding': 'identity'}) as response:
                    if response.status_code != 200 or response.headers.get('Content-Encoding', 'identity') != 'identity':
                        raise ValueError()
                    output = bytearray()
                    for chunk in response.iter_bytes(chunk_size=8192):
                        if len(output) + len(chunk) > 1024*1024:
                            raise ValueError('Oversized embedding response')
                        output.extend(chunk)
                    result = json.loads(output)
                if not isinstance(result, dict) or set(result) != {'model', 'vectors'}:
                    raise ValueError()
                batch = result['vectors']
                if result['model'] != MODEL or not isinstance(batch, list) or len(batch) != len(texts[start:start+32]):
                    raise ValueError()
                for vector in batch:
                    if not isinstance(vector, list) or len(vector) != 384 or not all(type(v) in (int, float) and math.isfinite(v) and abs(v) <= 1.001 for v in vector) or not .99 <= sum(v*v for v in vector) <= 1.01:
                        raise ValueError()
                vectors.extend(batch)
    except (httpx.HTTPError, ValueError, KeyError, TypeError, OverflowError, RecursionError):
        raise HTTPException(503, 'Local semantic reader is unavailable; keyword search remains available')
    return vectors


def chunks(document):
    metadata = '\n'.join(f"{key}: " + (' · '.join(map(str, document.get(key, []))) if key in {'toothNumbers', 'tags'} else str(document.get(key, ''))) for key in ('title', 'type', 'patientName', 'patientRecordNo', 'date', 'procedureCategory', 'toothNumbers', 'tags'))
    result = []
    for field, content in [('metadata', metadata), ('extractedText', document.get('extractedText') or '')]:
        if len(content) > 200000:
            raise HTTPException(503, 'A document exceeds the semantic indexing limit; use keyword search')
        for start in range(0, len(content), 160):
            value = content[start:start+200]
            if value.strip():
                result.append({'field': field, 'start': start, 'end': start+len(value), 'snippet': value})
    return result


def source_hash(document):
    return hashlib.sha256(json.dumps(chunks(document), sort_keys=True).encode()).hexdigest()


def ensure_index(db, documents):
    for document in sorted(documents, key=lambda d: d['id']):
        expected = source_hash(document)
        existing = list(db.scalars(select(SearchChunk).where(SearchChunk.document_id == document['id'])))
        if existing and all(row.revision == document['revision'] and row.fingerprint == expected and row.model_id == MODEL for row in existing):
            continue
        pieces = chunks(document)
        vectors = embed([piece['snippet'] for piece in pieces])
        # The model call may take time. Never publish an index for a changed source.
        row = db.get(Document, document['id'])
        db.refresh(row)
        if row.revision != document['revision']:
            raise HTTPException(409, 'Records changed while preparing search. Retry.')
        db.execute(delete(SearchChunk).where(SearchChunk.document_id == row.id))
        for number, (piece, vector) in enumerate(zip(pieces, vectors)):
            db.add(SearchChunk(id=str(uuid4()), document_id=row.id, revision=row.revision, number=number,
                               fingerprint=expected, model_id=MODEL, embedding=vector, **piece))
        db.flush()
    db.commit()


def ranked_chunks(db, ids, query_vector):
    if not ids:
        return []
    if db.bind.dialect.name == 'postgresql':
        statement = text('SELECT id, 1 - (embedding <=> CAST(:query AS vector)) AS similarity FROM search_chunks WHERE document_id IN :ids AND model_id = :model ORDER BY similarity DESC').bindparams(bindparam('ids', expanding=True))
        return [(db.get(SearchChunk, key), float(similarity)) for key, similarity in db.execute(statement, {'query': json.dumps(query_vector), 'ids': ids, 'model': MODEL}) if similarity is not None]
    rows = list(db.scalars(select(SearchChunk).where(SearchChunk.document_id.in_(ids), SearchChunk.model_id == MODEL)))
    norm = math.sqrt(sum(v*v for v in query_vector))
    return sorted([(row, sum(a*b for a, b in zip(row.embedding, query_vector)) / (norm * math.sqrt(sum(v*v for v in row.embedding)))) for row in rows], key=lambda item: item[1], reverse=True)


def keyword_excerpt(document, query):
    for field in ('extractedText', 'title', 'patientRecordNo', 'patientName'):
        content = str(document.get(field) or '')
        at = content.lower().find(query.lower())
        if at >= 0:
            start = max(0, at - 60)
            return {'field': field, 'start': start, 'end': min(len(content), start+240), 'snippet': content[start:start+240]}
    return {'field': 'metadata', 'start': 0, 'end': len(document['type']), 'snippet': document['type']}


def install_search(app, actor, database, legacy_search, serialize):
    @app.post('/api/search')
    def search(body: SearchRequest, user=Depends(actor), db=Depends(database)):
        query = body.query.strip()
        candidates = legacy_search({'query': '', 'filters': body.filters}, user, db)
        keywords = legacy_search({'query': query, 'filters': body.filters}, user, db)
        notice, mode = None, body.mode
        semantic = {}
        if not query or mode == 'keyword' or not candidates:
            mode = 'keyword'
        elif not SLOT.acquire(blocking=False):
            if mode == 'semantic':
                raise HTTPException(503, 'Search reader is busy. Retry or choose keyword search.')
            notice, mode = 'Semantic search is busy. Showing keyword results only.', 'keyword'
        else:
            try:
                ensure_index(db, candidates)
                vector = embed([query])[0]
                for row, similarity in ranked_chunks(db, [d['id'] for d in candidates], vector):
                    if similarity >= .40 and row.document_id not in semantic:
                        semantic[row.document_id] = (row, similarity)
            except HTTPException as error:
                db.rollback()
                if body.mode == 'semantic':
                    raise
                notice, mode = f'{error.detail}. Showing keyword results only.', 'keyword'
            finally:
                SLOT.release()
        # Discard data captured before inference if permissions/source/archive changed.
        db.expire_all()
        current_user = db.get(User, user['id'])
        if not current_user or not current_user.enabled or current_user.role != user['role']:
            raise HTTPException(403, 'Account permissions changed. Sign in again.')
        allowed = {}
        for captured in candidates:
            row = db.get(Document, captured['id'])
            if row and row.revision == captured['revision'] and can_read(user, row.data) and not row.data.get('archived'):
                allowed[row.id] = serialize(row, user, db)
        if len(allowed) != len(candidates):
            notice = 'Some records changed during search and were omitted. Retry for current results.'
        keyword_ids = [d['id'] for d in keywords if d['id'] in allowed]
        semantic_ids = [key for key in semantic if key in allowed]
        scores = {}
        if mode in {'keyword', 'hybrid'}:
            for rank, key in enumerate(keyword_ids, 1): scores[key] = scores.get(key, 0) + 1/(60+rank)
        if mode in {'semantic', 'hybrid'}:
            for rank, key in enumerate(semantic_ids, 1): scores[key] = scores.get(key, 0) + 1/(60+rank)
        results = []
        for key in sorted(scores, key=lambda key: (-scores[key], key))[:body.limit]:
            document = allowed[key]
            semantic_hit = semantic.get(key) if mode != 'keyword' else None
            if semantic_hit:
                chunk, similarity = semantic_hit
                evidence = {'field': chunk.field, 'start': chunk.start, 'end': chunk.end, 'snippet': chunk.snippet, 'similarity': round(similarity, 4), 'model': MODEL}
            else:
                evidence = keyword_excerpt(document, query)
            evidence.update(method='hybrid' if mode == 'hybrid' and key in keyword_ids and semantic_hit else 'semantic' if semantic_hit else 'keyword',
                            version=document['version'], revision=document['revision'])
            results.append({**document, 'searchMatch': evidence})
        return {'results': results, 'modeUsed': mode, 'notice': notice, 'model': MODEL if mode != 'keyword' else None}
