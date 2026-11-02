"""Phase 2 mock-only API. Demo personas are not authentication."""
import copy
import hashlib
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from cryptography.fernet import Fernet
from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, update

from .database import make_database, migrate, Patient, Document, FileRecord, Version, Audit

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


def validate(data):
    if data.get('type') not in TYPES or data.get('procedureCategory') not in PROCEDURES:
        raise HTTPException(422, 'Unknown document type or procedure category')
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
        raise RuntimeError('Phase 2 starts only with DENTDOCS_MODE=mock. Authentication is not implemented.')
    engine, sessions = make_database(database_url)
    root = Path(file_root or os.environ['FILE_ROOT']).resolve()
    cipher = Fernet(encryption_key or os.environ['FILE_ENCRYPTION_KEY'])
    seed_file = Path(seed_path or Path(__file__).parents[1] / 'seed' / 'mock.json')
    seed = json.loads(seed_file.read_text(encoding='utf-8'))

    @asynccontextmanager
    async def lifespan(app):
        root.mkdir(parents=True, exist_ok=True)
        migrate(engine)
        with sessions() as db:
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
        yield
        engine.dispose()

    app = FastAPI(title='DentDocs Phase 2 — mock data only', lifespan=lifespan)
    app.state.engine = engine

    def database():
        with sessions() as db:
            yield db

    def actor(x_demo_role: str = Header(default='dentist')):
        if x_demo_role not in seed['users']:
            raise HTTPException(400, 'Unknown demo persona')
        return seed['users'][x_demo_role]

    def audit(db, user, action, doc=None, details=''):
        key = str(uuid4())
        db.add(Audit(id=key, data=dict(id=key, timestamp=now(), userId=user['id'], userName=user['name'], userRole=user['role'], action=action, targetType='DOCUMENT' if doc else 'SYSTEM', targetId=doc['id'] if doc else user['id'], targetTitle=doc['title'] if doc else 'Demo session', details=details)))

    def get_doc(db, document_id):
        doc = db.get(Document, document_id)
        if not doc:
            raise HTTPException(404, 'Document not found')
        return doc

    def public(doc):
        return {**doc.data, 'revision': doc.revision}

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

    @app.middleware('http')
    async def no_cache(request, call_next):
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.get('/api/health')
    def health(db=Depends(database)):
        db.execute(select(Patient.id).limit(1))
        return {'status': 'ok', 'mode': 'mock', 'authentication': False}

    @app.get('/api/bootstrap')
    def bootstrap(db=Depends(database)):
        return {'patients': [p.data for p in db.scalars(select(Patient))], 'documents': [public(d) for d in db.scalars(select(Document))], 'auditLogs': [a.data for a in db.scalars(select(Audit))], 'users': seed['users']}

    @app.get('/api/documents/{document_id}')
    def read_document(document_id: str, db=Depends(database)):
        return public(get_doc(db, document_id))

    @app.post('/api/documents/search')
    def search(body: dict, db=Depends(database)):
        query = str(body.get('query', '')).strip().lower()
        filters = body.get('filters') or {}
        synonyms = {'reseta': 'Prescription', 'prescription': 'Prescription', 'gamot': 'Prescription', 'xray': 'X-ray', 'radiograph': 'X-ray', 'opg': 'X-ray', 'billing': 'Billing/Receipt', 'receipt': 'Billing/Receipt', 'resibo': 'Billing/Receipt', 'consent': 'Consent Form', 'pahintulot': 'Consent Form'}
        results = []
        for row in db.scalars(select(Document)):
            d = public(row)
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
    async def upload_file(file: UploadFile, db=Depends(database)):
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
            db.commit()
        except Exception:
            target.unlink(missing_ok=True)
            raise
        return {'id': key, 'size': len(payload), 'mime': mime}

    @app.get('/api/documents/{document_id}/file')
    def download_file(document_id: str, version: int | None = None, db=Depends(database)):
        row = get_doc(db, document_id)
        selected = db.scalar(select(Version).where(Version.document_id == document_id, Version.number == (version or row.data['version'])))
        if not selected or not selected.file_id:
            raise HTTPException(404, 'This fictional fixture has no original file')
        info = file_info(db, selected.file_id)
        target = root / info.id
        if not target.is_file():
            raise HTTPException(503, 'Stored file unavailable; restore the file backup')
        payload = cipher.decrypt(target.read_bytes())
        if hashlib.sha256(payload).hexdigest() != info.sha256:
            raise HTTPException(503, 'Stored file integrity check failed')
        ext = {'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg'}[info.mime]
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
        d.update(id=str(uuid4()), patientRecordNo=patient.record_no, patientName=patient.data['fullName'], version=1, versionHistory=[], versionStatus='active', archived=False, uploadedAt=now(), uploadedBy=user['name'])
        attach_file(db, d, body.fileId)
        db.add(Document(id=d['id'], patient_id=patient.id, revision=1, data=d))
        db.flush()
        db.add(Version(id=str(uuid4()), document_id=d['id'], number=1, file_id=body.fileId, snapshot=d))
        audit(db, user, 'UPLOAD', d)
        db.commit()
        return {**d, 'revision': 1}

    @app.patch('/api/documents/{document_id}')
    def edit_document(document_id: str, body: Mutation, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id)
        if row.revision != body.expectedRevision:
            raise HTTPException(409, 'Record changed. Reload before editing.')
        if body.updates.keys() - EDITABLE:
            raise HTTPException(422, 'Unsupported metadata fields')
        if row.data.get('archived'):
            raise HTTPException(409, 'Restore the archived document before editing')
        d = {**row.data, **body.updates}
        validate(d)
        d['displayDate'] = d['date']
        result = persist(db, row, body.expectedRevision, d)
        current = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == d['version']))
        current.snapshot = d
        audit(db, user, 'EDIT_METADATA', d, ', '.join(body.updates))
        db.commit()
        return result

    @app.post('/api/documents/{document_id}/{operation}')
    def action(document_id: str, operation: str, body: Mutation, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id)
        if row.revision != body.expectedRevision:
            raise HTTPException(409, 'Record changed. Reload before editing.')
        d = copy.deepcopy(row.data)
        if operation not in {'archive', 'restore-archive', 'completeness-resolution', 'versions'}:
            raise HTTPException(404, 'Unknown operation')
        if operation in {'archive', 'restore-archive'}:
            if user['role'] != 'admin':
                raise HTTPException(403, 'Only the demo Admin can archive or restore')
            should_archive = operation == 'archive'
            if bool(d.get('archived')) == should_archive:
                raise HTTPException(409, 'Document already has that archive state')
            d.update(archived=should_archive, archivedAt=now() if should_archive else None, archivedBy=user['name'] if should_archive else None)
            event = 'ARCHIVE' if should_archive else 'RESTORE_ARCHIVE'
        elif operation == 'completeness-resolution':
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
            if body.fileId:
                attach_file(db, d, body.fileId)
            elif snapshot.get('fileId'):
                attach_file(db, d, snapshot['fileId'])
            else:
                d.update(fileId=None, fileType=snapshot['fileType'], fileSize=snapshot['fileSize'])
            validate(d)
            event = 'UPLOAD_VERSION'
        result = persist(db, row, body.expectedRevision, d)
        if operation == 'versions':
            db.add(Version(id=str(uuid4()), document_id=row.id, number=d['version'], file_id=d.get('fileId'), snapshot=d))
        else:
            current = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == d['version']))
            current.snapshot = d
        audit(db, user, event, d, body.note)
        db.commit()
        return result

    @app.post('/api/documents/{document_id}/versions/{number}/restore')
    def restore_version(document_id: str, number: int, body: Mutation, user=Depends(actor), db=Depends(database)):
        row = get_doc(db, document_id)
        if row.revision != body.expectedRevision:
            raise HTTPException(409, 'Record changed. Reload before restoring.')
        if row.data.get('archived') or not body.note.strip():
            raise HTTPException(422, 'An active record and restore reason are required')
        target = db.scalar(select(Version).where(Version.document_id == row.id, Version.number == number))
        if not target:
            raise HTTPException(404, 'Version not found')
        current = copy.deepcopy(row.data)
        history = {**current, 'versionNumber': current['version'], 'status': 'superseded', 'changeSummary': body.note}
        d = copy.deepcopy(target.snapshot)
        d.update(id=row.id, patientId=row.patient_id, archived=False, archivedBy=None, archivedAt=None, version=current['version'] + 1, versionStatus='active', versionHistory=[history, *current.get('versionHistory', [])], uploadedAt=now(), uploadedBy=user['name'], fileId=target.file_id)
        result = persist(db, row, body.expectedRevision, d)
        db.add(Version(id=str(uuid4()), document_id=row.id, number=d['version'], file_id=target.file_id, snapshot=d))
        audit(db, user, 'RESTORE_VERSION', d, body.note)
        db.commit()
        return result

    @app.post('/api/demo/session-events')
    def session_event(body: dict, user=Depends(actor), db=Depends(database)):
        event = body.get('action')
        if event not in {'USER_LOGIN', 'PRIVACY_ACK'}:
            raise HTTPException(422, 'Unsupported demo session event')
        audit(db, user, event, details='Prototype event; not an authenticated session')
        db.commit()
        return {'ok': True}

    return app
