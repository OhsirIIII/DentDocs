# Phase 2 working implementation

> Historical phase record. [PHASE3.md](PHASE3.md) supersedes the demo-account,
> authentication and database-role behavior described here.

This copy preserves the prototype interface while introducing FastAPI, SQLAlchemy,
PostgreSQL deployment, retained encrypted originals, version snapshots, revision
conflict detection, and React Router URLs. It is **mock-only and not ready for clinic data**.
The working repository is now `C:\Users\User\Documents\ChatGPT\DentDocs`, on branch
`codex/phase2-foundation`, based on main commit `b5d2607`. The original project under
`.gemini` and the remote repository were not modified. Nothing has been pushed.

## Current verification

- Exported the actual fixtures: **12 patients, 30 documents**. The supplied audit's
  count of 10 patients is inaccurate for this source copy.
- Python syntax compilation passed.
- Seed checks passed: every document links to an existing patient, patient record
  numbers agree, document IDs are unique, and both fixture histories are retained.
- The packaged patch passes `git apply --check --ignore-space-change` against a
  fresh copy of the supplied local source. The whitespace option handles its CRLF
  line endings. Review the patch before applying it to a repository with other edits.
- Dependency downloads now work through approved execution. JavaScript dependencies
  and the Python environment are installed, with regenerated dependency locks.
- `npm run lint` passed. `npm run build` passed.
- All **10 backend tests passed**, including SQLite restart persistence, revision
  conflicts, archive/search/restore, file encryption and exact byte retrieval,
  replacement originals, version restoration, and upload/metadata validation.
- Headless Edge checks against the running local API passed: direct document and
  patient URLs, refresh, browser back, demo Admin guard, unknown routes, and a real
  fictional-file selection → simulated OCR → reviewed save → exact original download
  → refresh flow. No browser exceptions occurred in those checks.
- Native Windows restricted execution could not run the API/tests reliably; approved
  execution completed them. Test state and encryption keys stay under ignored `work/`.
- Docker Desktop and WSL 2 are now running. Both Docker images built successfully,
  and the web/API/PostgreSQL stack is running at `http://127.0.0.1:8080`.
- PostgreSQL deployment checks passed: upload and exact original retrieval,
  simultaneous edits yielding one success and one 409 conflict, replacement file,
  restoration as version 3, archive/search exclusion, and archive recovery.
- Restarting all three containers preserved the database records, audit events,
  version history and both original files, with no duplicate seed records.
- Browser checks also passed against the compiled Nginx-hosted interface: direct
  URLs, refresh, browser back, Admin guard and unknown routes, without exceptions.
- Phase 2's local mock deployment acceptance checks have passed. This does not
  establish production security: Phase 3 authentication and server-side access
  control remain required before using real clinic data.

## Run on a machine with dependency access

1. Install Docker with Compose and Node 22.18+ (seed export uses Node's TypeScript
   stripping). The checked-in seed JSON is already exported; no export is needed
   unless fictional fixtures change.
2. From this folder run `npm ci` to install the locked JavaScript dependencies.
   The pre-existing esbuild range conflicted with Vite 8 and has been updated.
   `backend/requirements.lock` pins the tested Python environment; install that file
   for reproducible backend checks. `requirements.txt` records the intended ranges.
3. Run `npm run lint` and `npm run build`.
4. Run `python scripts/create-env.py`. This generates `.env` without displaying
   secrets and refuses to overwrite an existing encryption key.
5. Run `docker compose up --build` and open http://localhost:8080.
6. For backend contracts: create a Python 3.12 virtual environment, install
   `backend/requirements.lock`, then run `python -m pytest tests -q` from `backend/`.

Initial image/package downloads require internet. After preparing and retaining
images, normal mock operation is local. This phase does not claim a fully packaged
offline installer or LAN HTTPS deployment.

## Local development without Docker

Set `DENTDOCS_MODE=mock`, `DATABASE_URL=sqlite:///./mock.db`, `FILE_ROOT` to a writable
directory outside the web root, and `FILE_ENCRYPTION_KEY` to a Fernet key. Run
`uvicorn app.asgi:app --host 127.0.0.1 --port 8000` from `backend/`, then `npm run dev`
from this folder. SQLite is supported for development/contracts; PostgreSQL remains
the deployment target and must pass its own acceptance checks.

## Data and migration decisions

The initial numbered schema creates `patients`, `documents`, `document_versions`,
`document_files`, `audit_logs`, and `schema_versions`. Patient record numbers,
document ownership, version uniqueness and file links have relational constraints.
Prototype-specific metadata is retained in validated JSON snapshots rather than
discarded during conversion. Normalize the remaining planned user/role, review,
validity, summary and acknowledgement tables in their approved phases. This is an
incremental foundation, not the entire proposed production schema.

The initial additive migration uses `create_all` once; it does not alter existing
columns. Subsequent schema changes require a new numbered migration. Seeding runs
only for an empty database and never resets records from the browser. Historical
fixture versions contain partial original metadata: their snapshots inherit fields
that the prototype did not record historically. New versions retain complete snapshots.

API metadata writes compare `expectedRevision` atomically and return 409 on conflict.
New version and restore operations retain original file references. Archiving does
not delete originals; restoring a version creates a new version number. Source
fixtures have no original file and downloading them correctly returns 404.

Files are accepted by content signature (PDF/PNG/JPEG), limited to 20 MB, renamed to
UUIDs, hashed, and encrypted using Fernet. Signature checks are not malware scanning
or full format validation; processing isolation and deeper validation remain required
before production. Staged files from abandoned uploads require a later cleanup policy.

## Routes and phase boundary

Routes: `/dashboard`, `/patients`, `/patients/:patientId`, `/upload`,
`/documents/:documentId`, `/search`, `/incomplete`, `/admin/audit`.
Browser history and direct links are handled by React Router and the Nginx SPA fallback.
The Admin route and existing viewer guard are demonstration controls only.

The API intentionally requires `DENTDOCS_MODE=mock` and Compose exposes only the
web server on loopback. Demo role headers are user-controlled and are not authentication.
The bootstrap response contains fictional clinical records for all roles. No real
records may be used until Phase 3 replaces that endpoint with authenticated,
field-scoped APIs and enforces permissions on every endpoint and file access.

OCR, alerts and search retain prototype rules. Summaries, general validity policies,
review assignment, production user management, secure sessions, comprehensive access
logging, append-only audit enforcement and production backup/restore are later phases.
The existing privacy notice is a prototype acknowledgement, not a compliance certificate.

## Acceptance checks

- Check direct URLs, refresh, back/forward, unknown document IDs and Admin route guard.
- Upload a fictional PDF/image, confirm review, download and compare original bytes.
- Stop/restart Compose without deleting volumes; verify records and originals remain.
- Edit the same record from two browser tabs; the stale write must return 409.
- Archive as demo Admin; normal search must omit it; restore and verify visibility.
- Create a revision with a replacement file, then restore the first version as a new one.
- Disconnect the API and verify save failures remain visible without false success.
- Run contract tests and repeat persistence/concurrency checks against PostgreSQL.

The above deployment, persistence and concurrency checks passed on November 2,
2026. The deployment verification creates one fictional document and archives it
at the end. Its audit history remains intentionally retained.

To reproduce the deployed API checks using the project Python environment:

```powershell
.venv\Scripts\python.exe scripts\verify-deployment.py prepare
docker compose restart
.venv\Scripts\python.exe scripts\verify-deployment.py verify
```

The script refuses to test an endpoint whose health response does not explicitly
report mock mode. Do not run multiple prepare/verify sequences concurrently.

## Recovery during mock testing

Keep `.env` and the encryption key private. Back up both named volumes and `.env`
together while the stack is stopped; a database-only copy cannot recover originals,
and files without the key cannot be decrypted. Never delete volumes to troubleshoot
without an intentional reset and a verified backup. Automated encrypted backups and
a clean-machine restoration drill remain release requirements in Phase 8.

## Relevant implementation references

- FastAPI SQL database patterns: https://fastapi.tiangolo.com/tutorial/sql-databases/
- React Router declarative routing: https://reactrouter.com/7.18.5/start/declarative/installation
