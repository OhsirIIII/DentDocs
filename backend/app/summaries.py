"""Local extractive administrative drafts, accepted only by a named human decision."""
import hashlib
import json
import re
from uuid import uuid4
from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .database import Document, SummaryDraft, SummaryDecision
from .security import authorize, can_read, stamp
from .workflows import workflow_summary

ENGINE = 'local-extractive-administrative-v1'
ADMIN_CUES = re.compile(r'\b(appointment|scheduled?|receipt|paid|payment|balance|amount|total|signature|consent|referral|clearance|missing|follow.up)\b', re.I)


class Generate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expectedRevision: int = Field(ge=1)


class Decide(Generate):
    action: Literal['approve', 'reject']
    text: str = Field(default='', max_length=6000)
    note: str = Field(min_length=1, max_length=1000)
    confirmed: StrictBool = False


def fingerprint(row):
    return hashlib.sha256(json.dumps({'revision': row.revision, 'source': row.data}, sort_keys=True).encode()).hexdigest()


def generate(data):
    source = data.get('extractedText') or ''
    if len(source) > 200000:
        raise HTTPException(422, 'Source text is too long for a local administrative draft')
    evidence = []
    offset = 0
    for raw in source.splitlines(keepends=True):
        line = raw.strip()
        start = offset + len(raw) - len(raw.lstrip())
        if 8 <= len(line) <= 280 and ADMIN_CUES.search(line):
            evidence.append({'field': 'extractedText', 'start': start, 'end': start+len(line), 'quote': line})
        offset += len(raw)
    evidence = evidence[:3]
    lines = [f"Document: {data['title']}", f"Patient record: {data['patientRecordNo']}",
             f"Recorded date: {data['date']}", f"Document type: {data['type']}",
             f"Recorded completeness: {data['completenessStatus']}"]
    missing = data.get('missingFields') or []
    if missing:
        lines.append('Checklist items recorded: ' + '; '.join(str(value)[:120] for value in missing[:10]))
        if len(missing) > 10: lines.append('Additional checklist items are in the source record.')
    lines.append('Selected source excerpts:' if evidence else 'No short administrative excerpts selected. Consult the source record.')
    lines.extend(f"• {item['quote']}" for item in evidence)
    lines.append('Administrative overview only; selected excerpts are not a complete transcription or clinical assessment.')
    return {'text': '\n'.join(lines), 'evidence': evidence, 'engine': ENGINE, 'createdAt': stamp()}


def install_summaries(app, actor, database, audit):
    def document(db, document_id, user, lock=False):
        statement = select(Document).where(Document.id == document_id).execution_options(populate_existing=True)
        row = db.scalar(statement.with_for_update() if lock else statement)
        if not row: raise HTTPException(404, 'Document not found')
        authorize(user, row.data)
        return row

    def history(db, row, user):
        current_hash = fingerprint(row)
        drafts = list(db.scalars(select(SummaryDraft).where(SummaryDraft.document_id == row.id)))
        records = []
        for draft in drafts:
            # Historical source types remain independently authorized after reclassification.
            if not can_read(user, {'type': draft.source_type}): continue
            decision = db.scalar(select(SummaryDecision).where(SummaryDecision.draft_id == draft.id))
            current = draft.source_fingerprint == current_hash
            records.append({'id': draft.id, **draft.data, 'sourceVersion': draft.source_version,
                            'sourceRevision': draft.source_revision, 'fileId': draft.file_id,
                            'currentSource': current, 'status': 'outdated_source' if not current else 'approved' if decision and decision.action == 'approve' else 'rejected' if decision else 'draft',
                            'decision': decision.data if decision else None})
        records.sort(key=lambda item: (item['createdAt'], item['id']), reverse=True)
        accepted = sorted([item for item in records if item['status'] == 'approved'], key=lambda item: item['decision']['decidedAt'], reverse=True)
        selected = accepted[0] if accepted else None
        return {'accepted': selected, 'items': records[:50], 'historyCount': len(records), 'documentRevision': row.revision,
                'sourceReviewPending': (workflow_summary(db, row)['review'] or {}).get('status') in {'pending', 'in_review', 'changes_requested'}}

    @app.get('/api/documents/{document_id}/summaries')
    def list_summaries(document_id: str, user=Depends(actor), db=Depends(database)):
        row = document(db, document_id, user)
        result = history(db, row, user)
        audit(db, user, 'SUMMARY_VIEW', row.data, 'Administrative summary history viewed')
        db.commit()
        return result

    @app.post('/api/documents/{document_id}/summaries', status_code=201)
    def make_draft(document_id: str, body: Generate, user=Depends(actor), db=Depends(database)):
        row = document(db, document_id, user, lock=True)
        if row.data.get('archived'): raise HTTPException(409, 'Restore the document before generating a draft')
        if row.revision != body.expectedRevision: raise HTTPException(409, 'Source changed. Reload before generating a draft.')
        content = {**generate(row.data), 'createdBy': user['name'], 'createdById': user['id']}
        draft = SummaryDraft(id=str(uuid4()), document_id=row.id, source_revision=row.revision,
                             source_version=row.data['version'], source_fingerprint=fingerprint(row),
                             source_type=row.data['type'], file_id=row.data.get('fileId'), created_by=user['id'], data=content)
        db.add(draft); db.flush()
        audit(db, user, 'SUMMARY_DRAFT', row.data, f'Administrative draft {draft.id}; human approval required')
        db.commit()
        return {'draftId': draft.id, **history(db, row, user)}

    @app.post('/api/documents/{document_id}/summaries/{draft_id}/decision')
    def decide(document_id: str, draft_id: str, body: Decide, user=Depends(actor), db=Depends(database)):
        row = document(db, document_id, user, lock=True)
        if user['role'] not in {'admin', 'dentist'}: raise HTTPException(403, 'A dentist or administrator must approve or reject summaries')
        if row.data.get('archived'): raise HTTPException(409, 'Restore the document before reviewing a summary')
        if row.revision != body.expectedRevision: raise HTTPException(409, 'Source changed. Reload before deciding.')
        draft = db.get(SummaryDraft, draft_id)
        if not draft or draft.document_id != row.id: raise HTTPException(404, 'Summary draft not found')
        authorize(user, {'type': draft.source_type})
        if db.scalar(select(SummaryDecision).where(SummaryDecision.draft_id == draft.id)):
            raise HTTPException(409, 'This draft already has a decision; generate another draft for changes')
        if not body.note.strip(): raise HTTPException(422, 'A staff review note is required')
        if body.action == 'approve':
            if draft.source_fingerprint != fingerprint(row): raise HTTPException(409, 'The draft source is outdated. Generate a fresh draft.')
            if history(db, row, user)['sourceReviewPending']: raise HTTPException(409, 'Finish extraction review before accepting a summary')
            if not body.confirmed or not body.text.strip(): raise HTTPException(422, 'Confirm source comparison and enter the accepted administrative summary')
        record = {'action': body.action, 'text': body.text.strip() if body.action == 'approve' else None,
                  'note': body.note.strip(), 'decidedAt': stamp(), 'decidedBy': user['name'], 'decidedById': user['id'],
                  'decidedByRole': user['role'], 'sourceConfirmed': body.confirmed if body.action == 'approve' else False}
        db.add(SummaryDecision(id=str(uuid4()), draft_id=draft.id, action=body.action, decided_by=user['id'], data=record))
        audit(db, user, 'SUMMARY_APPROVED' if body.action == 'approve' else 'SUMMARY_REJECTED', row.data, f'Administrative draft {draft.id}; named staff decision')
        try: db.commit()
        except IntegrityError:
            db.rollback(); raise HTTPException(409, 'Another reviewer already decided this draft')
        return history(db, row, user)
