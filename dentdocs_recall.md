# DentDocs: Project Recall for Antigravity

Read this whole file first. Do NOT change any code until you have produced a plan and I have approved it.

## 1. What this project is

DentDocs is a document management system for a small dental clinic in the Philippines. It organizes, searches, and checks the completeness of patient records and administrative documents (patient records, X-rays, treatment plans, prescriptions, consent forms, lab reports, billing/receipts, appointment records).

Core ideas:
- OCR extracts text from scanned documents; documents are auto-classified and tagged (type, date, patient record number, procedure category, tooth numbers).
- Natural-language / semantic search.
- Completeness checking (missing signatures, missing required fields). AI output is ADVISORY ONLY: staff verify everything, and the system never makes clinical decisions.
- Role-based access control, audit trail, document version history, alerts for missing or expiring documents.
- Must run on the clinic's LOCAL NETWORK with no required internet connection.
- Must respect the Philippine Data Privacy Act (RA 10173): strict access control, encryption, secure backups, audit logging.

## 2. Current state: front-end prototype (built in Google AI Studio)

Stack: React + TypeScript + Tailwind CSS, running in the browser. All data is MOCK and lives in an in-memory store persisted to `localStorage`. There is no backend. OCR is a client-side simulator.

Known file structure (from the build logs; verify against the actual repo):
- `src/types/dental.ts`: types (Patient, Document, AuditEntry, versions, alerts)
- `src/context/ClinicContext.tsx`: global state store (`clinicStore`), role state, actions, audit logging
- `src/data/mockDocuments.ts`: 30 mock documents (5 deliberately incomplete, some Taglish, mixed date formats, one minor patient needing a guardian signature)
- `src/data/completenessRequirements.ts`: required fields per document type
- `src/data/clinicalAlerts.ts`: `generateClinicAlerts` rules
- `src/views/`: DashboardView, PatientsView, UploadView, DocumentViewerView, plus Search, Incomplete Documents, and Admin Audit views
- `src/components/Navbar.tsx`: top navigation, role switcher, alert counter badge
- Route `/incomplete` for the Incomplete Documents page

### Roles (demo role switcher in the header)
- **Admin**: manage users, delete documents, view the full audit log
- **Dentist**: view and edit clinical documents, tags, types, verification
- **Dental Assistant**: upload and view; cannot delete; cannot modify treatment plans
- **Front Desk**: billing documents and appointment records ONLY; shown an "Access Restricted" screen for clinical documents

### Data model (prototype)
- **Patient**: id, recordNo (PT-2026-0001 format), fullName, gender, dob, age, phone (+63 917 ...), address, emergencyContact, medicalAlerts, isMinor, guardianName
- **Document**: id, patientRecordNo, patientId, patientName, title, type, date (ISO), displayDate, toothNumbers (FDI 11-48), procedureCategory, tags, confidenceScore, fieldConfidence {type, date, toothNumbers, patient, procedure}, completenessStatus (complete | incomplete | needs_review), missingFields[], extractedText, previewType, amount (PHP), isBlurryWarning, isNameMismatch, version, versionHistory[]
- **AuditEntry**: id, timestamp, userRole, userName, action, documentTitle, details
- Document types: Patient Record, X-ray, Treatment Plan, Prescription, Consent Form, Laboratory Report, Billing/Receipt, Appointment Record
- Procedure categories: Restorative, Endodontics, Oral Surgery, Orthodontics, Prosthodontics, Periodontics, Preventive, Billing

### Features already built and working in the prototype
1. **Dashboard**: metrics (total documents, incomplete, pending review, active patients), urgent queue, recent uploads, clinical alerts banner.
2. **Patients**: searchable directory (name or PT-2026-XXXX), patient profile with medical alert badges, linked documents, alert indicators.
3. **Guided upload flow**: choose patient, drop file (PDF/JPG/PNG), about 3.5 s simulated processing in 4 named stages (Scanning text, Detecting document type, Extracting tooth numbers and dates, Checking completeness), then a REVIEW screen (preview left, extracted fields right) with per-field confidence, amber highlighting for low confidence (<85%), completeness checklist, blur warning, patient-name mismatch warning, "Send to review queue", and confirm-to-save with audit entry. Nothing saves automatically.
4. **Document viewer**: dual-pane (visual preview + metadata editor), inline tag editing, type switcher, tooth number editor, status toggle, audit history, role-gated actions.
5. **Natural-language search**: parses queries like "incomplete consent forms", "tooth 46 x-ray", "receipt over 5000"; filters for type, patient, date range, status. (Prototype uses keyword/rule parsing, not real semantic search.)
6. **Completeness checker**: required fields per document type (consent: patient name and record no, procedure, date, patient or guardian signature, dentist signature, witness; prescription: generic drug name, sig, date, dentist signature, PRC number, PTR number; and so on for the other types); Complete / Needs Review / Incomplete badges with counts like "Incomplete (4/6)"; "Incomplete Documents" page with action-needed and resolved tabs; "Mark as Resolved" requires a staff note and writes an audit entry. A visible banner reads "AI Suggestion, Staff Must Verify".
7. **Alerts**: scheduled procedure with no signed consent, expiring medical clearance (within 30 days), unsigned treatment plans, prescriptions missing PRC or PTR number. Shown on the dashboard, patient pages, patient directory, and navbar badge.
8. **Version history**: uploading a revision keeps the old version marked "Superseded", requires a change reason, supports side-by-side comparison and restore (restore creates a new version and logs RESTORE_VERSION).
9. **Admin audit log**: chronological, filterable by user and action.

### Mock data conventions
All fictional: Filipino names, +63 917 000 xxxx phones, placeholder IDs (PRC 0000000, TIN 000-000-000-000), no real clinic, dentist, or HMO names, amounts in PHP (₱), FDI tooth notation, generic drug names on prescriptions.

## 3. Prototype shortcuts that MUST NOT carry into production

- `localStorage` persistence of patient data -> move to a real database.
- Role checks happen in the UI only -> must be enforced on the SERVER for every request.
- The role switcher is a demo tool -> replace with real authentication.
- Simulated OCR and classification -> replace with real local OCR.
- Keyword "semantic" search -> replace with real embeddings search.
- No encryption, no real backups, no real session handling.

## 4. Remaining polish (NOT yet done in the prototype)

These were the last prompt before the AI Studio session ran out. Implement them properly in the real system:
- Empty states for lists, search results, and queues
- Loading states and skeletons
- Confirmation dialogs for destructive actions (delete, restore version)
- A clear privacy notice on first login (Data Privacy Act; mention who can see what; require acknowledgement and log it)
- Automatic session timeout after 10 minutes of inactivity, ENFORCED ON THE SERVER (expire the token or session), with a warning shown before logout

## 5. Target production architecture

- **Frontend**: keep the existing React + TypeScript + Tailwind UI and visual design (clinical teal/white, split-pane viewer). Replace the mock store with API calls.
- **Backend**: FastAPI (Python) or Node. REST API with server-side RBAC on every endpoint.
- **Database**: PostgreSQL (+ pgvector for embeddings later).
- **Tables**: users, roles, patients, documents, document_versions, tags, completeness_results, alerts, audit_logs.
- **File storage**: local disk with encryption at rest; uploaded files validated by type and size, renamed, and stored outside the web root.
- **OCR**: fully local (Tesseract or PaddleOCR). Classification starts rule-based; low-confidence results go to a human review queue.
- **Search**: local sentence-transformers embeddings in pgvector, combined with keyword search and filters.
- **Security**: argon2 or bcrypt password hashing, server-side session timeout, HTTPS on the LAN, append-only audit log written automatically on every view, upload, edit, download, delete, and login, no patient data in application logs.
- **Deployment**: Docker Compose, one command on a clinic server, no internet required.
- **Backups**: encrypted automatic backups with a documented, tested restore procedure.
- **Tests**: automated tests for permissions, audit logging, and completeness rules.

## 6. Antigravity working rules

1. Produce a PLAN first (phases, files affected, risks). Do not change code until I approve it.
2. One phase at a time. After each phase: run the app, run tests, summarize what changed, then wait.
3. Do not rewrite the UI from scratch; keep the current components and swap the data layer behind them.
4. Commit to Git after each working phase.
5. Never use real patient data. Seed the database from the mock data only.
6. AI output (classification, tags, completeness flags) is advisory; the UI must keep the "Staff Must Verify" wording.
7. If something is ambiguous (for example, legal required fields for consent forms, prescriptions, or official receipts), ask me instead of guessing. The clinic's dentist and accountant must confirm those checklists.

## 7. Suggested phase order and prompts

**Phase 1: Audit and plan**
> Review this front-end prototype against Sections 2 to 5 of the recall file. Produce a phased plan to convert it to the production architecture. List risks and anything in the prototype that conflicts with the Data Privacy Act. Do not change code yet.

**Phase 2: Backend and database**
> Implement the backend and PostgreSQL schema per the approved plan. Seed from the mock data. Replace the localStorage store with API calls while keeping the UI unchanged. Provide Docker Compose to run everything.

**Phase 3: Authentication, RBAC, audit log**
> Implement real login with hashed passwords, server-side role enforcement on every endpoint, a 10-minute inactivity timeout enforced on the server with a client-side warning, a first-login privacy notice with logged acknowledgement, and an append-only audit log on every document access.

**Phase 4: Polish**
> Add empty states, loading states, and confirmation dialogs for destructive actions across all screens.

**Phase 5: OCR and classification**
> Add a local OCR pipeline on upload: extract text, classify document type, extract date, patient record number, and tooth numbers, assign tags and a confidence score, and send low-confidence results to the review queue. Rule-based first.

**Phase 6: Semantic search**
> Add local embeddings in pgvector combined with keyword search and the existing filters. Test with "consent form for root canal" and "lab reports from last month".

**Phase 7: Backup, tests, security review**
> Add encrypted backups and a tested restore procedure, automated tests for permissions, audit logging, and completeness rules, then act as a security reviewer (OWASP Top 10, insecure file uploads, broken access control, sensitive data in logs) and fix the findings.
