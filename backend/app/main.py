"""Authenticated, role-scoped API; clinic data remains fictional during development."""
import copy
import hashlib
import json
import os
import math
from typing import Literal
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from cryptography.fernet import Fernet
from fastapi import FastAPI, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, update

from .database import make_database, migrate, Patient, Document, FileRecord, FileUpload, Version, Audit, Extraction, HandwritingDraft
from .handwriting import read_region
from .semantic import install_search
from .ocr import run_local, extract_fields, OcrError
from .security import install_security, initialize_admin, authorize, can_read, ADMINISTRATIVE
from .workflows import install_workflows, sync_review, workflow_summary, SYSTEM

TYPES = {'Patient Record', 'X-ray', 'Treatment Plan', 'Prescription', 'Consent Form', 'Laboratory Report', 'Billing/Receipt', 'Appointment Record'}
PROCEDURES = {'Restorative', 'Endodontics', 'Oral Surgery', 'Orthodontics', 'Prosthodontics', 'Periodontics', 'Preventive', 'Billing & Administrative'}
EDITABLE = {'title', 'type', 'date', 'toothNumbers', 'procedureCategory', 'tags', 'completenessStatus', 'missingFields', 'reviewNotes'}
VERSION_FIELDS = EDITABLE | {'fileType', 'fileSize', 'extractedText', 'confidenceScore', 'fieldConfidence', 'radiographDetails', 'prescriptionDetails', 'amount', 'receiptNo', 'hmoProvider', 'isBlurryWarning', 'isNameMismatch'}
MAX_FILE = 20 * 1024 * 1024


def now():
    return datetime.now(timezone.utc).isoformat()


class Mutation(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expectedRevision: int = Field(ge=1)
    updates: dict = Field(default_factory=dict)
    note: str = ''
    fileId: str | None = None


class CreateDocument(BaseModel):
    model_config = ConfigDict(extra='forbid')
    document: dict
    fileId: str | None = None


class ExtractRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    patientId: str


class HandwritingRequest(ExtractRequest):
    rotation: Literal[0, 90, 180, 270] = 0
    box: tuple[float, float, float, float]


def validate(data):
    if not isinstance(data.get('type'), str) or not isinstance(data.get('procedureCategory'), str) or data.get('type') not in TYPES or data.get('procedureCategory') not in PROCEDURES:
        raise HTTPException(422, 'Unknown document type or procedure category')
    scores = [data.get('confidenceScore'), *data.get('fieldConfidence', {}).values()] if isinstance(data.get('fieldConfidence'), dict) else [None]
    if any(type(value) not in (int, float) or not 0 <= value <= 100 for value in scores):
        raise HTTPException(422, 'Confidence values must be numbers from 0 to 100')
    if not isinstance(data.get('title'), str) or not data['title'].strip() or len(data['title']) > 300:
        raise HTTPException(422, 'A title of at most 300 characters is required')
    try:
        datetime.strptime(data['date'], '%Y-%m-%d')
        teeth = data.get('toothNumbers', [])
        if not isinstance(teeth, list) or any(type(t) is not int or t // 10 not in range(1, 5) or t % 10 not in range(1, 9) for t in teeth):
            raise ValueError()
        if data.get('completenessStatus') not in {'complete', 'incomplete', 'needs_review'}:
            raise ValueError()
        if not isinstance(data.get('tags', []), list) or any(not isinstance(t, str) for t in data.get('tags', [])):
            raise ValueError()
    except (KeyError, TypeError, ValueError):
        raise HTTPException(422, 'Invalid date, tooth notation, tags, or completeness status')


def create_app(database_url=None, file_root=None, seed_path=None, encryption_key=None):
    if os.getenv('DENTDOCS_MODE') != 'mock':
        raise RuntimeError('DENTDOCS_MODE=mock is required pending clinic release approval')
    engine, sessions = make_database(database_url)
    root = Path(file_root or os.environ['FILE_ROOT']).resolve()
    cipher = Fernet(encryption_key or os.environ['FILE_ENCRYPTION_KEY'])
    seed_file = Path(seed_path or Path(__file__).parents[1] / 'seed' / 'mock.json')
    seed = json.loads(seed_file.read_text(encoding='utf-8'))

    @asynccontextmanager
    async def lifespan(app):
        root.mkdir(parents=True, exist_ok=True)
        if os.getenv('DENTDOCS_MIGRATE', 'true') == 'true':
            migrate(engine)
            initialize_data()
        yield
        engine.dispose()

    def initialize_data():
        with sessions() as db:
            initialize_admin(db)
            if not db.scalar(select(Patient.id).limit(1)):
                for p in seed['patients']:
                    db.add(Patient(id=p['id'], record_no=p['recordNo'], data=p))
                db.flush()
                for original in seed['documents']:
                    d = copy.deepcopy(original)
                    # Fixture previews have no original file. Never invent one.
                    d['fileId'] = None
                    db.add(Document(id=d['id'], patient_id=d['patientId'], revision=1, data=d))
                    db.flush()
                    db.add(Version(id=str(uuid4()), document_id=d['id'], number=d['version'], file_id=None, snapshot=d))
                    for old in d.get('versionHistory', []):
                        historical = {**d, **old, 'version': old['versionNumber'], 'versionHistory': [], 'fileId': None}
                        db.add(Version(id=str(uuid4()), document_id=d['id'], number=old['versionNumber'], file_id=None, snapshot=historical))
                for a in seed['auditLogs']:
                    db.add(Audit(id=a['id'], data=a))
                db.commit()
            for row in db.scalars(select(Document)):
                sync_review(db, row, SYSTEM, audit)
            db.commit()

    app = FastAPI(title='DentDocs authenticated clinic API', lifespan=lifespan)
    app.state.engine = engine

    def database():
        with sessions() as db:
            yield db

    def audit(db, user, action, doc=None, details=''):
        key = str(uuid4())
        db.add(Audit(id=key, data=dict(id=key, timestamp=now(), userId=user['id'], userName=user['name'], userRole=user['role'], action=action, targetType='DOCUMENT' if doc else 'SYSTEM', targetId=doc['id'] if doc else user['id'], targetTitle=doc['title'] if doc else 'Staff account or session', details=details)))

    actor = install_security(app, database, audit)

    def get_doc(db, document_id, user):
        doc = db.get(Document, document_id)
        if not doc:
            raise HTTPException(404, 'Document not found')
        authorize(user, doc.data)
        return doc

    def public(doc, user, db):
        result = {**safe_data({**doc.data, 'revision': doc.revision}, user), **workflow_summary(db, doc)}
        if result['review'] and result['review']['status'] != 'approved':
            result.pop('reviewedBy', None)
            result.pop('reviewedAt', None)
        return result

    def safe_data(value, user):
        data = copy.deepcopy(value)
        if user['role'] == 'front_desk':
            for key in ('radiographDetails', 'prescriptionDetails', 'reviewNotes', 'resolutionNote', 'handwritingSources'):
                data.pop(key, None)
            data['versionHistory'] = [v for v in data.get('versionHistory', []) if v.get('type') in ADMINISTRATIVE]
            for version in data['versionHistory']:
                version.pop('handwritingSources', None)
        return data

    def claim_file(db, file_id, user):
        result = db.execute(update(FileUpload).where(FileUpload.file_id == file_id, FileUpload.user_id == user['id'], FileUpload.consumed == False).values(consumed=True))
        if result.rowcount != 1:
            raise HTTPException(403, 'Upload a new original file from your own account')

    def persist(db, row, expected, data):
        result = db.execute(update(Document).where(Document.id == row.id, Document.revision == expected).values(data=data, revision=expected + 1), execution_options={'synchronize_session': False})
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(409, 'Another staff member changed this record. Reload and try again.')
        return {**data, 'revision': expected + 1}

    def file_info(db, file_id):
        record = db.get(FileRecord, file_id)
        if not record:
            raise HTTPException(404, 'Uploaded file not found')
        return record

    def attach_file(db, data, file_id):
        info = file_info(db, file_id)
        data.update(fileId=info.id, fileSize=f'{info.size:,} bytes', fileType={'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPG'}[info.mime])

    def attach_handwriting(db, data, file_id, patient_id, user):
        data.pop('handwritingSources', None)
        drafts = list(db.scalars(select(HandwritingDraft).where(HandwritingDraft.file_id == file_id)))
        if not drafts:
            return
        if user['role'] == 'front_desk' or any(d.patient_id != patient_id or d.user_id != user['id'] for d in drafts):
            raise HTTPException(403, 'Handwriting drafts must match your upload, patient and clinical role')
        data['handwritingSources'] = sorted([copy.deepcopy(d.data) for d in drafts], key=lambda d: d['createdAt'])
        data.update(confidenceScore=0, fieldConfidence={key: 0 for key in data['fieldConfidence']}, completenessStatus='needs_review')
        data['missingFields'] = list(dict.fromkeys([*data.get('missingFields', []), 'Staff completeness verification']))

    @app.middleware('http')
    async def no_cache(request, call_next):
        response = await call_next(request)
        if response.status_code == 403 and hasattr(request.state, 'identity'):
            with sessions() as db:
                audit(db, request.state.identity, 'ACCESS_DENIED', details=f'{request.method} {request.url.path}')
                db.commit()
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'no-referrer'
        return response

    @app.get('/api/health')
    def health(db=Depends(database)):
        db.execute(select(Patient.id).limit(1))
        return {'status': 'ok', 'mode': 'mock', 'authentication': True}

    @app.get('/api/bootstrap')
    def bootstrap(user=Depends(actor), db=Depends(database)):
        patients = [copy.deepcopy(p.data) for p in db.scalars(select(Patient))]
        if user['role'] == 'front_desk':
            for patient in patients:
                patient.update(medicalAlerts=[], fdiTreatedTeeth=[], fdiMissingTeeth=[], fdiWatchTeeth=[], dob='', age=0, isMinor=False)
                for key in ('guardianName', 'guardianPhone', 'emergencyContact'):
                    patient.pop(key, None)
                patient['emergencyContact'] = {'name': '', 'relation': '', 'phone': ''}
        logs = [a.data for a in db.scalars(select(Audit))] if user['role'] == 'admin' else []
        logs.sort(key=lambda a: a['timestamp'], reverse=True)
        pending = sum(1 for d in db.scalars(select(Document)) if not d.data.get('archived') and can_read(user, d.data) and (workflow_summary(db, d)['review'] or {}).get('status') in {'pending', 'in_review', 'changes_requested'})
        return {'reviewPendingCount': pending, 'patients': patients, 'documents': [public(d, user, db) for d in db.scalars(select(Document)) if can_read(user, d.data)], 'auditLogs': logs, 'currentUser': user}

    @app.get('/api/documents/{document_id}')
    def read_document(document_id: str, user=Depends(actor), db=Depends(database)):
        doc = get_doc(db, document_id, user)
        audit(db, user, 'VIEW_DOCUMENT', doc.data)
        db.commit()
        return public(doc, user, db)

    @app.post('/api/documents/search')
    def search(body: dict, user=Depends(actor), db=Depends(database)):
        query = str(body.get('query', '')).strip().lower()
        filters = body.get('filters') or {}
        synonyms = {'reseta': 'Prescription', 'prescription': 'Prescription', 'gamot': 'Prescription', 'xray': 'X-ray', 'radiograph': 'X-ray', 'opg': 'X-ray', 'billing': 'Billing/Receipt', 'receipt': 'Billing/Receipt', 'resibo': 'Billing/Receipt', 'consent': 'Consent Form', 'pahintulot': 'Consent Form'}
        results = []
        for row in db.scalars(select(Document)):
            if not can_read(user, row.data):
                continue
            d = public(row, user, db)
            if d.get('archived'):
                continue
            if any(filters.get(k) not in (None, '', 'ALL', d[field]) for k, field in [('type', 'type'), ('patientId', 'patientId')]):
                continue
            status = filters.get('status', 'ALL')
            if status != 'ALL' and status and not (d['completenessStatus'] == status or status == 'needs_review' and d['confidenceScore'] < 85):
                continue
            tooth = filters.get('tooth')
            if tooth not in (None, '', 'ALL') and str(tooth) not in [str(t) for t in d['toothNumbers']]:
                continue
            date_filter = filters.get('date')
            if date_filter == 'OCT_2026' and not d['date'].startswith('2026-10'):
                continue
            if query:
                match = (d['completenessStatus'] == 'incomplete') if query in {'incomplete', 'missing'} else (d['type'] == synonyms[query]) if query in synonyms else query in ' '.join(str(d.get(k, '')) for k in ['title', 'patientName', 'patientRecordNo', 'extractedText', 'tags']).lower() or query.removeprefix('tooth').strip() in [str(t) for t in d['toothNumbers']]
                if not match:
                    continue
            results.append(d)
        return results

    @app.post('/api/files', status_code=201)
    async def upload_file(file: UploadFile, user=Depends(actor), db=Depends(database)):
        payload = await file.read(MAX_FILE + 1)
        await file.close()
        if not payload or len(payload) > MAX_FILE:
            raise HTTPException(413, 'File must be between 1 byte and 20 MB')
        mime = 'application/pdf' if payload.startswith(b'%PDF-') else 'image/png' if payload.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if payload.startswith(b'\xff\xd8\xff') else None
        if not mime:
            raise HTTPException(415, 'Only PDF, PNG, and JPEG contents are accepted')
        key = str(uuid4())
        target = root / key
        target.write_bytes(cipher.encrypt(payload))
        try:
            db.add(FileRecord(id=key, mime=mime, size=len(payload), sha256=hashlib.sha256(payload).hexdigest(), created_at=now()))
            db.flush()
            db.add(FileUpload(file_id=key, user_id=user['id'], consumed=False))
            db.commit()
        except Exception:
            target.unlink(missing_ok=True)
            raise
        return {'id': key, 'size': len(payload), 'mime': mime}

    @app.post('/api/files/{file_id}/extract')
    def extract_file(file_id: str, body: ExtractRequest, user=Depends(actor), db=Depends(database)):
        upload = db.scalar(select(FileUpload).where(FileUpload.file_id == file_id).with_for_update())
        if not upload or upload.user_id != user['id'] or upload.consumed:
            raise HTTPException(403, 'Process an unused original uploaded from your own account')
        # OCR can expose clinical content before classification. Restrict this endpoint accordingly.
        if user['role'] == 'front_desk':
            raise HTTPException(403, 'Ask a dentist or assistant to process scans. Administrative uploads can be entered manually.')
        patient = db.get(Patient, body.patientId)
        if not patient:
            raise HTTPException(422, 'Patient not found')
        cached = db.get(Extraction, file_id)
        if cached:
            if cached.patient_id != patient.id:
                raise HTTPException(409, 'Choose a new original upload to change the selected patient')
            return cached.result
        info = file_info(db, file_id)
        try:
            payload = cipher.decrypt((root / file_id).read_bytes())
            if hashlib.sha256(payload).hexdigest() != info.sha256:
                raise ValueError('Integrity failure')
        except Exception:
            raise HTTPException(503, 'Original file unavailable or integrity check failed')
        try:
            raw = run_local(payload, info.mime)
        except OcrError as error:
            audit(db, user, 'OCR_FAILED', details=f'Original {file_id}; local processing failed')
            db.commit()
            raise HTTPException(422, str(error))
        result = extract_fields(raw, patient.data)
        result.update(fileType={'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPG'}[info.mime], fileSize=f'{info.size:,} bytes')
        db.add(Extraction(file_id=file_id, patient_id=patient.id, result=result))
        audit(db, user, 'OCR_EXTRACTED', details=f'Original {file_id}; {raw["pages"]} pages; staff review required')
        db.commit()
        return result

    @app.post('/api/files/{file_id}/handwriting')
    def handwriting_draft(file_id: str, body: HandwritingRequest, user=Depends(actor), db=Depends(database)):
        if user['role'] == 'front_desk':
            raise HTTPException(403, 'Ask clinical staff to transcribe unclassified scans')
        upload = db.scalar(select(FileUpload).where(FileUpload.file_id == file_id).with_for_update())
        if not upload or upload.user_id != user['id'] or upload.consumed:
            raise HTTPException(403, 'Use your own unused original upload')
        if not db.get(Patient, body.patientId):
            raise HTTPException(422, 'Patient not found')
        box = body.box
        if not all(math.isfinite(v) and 0 <= v <= 1 for v in box) or not box[0] < box[2] or not box[1] < box[3]:
            raise HTTPException(422, 'Select a region inside the image')
        drafts = list(db.scalars(select(HandwritingDraft).where(HandwritingDraft.file_id == file_id)))
        extracted = db.get(Extraction, file_id)
        if any(d.patient_id != body.patientId for d in drafts) or extracted and extracted.patient_id != body.patientId:
            raise HTTPException(409, 'Patient selection changed; upload a new original')
        if len(drafts) >= 20:
            raise HTTPException(422, 'At most 20 region suggestions per original; finish review or upload a new original')
        info = file_info(db, file_id)
        if info.mime not in {'image/png', 'image/jpeg'}:
            raise HTTPException(422, 'Handwriting regions currently support JPG/PNG images. Use printed OCR for PDFs.')
        try:
            payload = cipher.decrypt((root / file_id).read_bytes())
            if hashlib.sha256(payload).hexdigest() != info.sha256:
                raise ValueError()
        except Exception:
            raise HTTPException(503, 'Original unavailable or integrity check failed')
        try:
            result = read_region(payload, body.rotation, list(box))
            if result.get('sourceSha256') != info.sha256:
                raise HTTPException(503, 'Handwriting source integrity check failed')
        except HTTPException:
            audit(db, user, 'HANDWRITING_FAILED', details=f'Original {file_id}; draft generation failed')
            db.commit()
            raise
        key = str(uuid4())
        result.update(id=key, rotation=body.rotation, box=list(box), createdAt=now(), suggestedBy=user['name'],
                      status='draft', confidence=None, requiresStaffVerification=True)
        db.add(HandwritingDraft(id=key, file_id=file_id, patient_id=body.patientId, user_id=user['id'], data=result))
        audit(db, user, 'HANDWRITING_DRAFT', details=f'Original {file_id}; region suggestion retained; staff verification required')
        db.commit()
        return result

    @app.get('/api/documents/{document_id}/file')
    def download_file(document_id: str, version: int | None = None, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id, user)
        selected = db.scalar(select(Version).where(Version.document_id == document_id, Version.number == (version or row.data['version'])))
        if not selected or not selected.file_id:
            raise HTTPException(404, 'This fictional fixture has no original file')
        authorize(user, selected.snapshot)
        info = file_info(db, selected.file_id)
        target = root / info.id
        if not target.is_file():
            raise HTTPException(503, 'Stored file unavailable; restore the file backup')
        payload = cipher.decrypt(target.read_bytes())
        if hashlib.sha256(payload).hexdigest() != info.sha256:
            raise HTTPException(503, 'Stored file integrity check failed')
        ext = {'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg'}[info.mime]
        audit(db, user, 'DOWNLOAD', row.data, f'Version {selected.number}')
        db.commit()
        return Response(payload, media_type=info.mime, headers={'Content-Disposition': f'attachment; filename="{row.id}-v{selected.number}.{ext}"'})

    @app.post('/api/documents', status_code=201)
    def create_document(body: CreateDocument, user=Depends(actor), db=Depends(database)):
        d = copy.deepcopy(body.document)
        validate(d)
        patient = db.get(Patient, d.get('patientId'))
        if not patient:
            raise HTTPException(422, 'Patient not found')
        if not body.fileId:
            raise HTTPException(422, 'Choose an original PDF or image before saving')
        extraction = db.get(Extraction, body.fileId)
        d.pop('extraction', None)
        if extraction:
            if user['role'] == 'front_desk':
                raise HTTPException(403, 'An OCR-processed original requires clinical staff review')
            if extraction.patient_id != patient.id:
                raise HTTPException(409, 'OCR patient selection changed; upload and process again')
            source = extraction.result
            # Confidence/provenance and source flags cannot be raised/cleared by the upload client.
            for field in ('confidenceScore', 'fieldConfidence', 'isNameMismatch', 'isBlurryWarning', 'extraction'):
                d[field] = copy.deepcopy(source[field])
            d['completenessStatus'] = 'needs_review'
        attach_handwriting(db, d, body.fileId, patient.id, user)
        d.update(id=str(uuid4()), patientRecordNo=patient.record_no, patientName=patient.data['fullName'], version=1, versionHistory=[], versionStatus='active', archived=False, uploadedAt=now(), uploadedBy=user['name'])
        authorize(user, d)
        claim_file(db, body.fileId, user)
        if user['role'] not in {'admin', 'dentist'}:
            d['completenessStatus'] = 'needs_review'
        for field in ('reviewedBy', 'reviewedAt', 'resolvedBy', 'resolvedAt', 'resolutionNote'):
            d.pop(field, None)
        attach_file(db, d, body.fileId)
        for field in ('review', 'validity'):
            d.pop(field, None)
        row = Document(id=d['id'], patient_id=patient.id, revision=1, data=d)
        db.add(row)
        db.flush()
        db.add(Version(id=str(uuid4()), document_id=d['id'], number=1, file_id=body.fileId, snapshot=d))
        audit(db, user, 'UPLOAD', d)
        sync_review(db, row, user, audit)
        db.commit()
        return safe_data({**d, 'revision': 1}, user)

    @app.patch('/api/documents/{document_id}')
    def edit_document(document_id: str, body: Mutation, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id, user)
        if row.revision != body.expectedRevision:
            raise HTTPException(409, 'Record changed. Reload before editing.')
        authorize(user, row.data, write=True)
        if body.updates.keys() - EDITABLE:
            raise HTTPException(422, 'Unsupported metadata fields')
        if row.data.get('archived'):
            raise HTTPException(409, 'Restore the archived document before editing')
        d = {**row.data, **body.updates}
        authorize(user, d, write=True, verify='completenessStatus' in body.updates)
        validate(d)
        d['displayDate'] = d['date']
        result = persist(db, row, body.expectedRevision, d)
        current = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == d['version']))
        current.snapshot = d
        audit(db, user, 'EDIT_METADATA', d, ', '.join(body.updates))
        db.refresh(row)
        sync_review(db, row, user, audit)
        db.commit()
        return safe_data(result, user)

    @app.post('/api/documents/{document_id}/print')
    def print_request(document_id: str, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id, user)
        audit(db, user, 'PRINT_REQUEST', row.data, 'Application print request; physical printing is not confirmed')
        db.commit()
        return {'ok': True}


    @app.post('/api/documents/{document_id}/{operation}')
    def action(document_id: str, operation: str, body: Mutation, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id, user)
        if row.revision != body.expectedRevision:
            raise HTTPException(409, 'Record changed. Reload before editing.')
        d = copy.deepcopy(row.data)
        authorize(user, d, write=True)
        if operation not in {'archive', 'restore-archive', 'completeness-resolution', 'versions'}:
            raise HTTPException(404, 'Unknown operation')
        if operation in {'archive', 'restore-archive'}:
            if user['role'] != 'admin':
                raise HTTPException(403, 'Only administrators can archive or restore')
            should_archive = operation == 'archive'
            if bool(d.get('archived')) == should_archive:
                raise HTTPException(409, 'Document already has that archive state')
            d.update(archived=should_archive, archivedAt=now() if should_archive else None, archivedBy=user['name'] if should_archive else None)
            event = 'ARCHIVE' if should_archive else 'RESTORE_ARCHIVE'
        elif operation == 'completeness-resolution':
            authorize(user, d, write=True, verify=True)
            if d.get('archived'):
                raise HTTPException(409, 'Restore the document first')
            if not body.note.strip():
                raise HTTPException(422, 'A staff verification note is required')
            d.update(completenessStatus='complete', missingFields=[], resolvedBy=user['name'], resolvedAt=now(), resolutionNote=body.note.strip())
            event = 'MARK_COMPLETE'
        else:
            if d.get('archived'):
                raise HTTPException(409, 'Restore the document first')
            if not body.note.strip() or body.updates.keys() - VERSION_FIELDS:
                raise HTTPException(422, 'A revision reason and supported fields are required')
            snapshot = copy.deepcopy(d)
            snapshot.update(versionNumber=d['version'], status='superseded', changeSummary=body.note, supersededAt=now(), supersededBy=user['name'])
            d.update(body.updates)
            d.update(version=d['version'] + 1, versionHistory=[snapshot, *d.get('versionHistory', [])], uploadedAt=now(), uploadedBy=user['name'], versionStatus='active')
            authorize(user, d, write=True, verify='completenessStatus' in body.updates)
            if body.fileId:
                claim_file(db, body.fileId, user)
                attach_file(db, d, body.fileId)
                d.pop('extraction', None)
                source_extraction = db.get(Extraction, body.fileId)
                if source_extraction:
                    if source_extraction.patient_id != row.patient_id or user['role'] == 'front_desk':
                        raise HTTPException(403, 'Processed original does not match this patient or role')
                    for field in ('extractedText', 'confidenceScore', 'fieldConfidence', 'isNameMismatch', 'isBlurryWarning', 'extraction'):
                        d[field] = copy.deepcopy(source_extraction.result[field])
                else:
                    d.update(extractedText='', confidenceScore=0, fieldConfidence={key: 0 for key in d['fieldConfidence']}, isNameMismatch=False, isBlurryWarning=False)
                d['completenessStatus'] = 'needs_review'
                attach_handwriting(db, d, body.fileId, row.patient_id, user)
            elif snapshot.get('fileId'):
                attach_file(db, d, snapshot['fileId'])
            else:
                d.update(fileId=None, fileType=snapshot['fileType'], fileSize=snapshot['fileSize'])
            validate(d)
            event = 'UPLOAD_VERSION'
            d.pop('reviewedBy', None)
            d.pop('reviewedAt', None)
        result = persist(db, row, body.expectedRevision, d)
        if operation == 'versions':
            db.add(Version(id=str(uuid4()), document_id=row.id, number=d['version'], file_id=d.get('fileId'), snapshot=d))
        else:
            current = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == d['version']))
            current.snapshot = d
        audit(db, user, event, d, body.note)
        db.refresh(row)
        sync_review(db, row, user, audit)
        db.commit()
        return safe_data(result, user)

    @app.post('/api/documents/{document_id}/versions/{number}/restore')
    def restore_version(document_id: str, number: int, body: Mutation, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id, user)
        if row.revision != body.expectedRevision:
            raise HTTPException(409, 'Record changed. Reload before restoring.')
        authorize(user, row.data, write=True, verify=True)
        if row.data.get('archived') or not body.note.strip():
            raise HTTPException(422, 'An active record and restore reason are required')
        target = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == number))
        if not target:
            raise HTTPException(404, 'Version not found')
        authorize(user, target.snapshot, write=True, verify=True)
        current = copy.deepcopy(row.data)
        history = {**current, 'versionNumber': current['version'], 'status': 'superseded', 'changeSummary': body.note}
        d = copy.deepcopy(target.snapshot)
        d.update(id=row.id, patientId=row.patient_id, archived=False, archivedBy=None, archivedAt=None, version=current['version'] + 1, versionStatus='active', versionHistory=[history, *current.get('versionHistory', [])], uploadedAt=now(), uploadedBy=user['name'], fileId=target.file_id)
        d.pop('reviewedBy', None)
        d.pop('reviewedAt', None)
        patient = db.get(Patient, row.patient_id)
        d.update(patientRecordNo=patient.record_no, patientName=patient.data['fullName'])
        result = persist(db, row, body.expectedRevision, d)
        db.add(Version(id=str(uuid4()), document_id=row.id, number=d['version'], file_id=target.file_id, snapshot=d))
        audit(db, user, 'RESTORE_VERSION', d, body.note)
        db.refresh(row)
        sync_review(db, row, user, audit)
        db.commit()
        return safe_data(result, user)

    install_search(app, actor, database, search, public)
    install_workflows(app, actor, database, audit, lambda db, row, user: public(row, user, db))
    return app
