import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update, delete
from sqlalchemy.orm import Session
from sqlalchemy.exc import DatabaseError
from app.main import create_app
from app.database import SummaryDraft, SummaryDecision
from app.summaries import generate
from conftest import sign_in, staff
from test_api import documents, upload


def source(client, **changes):
    doc = dict(documents(client)[0])
    doc.update(title='Fictional administrative source', type='Billing/Receipt', confidenceScore=95,
               fieldConfidence={key:95 for key in doc.get('fieldConfidence',{})}, isNameMismatch=False,
               isBlurryWarning=False, completenessStatus='complete', missingFields=[],
               extractedText='  Payment NOT received.\nBalance recorded: 1000.\nAppointment not scheduled.\nClinical shorthand unchanged.')
    doc.update(changes)
    response=client.post('/api/documents',json={'document':doc,'fileId':upload(client)})
    assert response.status_code==201,response.text
    return response.json()


def draft(client, doc):
    response=client.post(f'/api/documents/{doc["id"]}/summaries',json={'expectedRevision':doc['revision']})
    assert response.status_code==201,response.text
    return response.json()


def approve(client, doc, result, **changes):
    body=dict(expectedRevision=doc['revision'], action='approve',text='Payment NOT received. Staff checked source.',note='Compared with fictional original',confirmed=True)
    body.update(changes)
    return client.post(f'/api/documents/{doc["id"]}/summaries/{result["draftId"]}/decision',json=body)


def test_exact_source_evidence_and_no_inference(client):
    doc=source(client)
    result=draft(client,doc)
    assert result['accepted'] is None
    item=result['items'][0]
    assert len(item['evidence'])==3
    for evidence in item['evidence']:
        assert doc['extractedText'][evidence['start']:evidence['end']]==evidence['quote']
    assert 'Payment NOT received.' in item['text'] and 'Appointment not scheduled.' in item['text']
    assert item['engine']=='local-extractive-administrative-v1'
    metadata=generate({**doc,'extractedText':''})
    assert not metadata['evidence'] and 'No short administrative excerpts' in metadata['text']


def test_named_approval_is_separate_immutable_and_source_unchanged(client):
    doc=source(client); url=f'/api/documents/{doc["id"]}'
    original=client.get(url+'/file').content
    before=client.get(url).json()
    result=draft(client,doc)
    for changes in [{'confirmed':False},{'confirmed':'true'},{'text':'  '},{'note':'  '}]:
        assert approve(client,doc,result,**changes).status_code==422
    accepted=approve(client,doc,result)
    assert accepted.status_code==200,accepted.text
    record=accepted.json()['accepted']
    assert record['decision']['decidedBy']==client.get('/api/auth/me').json()['user']['name']
    assert record['decision']['text']!='' and record['decision']['text']!=record['text']
    assert record['decision']['sourceConfirmed'] is True
    assert approve(client,doc,result).status_code==409
    after=client.get(url).json()
    assert after['revision']==doc['revision'] and after['completenessStatus']==doc['completenessStatus']
    assert after['validity']==before['validity'] and client.get(url+'/file').content==original
    later=draft(client,doc)
    rejected=approve(client,doc,later,action='reject',confirmed=False,text='')
    assert rejected.status_code==200 and rejected.json()['accepted']['id']==record['id']
    assert any(i['status']=='rejected' for i in rejected.json()['items'])
    with Session(client.app.state.engine) as db:
        for model in [SummaryDraft,SummaryDecision]:
            for statement in [update(model).values(data={}),delete(model)]:
                with pytest.raises(DatabaseError): db.execute(statement); db.commit()
                db.rollback()


def test_source_edits_versions_restore_and_archive_invalidate(client):
    doc=source(client); url=f'/api/documents/{doc["id"]}'
    result=draft(client,doc)
    assert approve(client,doc,result).status_code==200
    changed=client.patch(url,json={'expectedRevision':doc['revision'],'updates':{'tags':['changed']}}).json()
    assert approve(client,doc,result).status_code==409
    history=client.get(url+'/summaries').json()
    assert history['accepted'] is None and history['items'][0]['status']=='outdated_source'
    assert approve(client,changed,result).status_code==409
    fresh=draft(client,changed)
    assert approve(client,changed,fresh).status_code==200
    revised=client.post(url+'/versions',json={'expectedRevision':changed['revision'],'note':'Fictional revision','updates':{'title':'Fictional revised source'}}).json()
    assert client.get(url+'/summaries').json()['accepted'] is None
    restored=client.post(url+'/versions/1/restore',json={'expectedRevision':revised['revision'],'note':'Fictional restore'}).json()
    assert client.get(url+'/summaries').json()['accepted'] is None
    archived=client.post(url+'/archive',json={'expectedRevision':restored['revision']}).json()
    assert client.post(url+'/summaries',json={'expectedRevision':archived['revision']}).status_code==409
    assert approve(client,archived,fresh).status_code==409


def test_pending_extraction_review_blocks_summary_approval(client):
    doc=source(client,confidenceScore=40)
    result=draft(client,doc)
    assert result['sourceReviewPending'] is True
    assert approve(client,doc,result).status_code==409


@pytest.mark.parametrize('role',['assistant','front_desk','dentist'])
def test_permissions_and_historical_clinical_filter(client,setup,role):
    clinical=source(client,type='Patient Record'); old=draft(client,clinical)
    administrative=source(client); allowed=draft(client,administrative)
    client.patch(f'/api/documents/{clinical["id"]}',json={'expectedRevision':clinical['revision'],'updates':{'type':'Billing/Receipt'}})
    credentials=staff(client,role)
    with TestClient(create_app(**setup)) as other:
        sign_in(other,credentials['user']['email'],temporary=credentials['temporaryPassword'])
        assert other.get(f'/api/documents/{administrative["id"]}/summaries').status_code==200
        generated=draft(other,administrative)
        response=approve(other,administrative,generated)
        assert response.status_code==(200 if role=='dentist' else 403),response.text
        if role=='front_desk':
            assert other.get(f'/api/documents/{clinical["id"]}/summaries').json()['items']==[]
            secret=source(client,type='Patient Record')
            assert other.get(f'/api/documents/{secret["id"]}/summaries').status_code==403
            assert other.post(f'/api/documents/{secret["id"]}/summaries',json={'expectedRevision':secret['revision']}).status_code==403


def test_anonymous_csrf_and_oversized_input(client,setup):
    doc=source(client); url=f'/api/documents/{doc["id"]}/summaries'
    token=client.headers.pop('X-CSRF-Token')
    assert client.post(url,json={'expectedRevision':doc['revision']}).status_code==403
    client.headers['X-CSRF-Token']=token
    with TestClient(create_app(**setup)) as anonymous:
        assert anonymous.get(url).status_code==401
    with pytest.raises(Exception) as raised: generate({**doc,'extractedText':'x'*200001})
    assert raised.value.status_code==422
