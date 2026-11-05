"""Untrusted private reader output must never become accepted provenance."""
import hashlib
import httpx
import pytest
from fastapi import HTTPException
from app.handwriting import read_region, SLOTS

PAYLOAD = b'fictional-image'
BOX = [0, 0, 1, 1]
GOOD = dict(text='Resto #23', engine='trocr-base-amr-experimental', modelSha256='a'*64,
            sourceSha256=hashlib.sha256(PAYLOAD).hexdigest(), confidence=None,
            rotation=0, box=BOX, pixelBox=[0, 0, 300, 60], status='draft', requiresStaffVerification=True)


def configure(monkeypatch, handler):
    original = httpx.Client
    def factory(**kwargs):
        assert kwargs['trust_env'] is False and kwargs['follow_redirects'] is False
        return original(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr('app.handwriting.httpx.Client', factory)
    monkeypatch.setenv('HANDWRITING_URL', 'http://handwriting:8091')
    monkeypatch.setenv('HANDWRITING_TOKEN', 'x'*40)


def test_exact_draft_contract(monkeypatch):
    def handler(request):
        assert request.content == PAYLOAD and request.headers['Accept-Encoding'] == 'identity'
        assert request.headers['Authorization'] == 'Bearer '+'x'*40
        return httpx.Response(200, json=GOOD)
    configure(monkeypatch, handler)
    assert read_region(PAYLOAD, 0, BOX) == GOOD


@pytest.mark.parametrize('case', ['extra', 'array', 'text', 'surrogate', 'model', 'source', 'rotation', 'box', 'pixels', 'confidence', 'approved', 'confirmation', 'oversized', 'json', 'deep', 'compressed', 'redirect', 'busy', 'timeout'])
def test_reject_untrusted_output_and_release_slot(monkeypatch, case):
    value = dict(GOOD)
    changes = {'extra': {'patientId':'forged'}, 'text':{'text':'x'*4001}, 'surrogate':{'text':'\ud800'},
               'model':{'modelSha256':'wrong'}, 'source':{'sourceSha256':'b'*64},
               'rotation':{'rotation':False}, 'box':{'box':[0, 0, True, 1]}, 'pixels':{'pixelBox':[0, 0, 0, 1]},
               'confidence':{'confidence':99}, 'approved':{'status':'approved'}, 'confirmation':{'requiresStaffVerification':1}}
    value.update(changes.get(case, {}))
    def handler(request):
        if case == 'timeout': raise httpx.ReadTimeout('timeout', request=request)
        if case == 'oversized': return httpx.Response(200, content=b'x'*65537)
        if case == 'json': return httpx.Response(200, content=b'broken')
        if case == 'deep': return httpx.Response(200, content=b'['*2000+b']'*2000)
        if case == 'compressed': return httpx.Response(200, content=b'bad', headers={'Content-Encoding':'br'})
        if case in {'redirect', 'busy'}: return httpx.Response(302 if case == 'redirect' else 503, headers={'Location':'https://example.invalid'})
        return httpx.Response(200, json=[] if case == 'array' else value)
    configure(monkeypatch, handler)
    with pytest.raises(HTTPException) as failure: read_region(PAYLOAD, 0, BOX)
    assert failure.value.status_code == 503
    # Two consecutive failures must not leak either concurrency slot.
    with pytest.raises(HTTPException): read_region(PAYLOAD, 0, BOX)
    assert SLOTS.acquire(blocking=False)
    SLOTS.release()


def test_input_bounds_missing_configuration_and_busy(monkeypatch):
    monkeypatch.delenv('HANDWRITING_TOKEN', raising=False)
    with pytest.raises(HTTPException): read_region(PAYLOAD, 0, BOX)
    configure(monkeypatch, lambda request: httpx.Response(422))
    for payload in (b'', b'x'*(20*1024**2+1)):
        with pytest.raises(HTTPException) as failure: read_region(payload, 0, BOX)
        assert failure.value.status_code == 422
    assert SLOTS.acquire(False) and SLOTS.acquire(False)
    try:
        with pytest.raises(HTTPException) as failure: read_region(PAYLOAD, 0, BOX)
        assert failure.value.status_code == 503
    finally:
        SLOTS.release(); SLOTS.release()
    with pytest.raises(HTTPException) as failure: read_region(PAYLOAD, 0, BOX)
    assert failure.value.status_code == 422
