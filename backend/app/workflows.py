"""Human review and explicitly verified validity, separate from completeness."""
import hashlib
import json
import os
from datetime import date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func, text
from sqlalchemy.exc import IntegrityError

from .database import Document, Patient, Version, User, ReviewItem, ReviewEvent, ValidityRule, DocumentValidity, ValidityEvent
from .security import authorize, can_read, ADMINISTRATIVE, stamp
from .versions import snapshot as version_snapshot, document_data

DOCUMENT_TYPES = {'Patient Record', 'X-ray', 'Treatment Plan', 'Prescription', 'Consent Form', 'Laboratory Report', 'Billing/Receipt', 'Appointment Record'}
ACTIVE_REVIEW = {'pending', 'in_review', 'changes_requested'}
CATEGORIES = {'general', 'medical_clearance'}
SYSTEM = {'id': 'system', 'name': 'System', 'role': 'system'}


def clinic_today():
    return datetime.now(ZoneInfo(os.getenv('CLINIC_TIMEZONE', 'Asia/Manila'))).date()


def fingerprint(data, review=False):
    fields = ['type', 'date', 'patientId', 'fileId', 'extractedText']
    if review:
        fields += ['toothNumbers', 'procedureCategory', 'tags', 'confidenceScore', 'fieldConfidence', 'isNameMismatch', 'isBlurryWarning']
    return hashlib.sha256(json.dumps({key: data.get(key) for key in fields}, sort_keys=True).encode()).hexdigest()


def reasons_for(data):
    reasons = []
    if data.get('confidenceScore', 100) < 85:
        reasons.append('low_confidence')
    if any(score < 85 for score in data.get('fieldConfidence', {}).values()):
        reasons.append('field_confidence')
    if data.get('isNameMismatch'):
        reasons.append('name_mismatch')
    if data.get('isBlurryWarning'):
        reasons.append('blur')
    if data.get('completenessStatus') == 'needs_review':
        reasons.append('staff_referral')
    return reasons


def review_event(db, item, user, action, note, audit, data):
    item.updated_at = stamp()
    db.add(ReviewEvent(id=str(uuid4()), review_id=item.id, data={'action': action, 'timestamp': item.updated_at, 'userId': user['id'], 'userName': user['name'], 'note': note, 'status': item.status, 'assigneeId': item.assignee_id, 'documentType': data['type']}))
    audit(db, user, action, data, note)


def sync_review(db, row, user, audit, referral=None):
    data = row.data
    if data.get('archived'):
        return
    for old in db.scalars(select(ReviewItem).where(ReviewItem.document_id == row.id, ReviewItem.version != data['version'], ReviewItem.status.in_(ACTIVE_REVIEW))):
        old.status = 'superseded'
        old.revision += 1
        review_event(db, old, user, 'REVIEW_SUPERSEDED', 'A newer source version is active', audit, data)
    item = db.scalar(select(ReviewItem).where(ReviewItem.document_id == row.id, ReviewItem.version == data['version']).with_for_update())
    reasons = reasons_for(data)
    source = fingerprint(data, review=True)
    if referral:
        reasons.append('staff_referral')
    if item is None:
        if not reasons:
            return
        item = ReviewItem(id=str(uuid4()), document_id=row.id, version=data['version'], source_fingerprint=source, status='pending', reasons=sorted(set(reasons)), revision=1, updated_at=stamp())
        db.add(item)
        db.flush()
        review_event(db, item, user, 'REVIEW_QUEUED', referral or 'Source flags require staff review', audit, data)
    elif item.source_fingerprint != source or referral:
        item.source_fingerprint = source
        item.reasons = sorted(set(item.reasons + reasons + (['source_changed'] if not reasons else [])))
        item.status = 'pending'
        item.decided_by = item.decided_at = item.decision_note = None
        item.revision += 1
        review_event(db, item, user, 'REVIEW_REOPENED', referral or 'Source metadata changed; fresh review is required', audit, data)
    return item


def rule_data(rule):
    return dict(id=rule.id, documentType=rule.document_type, category=rule.category, version=rule.version, validForDays=rule.valid_for_days, warningDays=rule.warning_days, reference=rule.reference, status=rule.status, createdBy=rule.created_by, approvedBy=rule.approved_by, approvedAt=rule.approved_at, approvalNote=rule.approval_note, revision=rule.revision)


def validity_state(db, row, today=None):
    today = today or clinic_today()
    record = db.scalar(select(DocumentValidity).where(DocumentValidity.document_id == row.id, DocumentValidity.version == row.data['version']))
    result = dict(status='unknown', reason='Validity has not been verified for this version', revision=0, expiresOn=None, issuedOn=None, warningDays=0, ruleId=None, basis=None, category='general', appointmentId=None)
    if record is None:
        return result
    result.update(revision=record.revision, basis=record.basis, category=record.category, issuedOn=record.issued_on.isoformat() if record.issued_on else None, expiresOn=record.expires_on.isoformat() if record.expires_on else None, warningDays=record.warning_days, ruleId=record.rule_id, confirmedBy=record.confirmed_by, confirmedAt=record.confirmed_at, note=record.note, appointmentId=record.appointment_id)
    if record.source_fingerprint != fingerprint(row.data):
        result.pop('note', None)
        result['reason'] = 'Source information changed; verify validity again'
        return result
    if record.rule_id:
        rule = db.get(ValidityRule, record.rule_id)
        result['ruleVersion'] = rule.version
        if rule.status != 'approved':
            result['reason'] = 'The referenced policy is no longer approved'
            return result
    if record.appointment_id:
        appointment = db.get(Document, record.appointment_id)
        if not appointment or appointment.data.get('archived') or appointment.patient_id != row.patient_id or appointment.revision != record.appointment_revision:
            result['reason'] = 'The linked appointment changed; verify consent scope again'
            return result
    if record.basis == 'not_applicable':
        result.update(status='not_applicable', reason='Staff confirmed that expiry does not apply')
    elif record.issued_on and record.issued_on > today:
        result['reason'] = 'The issue date is in the future; validity has not started'
    elif record.expires_on:
        remaining = (record.expires_on - today).days
        result.update(status='expired' if remaining < 0 else 'expiring' if remaining <= record.warning_days else 'valid', reason='Expiry is inclusive through the stated date', daysRemaining=remaining)
    return result


def workflow_summary(db, row):
    item = db.scalar(select(ReviewItem).where(ReviewItem.document_id == row.id, ReviewItem.version == row.data['version']))
    return {'review': {'id': item.id, 'status': item.status, 'reasons': item.reasons, 'revision': item.revision} if item else None, 'validity': validity_state(db, row)}


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Referral(Input):
    documentId: str
    expectedDocumentRevision: int = Field(ge=1)
    note: str = Field(min_length=1, max_length=2000)


class Assignment(Input):
    expectedRevision: int = Field(ge=1)
    assigneeId: str | None


class Decision(Input):
    expectedRevision: int = Field(ge=1)
    expectedDocumentRevision: int = Field(ge=1)
    decision: str
    note: str = Field(min_length=1, max_length=2000)
    patientVerified: bool = False
    readableConfirmed: bool = False
    patientId: str | None = None


class RuleInput(Input):
    documentType: str
    category: str = 'general'
    validForDays: int = Field(ge=1, le=36500)
    warningDays: int = Field(ge=0, le=365)
    reference: str = Field(min_length=1, max_length=500)


class RuleDecision(Input):
    expectedRevision: int = Field(ge=1)
    note: str = Field(min_length=1, max_length=2000)


class ValidityInput(Input):
    expectedRevision: int = Field(ge=0)
    expectedDocumentRevision: int = Field(ge=1)
    basis: str
    category: str = 'general'
    issuedOn: date | None = None
    expiresOn: date | None = None
    warningDays: int = Field(default=0, ge=0, le=365)
    ruleId: str | None = None
    appointmentId: str | None = None
    staffConfirmed: bool
    note: str = Field(min_length=1, max_length=2000)


def install_workflows(app, actor, database, audit, serialize):
    router = APIRouter(prefix='/api')

    def clinician(user):
        if user['role'] not in {'admin', 'dentist'}:
            raise HTTPException(403, 'A dentist or administrator must perform this review')

    def document(db, document_id, user, lock=False):
        query = select(Document).where(Document.id == document_id)
        row = db.scalar(query.with_for_update().execution_options(populate_existing=True) if lock else query)
        if not row:
            raise HTTPException(404, 'Document not found')
        authorize(user, row.data)
        if row.data.get('archived'):
            raise HTTPException(409, 'Restore the archived document before reviewing it')
        return row

    def review(db, item_id, user):
        # Always lock document before review to match normal document writes.
        found = db.get(ReviewItem, item_id)
        if not found:
            raise HTTPException(404, 'Review item not found')
        row = document(db, found.document_id, user, lock=True)
        item = db.scalar(select(ReviewItem).where(ReviewItem.id == item_id).with_for_update().execution_options(populate_existing=True))
        if not can_read_review(db, item, user):
            raise HTTPException(403, 'Your account cannot access this historical clinical review')
        return item, row

    def can_read_review(db, item, user):
        if user['role'] != 'front_desk':
            return True
        source = db.scalar(select(Version).where(Version.document_id == item.document_id, Version.number == item.version))
        return source is not None and source.snapshot.get('type') in ADMINISTRATIVE

    def item_data(db, item, row):
        assignee = db.get(User, item.assignee_id) if item.assignee_id else None
        return dict(id=item.id, documentId=row.id, version=item.version, status=item.status, reasons=item.reasons, revision=item.revision, assigneeId=item.assignee_id, assigneeName=assignee.name if assignee else None, decisionNote=item.decision_note, decidedBy=item.decided_by, decidedAt=item.decided_at, updatedAt=item.updated_at, document={**{key: row.data[key] for key in ('title', 'type', 'patientName', 'patientRecordNo', 'confidenceScore', 'completenessStatus')}, 'revision': row.revision})

    @router.get('/reviews')
    def queue(user=Depends(actor), db=Depends(database)):
        rows = {d.id: d for d in db.scalars(select(Document)) if not d.data.get('archived') and can_read(user, d.data)}
        items = [item_data(db, item, rows[item.document_id]) for item in db.scalars(select(ReviewItem).order_by(ReviewItem.updated_at)) if item.document_id in rows and can_read_review(db, item, user)]
        reviewers = [dict(id=u.id, name=u.name, role=u.role) for u in db.scalars(select(User).where(User.enabled == True, User.role.in_(['admin', 'dentist'])).order_by(User.name))] if user['role'] in {'admin', 'dentist'} else []
        return {'items': items, 'reviewers': reviewers}

    @router.get('/reviews/{item_id}')
    def detail(item_id: str, user=Depends(actor), db=Depends(database)):
        item, row = review(db, item_id, user)
        audit(db, user, 'VIEW_DOCUMENT', row.data, 'Review workspace')
        db.commit()
        return {**item_data(db, item, row), 'source': serialize(db, row, user), 'events': [e.data for e in db.scalars(select(ReviewEvent).where(ReviewEvent.review_id == item.id)) if user['role'] != 'front_desk' or e.data.get('documentType') in ADMINISTRATIVE]}

    @router.post('/reviews/referrals', status_code=201)
    def refer(body: Referral, user=Depends(actor), db=Depends(database)):
        row = document(db, body.documentId, user, lock=True)
        if row.revision != body.expectedDocumentRevision:
            raise HTTPException(409, 'Document changed. Reload before referring it.')
        if not body.note.strip():
            raise HTTPException(422, 'A reason for referral is required')
        item = sync_review(db, row, user, audit, referral=body.note.strip())
        db.commit()
        return item_data(db, item, row)

    @router.patch('/reviews/{item_id}')
    def assign(item_id: str, body: Assignment, user=Depends(actor), db=Depends(database)):
        clinician(user)
        item, row = review(db, item_id, user)
        if item.revision != body.expectedRevision or item.status not in ACTIVE_REVIEW or item.version != row.data['version']:
            raise HTTPException(409, 'Review changed or is no longer active. Reload it.')
        if body.assigneeId:
            target = db.get(User, body.assigneeId)
            if not target or not target.enabled or target.role not in {'admin', 'dentist'}:
                raise HTTPException(422, 'Assign an enabled dentist or administrator')
        item.assignee_id = body.assigneeId
        item.status = 'in_review' if body.assigneeId else 'pending'
        item.revision += 1
        review_event(db, item, user, 'REVIEW_ASSIGNED', 'Reviewer assignment updated', audit, row.data)
        db.commit()
        return item_data(db, item, row)

    @router.post('/reviews/{item_id}/decision')
    def decide(item_id: str, body: Decision, user=Depends(actor), db=Depends(database)):
        clinician(user)
        item, row = review(db, item_id, user)
        if item.revision != body.expectedRevision or row.revision != body.expectedDocumentRevision or item.version != row.data['version'] or item.status not in ACTIVE_REVIEW:
            raise HTTPException(409, 'Review or document changed. Reload before deciding.')
        if item.assignee_id not in (None, user['id']) and user['role'] != 'admin':
            raise HTTPException(403, 'This review is assigned to another reviewer')
        if body.decision not in {'approve', 'request_changes'} or not body.note.strip():
            raise HTTPException(422, 'Choose a decision and enter a staff review note')
        if body.decision == 'approve':
            if 'name_mismatch' in item.reasons and not body.patientVerified:
                raise HTTPException(422, 'Explicitly verify the patient link before approval')
            if 'blur' in item.reasons and not body.readableConfirmed:
                raise HTTPException(422, 'Confirm the original is readable or request a replacement')
            if body.patientId and not body.patientVerified:
                raise HTTPException(422, 'Patient reassignment requires explicit verification')
            data = document_data(row.data)
            if body.patientVerified:
                patient = db.get(Patient, body.patientId or row.patient_id)
                if not patient:
                    raise HTTPException(422, 'Patient not found')
                row.patient_id = patient.id
                data.update(patientId=patient.id, patientRecordNo=patient.record_no, patientName=patient.data['fullName'], isNameMismatch=False)
            data.update(reviewedBy=user['name'], reviewedAt=stamp())
            row.data = data
            row.revision += 1
            current = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == data['version']))
            current.snapshot = version_snapshot(data)
            item.source_fingerprint = fingerprint(data, review=True)
        item.status = 'approved' if body.decision == 'approve' else 'changes_requested'
        item.decided_by, item.decided_at, item.decision_note = user['id'], stamp(), body.note.strip()
        item.revision += 1
        review_event(db, item, user, 'REVIEW_APPROVED' if item.status == 'approved' else 'REVIEW_CHANGES_REQUESTED', body.note.strip(), audit, row.data)
        db.commit()
        return item_data(db, item, row)

    @router.get('/validity-rules')
    def rules(user=Depends(actor), db=Depends(database)):
        return [rule_data(r) for r in db.scalars(select(ValidityRule).order_by(ValidityRule.document_type, ValidityRule.version.desc())) if user['role'] != 'front_desk' or r.document_type in ADMINISTRATIVE]

    @router.post('/validity-rules', status_code=201)
    def draft(body: RuleInput, user=Depends(actor), db=Depends(database)):
        if user['role'] != 'admin':
            raise HTTPException(403, 'Only administrators can create draft policies')
        if body.documentType not in DOCUMENT_TYPES or body.category not in CATEGORIES or not body.reference.strip():
            raise HTTPException(422, 'Choose a valid document type/category and clinic policy reference')
        if db.bind.dialect.name == 'postgresql':
            key = int(hashlib.sha256((body.documentType + body.category).encode()).hexdigest()[:15], 16)
            db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': key})
        number = (db.scalar(select(func.max(ValidityRule.version)).where(ValidityRule.document_type == body.documentType, ValidityRule.category == body.category)) or 0) + 1
        rule = ValidityRule(id=str(uuid4()), document_type=body.documentType, category=body.category, version=number, valid_for_days=body.validForDays, warning_days=body.warningDays, reference=body.reference.strip(), status='draft', created_by=user['id'], revision=1)
        db.add(rule)
        audit(db, user, 'VALIDITY_RULE_DRAFT', details=f'{body.documentType}; {body.category}; v{number}; {body.reference.strip()}')
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'Another policy version was created. Reload and try again.')
        return rule_data(rule)

    @router.post('/validity-rules/{rule_id}/{operation}')
    def policy_decision(rule_id: str, operation: str, body: RuleDecision, user=Depends(actor), db=Depends(database)):
        rule = db.scalar(select(ValidityRule).where(ValidityRule.id == rule_id).with_for_update())
        if not rule:
            raise HTTPException(404, 'Policy not found')
        if user['role'] == 'front_desk' and rule.document_type not in ADMINISTRATIVE:
            raise HTTPException(403, 'Clinical policy access is restricted')
        required = 'admin' if rule.document_type in ADMINISTRATIVE or operation == 'retire' else 'dentist'
        if user['role'] != required:
            raise HTTPException(403, 'Clinical approval requires a dentist; administrative approval and retirement require an administrator')
        if not body.note.strip():
            raise HTTPException(422, 'Enter an approval or retirement note')
        if rule.revision != body.expectedRevision:
            raise HTTPException(409, 'Policy changed. Reload and review it.')
        if operation == 'approve' and rule.status == 'draft':
            rule.status, rule.approved_by, rule.approved_at = 'approved', user['id'], stamp()
        elif operation == 'retire' and rule.status == 'approved':
            rule.status = 'retired'
            for validity in db.scalars(select(DocumentValidity).where(DocumentValidity.rule_id == rule.id)):
                row = db.get(Document, validity.document_id)
                if row and row.data['version'] == validity.version:
                    sync_review(db, row, user, audit, referral='Referenced validity policy retired; fresh verification is required')
        else:
            raise HTTPException(409, 'This policy cannot make that transition')
        rule.approval_note = body.note.strip()
        rule.revision += 1
        audit(db, user, 'VALIDITY_RULE_APPROVED' if operation == 'approve' else 'VALIDITY_RULE_RETIRED', details=f'Policy {rule.id}; v{rule.version}; {body.note.strip()}')
        db.commit()
        return rule_data(rule)

    @router.get('/documents/{document_id}/validity')
    def get_validity(document_id: str, user=Depends(actor), db=Depends(database)):
        row = document(db, document_id, user)
        result = validity_state(db, row)
        result['history'] = [e.data for e in db.scalars(select(ValidityEvent).where(ValidityEvent.document_id == row.id)) if user['role'] != 'front_desk' or e.data.get('documentType') in ADMINISTRATIVE]
        audit(db, user, 'VIEW_DOCUMENT', row.data, 'Validity workspace')
        db.commit()
        return result

    @router.put('/documents/{document_id}/validity')
    def confirm(document_id: str, body: ValidityInput, user=Depends(actor), db=Depends(database)):
        clinician(user)
        row = document(db, document_id, user, lock=True)
        record = db.scalar(select(DocumentValidity).where(DocumentValidity.document_id == row.id, DocumentValidity.version == row.data['version']).with_for_update())
        if row.revision != body.expectedDocumentRevision or (record.revision if record else 0) != body.expectedRevision:
            raise HTTPException(409, 'Document or validity changed. Reload before confirming.')
        if not body.staffConfirmed or not body.note.strip() or body.category not in CATEGORIES or body.basis not in {'explicit', 'rule', 'not_applicable'}:
            raise HTTPException(422, 'Choose a basis, confirm staff verification and provide a source note')
        expires, warning, rule_id = body.expiresOn, body.warningDays, None
        appointment = None
        if body.basis != 'not_applicable':
            if not body.issuedOn:
                raise HTTPException(422, 'Verify the issue date')
            if body.basis == 'rule':
                rule = db.scalar(select(ValidityRule).where(ValidityRule.id == body.ruleId).with_for_update()) if body.ruleId else None
                if not rule or rule.status != 'approved' or rule.document_type != row.data['type'] or rule.category != body.category:
                    raise HTTPException(422, 'Choose an approved policy matching this document type and category')
                try:
                    expires = body.issuedOn + timedelta(days=rule.valid_for_days - 1)
                except OverflowError:
                    raise HTTPException(422, 'Issue date and policy duration exceed the supported calendar')
                warning, rule_id = rule.warning_days, rule.id
            if not expires or expires < body.issuedOn:
                raise HTTPException(422, 'Expiry must be on or after the issue date')
            if row.data['type'] == 'Consent Form':
                appointment = db.get(Document, body.appointmentId) if body.appointmentId else None
                if not appointment or appointment.data.get('archived') or appointment.data['type'] != 'Appointment Record' or appointment.patient_id != row.patient_id:
                    raise HTTPException(422, 'Link consent to an active appointment record for the same patient')
        if record is None:
            record = DocumentValidity(id=str(uuid4()), document_id=row.id, version=row.data['version'], revision=0)
            db.add(record)
        record.source_fingerprint = fingerprint(row.data)
        record.basis, record.category = body.basis, body.category
        record.issued_on = body.issuedOn if body.basis != 'not_applicable' else None
        record.expires_on = expires if body.basis != 'not_applicable' else None
        record.warning_days, record.rule_id = warning, rule_id
        record.appointment_id = appointment.id if appointment else None
        record.appointment_revision = appointment.revision if appointment else None
        record.confirmed_by, record.confirmed_at, record.note = user['id'], stamp(), body.note.strip()
        record.revision += 1
        db.flush()
        result = validity_state(db, row)
        db.add(ValidityEvent(id=str(uuid4()), document_id=row.id, data={**result, 'version': row.data['version'], 'documentType': row.data['type']}))
        audit(db, user, 'VALIDITY_CONFIRMED', row.data, f'{body.basis}; expiry {result["expiresOn"]}; policy {rule_id}; {body.note.strip()}')
        db.commit()
        return result

    app.include_router(router)
