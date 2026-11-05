import httpx
import pytest
from fastapi import HTTPException
from app.semantic import embed, MODEL

VECTOR = [1.0] + [0.0]*383


def configure(monkeypatch, handler):
    original = httpx.Client
    def factory(**kwargs):
        assert kwargs['trust_env'] is False and kwargs['follow_redirects'] is False
        return original(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr('app.semantic.httpx.Client', factory)
    monkeypatch.setenv('HANDWRITING_URL', 'http://handwriting:8091')
    monkeypatch.setenv('HANDWRITING_TOKEN', 'x'*40)


def test_batches_retain_order(monkeypatch):
    calls = []
    def handler(request):
        import json
        batch = json.loads(request.content)['texts']
        assert request.headers['Accept-Encoding'] == 'identity'
        calls.append(batch)
        return httpx.Response(200, json={'model':MODEL, 'vectors':[VECTOR]*len(batch)})
    configure(monkeypatch, handler)
    texts = [str(i) for i in range(33)]
    assert embed(texts) == [VECTOR]*33 and calls == [texts[:32], texts[32:]]


@pytest.mark.parametrize('case', ['oversized', 'compressed', 'redirect', 'timeout', 'deep', 'array', 'extra', 'model', 'count', 'type', 'bool', 'huge', 'nan', 'unnormalized'])
def test_reader_failure_stays_a_safe_search_failure(monkeypatch, case):
    value = {'model':MODEL, 'vectors':[VECTOR.copy()]}
    if case == 'extra': value['documentId'] = 'forged'
    if case == 'model': value['model'] = 'unknown'
    if case == 'count': value['vectors'] = []
    if case == 'type': value['vectors'] = ['not a vector']
    if case == 'bool': value['vectors'][0][0] = True
    if case == 'huge': value['vectors'][0][0] = 10**1000
    if case == 'nan': value['vectors'][0][0] = float('nan')
    if case == 'unnormalized': value['vectors'][0][0] = .1
    def handler(request):
        if case == 'oversized': return httpx.Response(200, content=b'x'*(1024*1024+1))
        if case == 'compressed': return httpx.Response(200, content=b'bad', headers={'Content-Encoding':'br'})
        if case == 'redirect': return httpx.Response(302, headers={'Location':'https://example.invalid'})
        if case == 'timeout': raise httpx.ReadTimeout('timeout', request=request)
        if case == 'deep': return httpx.Response(200, content=b'['*2000+b']'*2000)
        # stdlib serialization deliberately allows NaN to exercise strict validation.
        import json
        return httpx.Response(200, content=json.dumps([] if case == 'array' else value).encode())
    configure(monkeypatch, handler)
    with pytest.raises(HTTPException) as error: embed(['fictional text'])
    assert error.value.status_code == 503 and 'keyword search' in error.value.detail
