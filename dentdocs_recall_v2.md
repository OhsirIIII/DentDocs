# DentDocs: Project Recall v2 (supersedes dentdocs_recall.md)

Read this whole file first. Do NOT change any code until you have produced a plan and I have approved it.

Where this file conflicts with `dentdocs_recall.md`, THIS FILE wins. Where this file conflicts with the actual code, `dentdocs_audit.md`, or `dentdocs_polish_changes.md`, the CODE and those two files win. Tell me about any conflict you find.

---

## 1. What this project is

DentDocs is a document management and clinical completeness system for **San Nicolas Dental Clinic**, a community dental practice in the Philippines. It organizes, searches, and checks the completeness of patient records and administrative documents: patient records, X-rays, treatment plans, prescriptions, consent forms, laboratory reports, billing/receipts, and appointment records.

Core ideas:
- OCR extracts text from scanned documents; documents are auto-classified and tagged (type, date, patient record number, procedure category, tooth numbers in FDI notation 11-48).
- AI-powered semantic search with natural-language queries ("Find the consent form for a root canal", "Show dental laboratory reports from last month").
- Completeness checking (missing signatures, missing required fields). **AI output is advisory only.** Staff verify everything and the system never makes clinical decisions. The UI keeps the "AI Suggestion, Staff Must Verify" wording.
- Role-based access control, audit trail, document version history, alerts for missing or expiring documents.
- Must run on the clinic's LOCAL NETWORK with no required internet connection.
- Must respect the Philippine Data Privacy Act (RA 10173): strict access control, encryption, secure backups, audit logging.
- Branding: San Nicolas Dental Clinic logo mark, **navy and warm gold** tokens, Plus Jakarta Sans typography (this replaces the earlier teal/white theme).

## 2. Current state: front-end prototype (React + TypeScript + Tailwind, running on localhost)

All data is MOCK. State is held in an in-memory store persisted to `localStorage`. There is no backend. OCR is a client-side simulator. The UI uses in-memory view switching, **not React Router**, so there are no real URLs (the earlier mention of a `/incomplete` route was inaccurate).

### Source of truth for details
- `dentdocs_audit.md`: actual file structure, actual data model (field names differ from the old recall, for example `documentType`, `recordNo`, `procedureCategory`; `previewType` does not exist; extra fields such as `radiographDetails`, `prescriptionDetails`, `fdiTreatedTeeth` were added).
- `dentdocs_polish_changes.md`: everything added in the polish pass (empty states, skeletons, `ConfirmDialog`, soft delete, privacy notice, inactivity timer, `clinicApi.ts` async layer, archive vault).

### Roles (demo role switcher in the header)
- **Admin**: user management, document archive (soft delete) and restore, full audit log.
- **Dentist**: view and edit clinical documents, tags, types, verification. **Cannot delete or archive.**
- **Dental Assistant**: upload and view; cannot delete; cannot modify treatment plans.
- **Front Desk**: billing documents and appointment records ONLY; sees an "Access Restricted" screen for clinical documents.

### Features built in the prototype (UI level only)
1. Dashboard: metrics, urgent queue, recent uploads, clinical alerts banner.
2. Patients: searchable directory (name or PT-2026-XXXX), profiles with medical alerts, linked documents, FDI tooth chart.
3. Guided upload: choose patient, drop file, simulated 4-stage processing, review screen with per-field confidence (low confidence below 85% highlighted amber), completeness checklist, blur warning, patient-name mismatch warning, "Send to review queue", confirm-to-save.
4. Document viewer: dual-pane preview and metadata editor, tags, type switcher, tooth editor, status toggle, audit history.
5. Natural-language search (rule/keyword based, not real semantic search) plus filters.
6. Completeness checker with required fields per document type, Complete / Needs Review / Incomplete badges, Incomplete Documents page, "Mark as Resolved" requiring a staff note.
7. Alerts: scheduled procedure without signed consent, expiring medical clearance (30 days), unsigned treatment plans, prescriptions missing PRC or PTR number.
8. Version history: superseded versions, change reason, side-by-side comparison, restore creating a new version.
9. Admin audit log with filters.
10. Polish pass: empty states, loading skeletons, styled confirmation dialogs, Admin-only soft delete with restore vault, RA 10173 privacy notice with acknowledgement, 10-minute inactivity timer with warning.

### Mock data conventions
All fictional: Filipino names, +63 917 000 xxxx phones, placeholder IDs (PRC 0000000, TIN 000-000-000-000), no real dentist or HMO names, amounts in PHP (₱), generic drug names on prescriptions. **Never put real patient data into the prototype or into any cloud AI tool.** Seed the real database from mock data only until the clinic approves real data entry.

## 3. Prototype shortcuts that MUST NOT carry into production

| Prototype behavior | Production requirement |
|---|---|
| `localStorage` holds patient data | PostgreSQL database; no patient data in the browser |
| Role checks only in the UI | Server-side permission check on every endpoint |
| Demo role switcher | Real login (hashed passwords) |
| Inactivity timer downgrades the user to Front Desk | Server-enforced logout; password required again; audit action `SESSION_TIMEOUT` (currently logged as `USER_LOGIN`) |
| Privacy acknowledgement stored in `sessionStorage` | Stored server-side per user, with timestamp and notice version |
| Audit log lives in editable browser state ("tamper-evident" wording is not accurate yet) | Append-only server-side log; no update or delete permissions for any app role |
| Simulated OCR / classification | Local OCR (Tesseract or PaddleOCR) with a human review queue |
| Keyword "semantic" search | Local embeddings in pgvector plus keyword search |
| In-memory view switching | React Router with real URLs and route guards |
| No encryption or backups | Encryption at rest, HTTPS on the LAN, encrypted backups with a tested restore |
| Privacy notice text written by AI | Must be reviewed and approved by the clinic's Data Protection Officer or legal adviser |

## 4. Gap analysis: what is still missing against the original project description

| Item | Status |
|---|---|
| Patient-linked documents, completeness checks, alerts, version history | Done (prototype) |
| Audit trail, RBAC, privacy notice, soft delete | UI only; not enforced and not tamper-proof |
| OCR, auto-classification, semantic search | Simulated; real versions are Phases 5 and 6 |
| Local network deployment, encryption, real login | Not started (Phases 2 and 3) |
| Backup and recovery | Not started (Phase 7) |
| **Human-verified document summaries for administrative use** | **Not built and missing from earlier phases** |
| **Admin user management** (create, disable, reset password, assign role) | Requested originally; verify whether it exists beyond a static permissions list |
| **Review queue page** for low-confidence and mismatched documents | A "Send to review queue" button exists; verify whether a queue page exists |
| **Expired-document alerts** | Only clearance expiry exists; validity rules for other documents are undefined |
| **Audit logging of views, downloads, and prints** | Verify; "retrieved" must be logged, not just edits |
| React Router and real URLs | Not present |
| Documentation deliverables (Section 9) | Not started |

## 5. Target production architecture

- **Frontend**: keep the existing React + TypeScript + Tailwind UI and design; replace the mock store with API calls through the existing async layer (`clinicApi.ts`). Add React Router.
- **Backend**: FastAPI (Python) or Node. REST API with server-side RBAC on every endpoint. Recommend one and explain why.
- **Database**: PostgreSQL (+ pgvector later).
- **Tables**: users, roles, patients, documents, document_versions, tags, completeness_results, alerts, review_queue, summaries, acknowledgements, audit_logs (archived/soft-delete fields on documents).
- **File storage**: local disk with encryption at rest; uploads validated by type and size, renamed, and stored outside the web root.
- **OCR**: fully local; rule-based classification first; low confidence goes to a human review queue.
- **Search**: local sentence-transformers embeddings in pgvector combined with keyword search and filters.
- **Summaries**: generated locally, labeled as a DRAFT, saved only after a named staff reviewer approves them.
- **Security**: argon2 or bcrypt, server-side session timeout, HTTPS on the LAN, append-only audit log on every view, download, print, upload, edit, archive, restore, login, logout, and timeout; no patient data in application logs.
- **Deployment**: Docker Compose, one command on a clinic server, no internet required.
- **Backups**: encrypted automatic backups with a documented and tested restore procedure.
- **Tests**: automated tests for permissions, audit logging, and completeness rules.

## 6. Antigravity working rules

1. Produce a PLAN first (phases, files affected, risks). Do not change code until I approve it.
2. One phase at a time. After each phase: run the app, run tests, summarize what changed, list anything you could not verify, then wait.
3. Do not rewrite the UI from scratch; keep current components and swap the data layer behind them.
4. Commit to Git after each working phase.
5. Never use real patient data.
6. AI output is advisory; keep "Staff Must Verify" wording in the UI.
7. If something is ambiguous (legal required fields for consent forms, prescriptions, or official receipts; record retention periods; privacy notice wording), ask me instead of guessing. The clinic's dentist, accountant, and Data Protection Officer must confirm those.

## 7. Phase order

1. **Phase 1: Audit and plan** (planning only; prompt below)
2. **Phase 2: Backend and database** (API, schema, seed from mock data, Docker Compose, React Router)
3. **Phase 3: Authentication, RBAC, audit log** (real login, server-side roles, server-enforced timeout, stored privacy acknowledgement, append-only audit log including views, downloads, and prints, admin user management)
4. **Phase 4: Review queue and validity rules** (review queue page, expiry rules for documents)
5. **Phase 5: OCR and classification** (local OCR, classification, confidence, review queue integration)
6. **Phase 6: Semantic search** (pgvector embeddings plus keyword search and filters)
7. **Phase 7: Document summaries** (local, draft, human approval required)
8. **Phase 8: Backup, tests, security review** (encrypted backups, restore test, automated tests, OWASP Top 10 review)

Do not start OCR or semantic search until Phases 2 and 3 are working, because they depend on the backend.

## 8. Phase 1 prompt (send this first)

> The front-end prototype is complete. Read dentdocs_recall_v2.md, dentdocs_audit.md, and dentdocs_polish_changes.md. Do Phase 1: planning only. Do not change code.
>
> Produce a phased plan to convert this prototype to the production architecture in Section 5. Include:
> 1. Adding React Router with real URLs and route guards.
> 2. Backend choice (FastAPI or Node) with a recommendation and reasons, and the PostgreSQL schema derived from the actual types in src/types/dental.ts, including soft delete, versions, alerts, review queue, summaries, privacy acknowledgements, and audit logs.
> 3. How the functions in clinicApi.ts and the ClinicContext store map to API endpoints.
> 4. Every prototype shortcut in Section 3 and how it will be replaced.
> 5. Also include: (a) an admin user-management screen (create, disable, reset password, assign role), (b) a review queue page for low-confidence and mismatched documents, (c) human-verified document summaries for administrative use (generated locally, labeled as a draft, requiring a staff reviewer's approval before being saved), (d) audit logging of views, downloads, and prints, (e) defined validity rules for expiring documents.
> 6. Risks and anything that conflicts with the Philippine Data Privacy Act.
> 7. A numbered list of phases, each with deliverables and how I can test it.
> 8. A list of questions you need me to answer (retention rules, number of staff, server hardware, and so on).
>
> Wait for my approval before making any changes.

## 9. Project documentation and deliverables checklist

- [ ] Project Proposal
- [ ] Software Requirements Specification (SRS)
- [ ] Use Case Diagram and User Stories
- [ ] System Architecture Diagram
- [ ] Entity Relationship Diagram (ERD), derived from the Phase 1 schema
- [ ] UI/UX Wireframes and Design Guidelines (use prototype screenshots)
- [ ] Software Design Document (SDD)
- [ ] API Documentation
- [ ] README and Installation Guide
- [ ] Test Plan and Test Cases
- [ ] Deployment and Backup Guide
- [ ] User Manual

Many of these (SRS, use cases, wireframes, proposal) can be drafted now from the prototype and this file; the ERD, API docs, and deployment guide wait for Phases 1 to 3.
