import json
import httpx
import pytest
from app.ocr import run_local, OcrError

TOKEN='fictional-test-token-'+'x'*40
GOOD={'text':'Appointment not scheduled.','confidence':90,'pages':1,'pageResults':[{'page':1,'confidence':90,'characters':26}]}


def client_factory(monkeypatch, handler):
    original=httpx.Client
    def factory(**kwargs):
        assert kwargs['trust_env'] is False and kwargs['follow_redirects'] is False
        return original(transport=httpx.MockTransport(handler),**kwargs)
    monkeypatch.setattr('app.ocr.httpx.Client',factory)
    monkeypatch.setenv('OCR_URL','http://ocr:8092')
    monkeypatch.setenv('OCR_TOKEN',TOKEN)


def test_transport_sends_only_scan_and_validates_contract(monkeypatch):
    def handler(request):
        assert str(request.url)=='http://ocr:8092/extract'
        assert request.headers['Authorization']=='Bearer '+TOKEN
        assert request.headers['Content-Type']=='application/pdf'
        assert request.content==b'%PDF-fictional'
        return httpx.Response(200,json=GOOD)
    client_factory(monkeypatch,handler)
    assert run_local(b'%PDF-fictional','application/pdf')==GOOD


@pytest.mark.parametrize('case',['extra-field','bad-score','bool-score','bad-pages','bad-page-detail','oversized-text','invalid-json','oversized-response','redirect','busy','unauthorized','timeout','compressed','huge-score','deep-json','surrogate'])
def test_untrusted_or_failed_service_never_becomes_saved_extraction(monkeypatch,case):
    value={**GOOD,'pageResults':[dict(GOOD['pageResults'][0])]}
    if case=='extra-field':value['patientId']='must-not-control-patient'
    if case=='bad-score':value['confidence']=101
    if case=='huge-score':value['confidence']=10**1000
    if case=='bool-score':value['confidence']=True
    if case=='bad-pages':value['pages']=11
    if case=='bad-page-detail':value['pageResults'][0]['characters']=-1
    if case=='surrogate':value['text']='\ud800'
    if case=='oversized-text':value['text']='x'*150001
    def handler(request):
        if case=='timeout':raise httpx.ReadTimeout('fictional timeout',request=request)
        if case=='compressed':return httpx.Response(200,content=b'bad',headers={'Content-Encoding':'br'})
        if case=='deep-json':return httpx.Response(200,content=b'['*2000+b']'*2000)
        if case=='invalid-json':return httpx.Response(200,content=b'not json')
        if case=='oversized-response':return httpx.Response(200,content=b'x'*(1024*1024+1))
        if case in {'redirect','busy','unauthorized'}:return httpx.Response({'redirect':302,'busy':503,'unauthorized':403}[case],headers={'Location':'https://example.invalid'})
        return httpx.Response(200,json=value)
    client_factory(monkeypatch,handler)
    with pytest.raises(OcrError):run_local(b'%PDF-fictional','application/pdf')


def test_missing_service_has_no_native_fallback(monkeypatch):
    monkeypatch.delenv('OCR_URL',raising=False)
    monkeypatch.delenv('OCR_TOKEN',raising=False)
    with pytest.raises(OcrError,match='unavailable'):run_local(b'%PDF-fictional','application/pdf')
