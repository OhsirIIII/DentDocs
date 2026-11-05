# DentDocs — San Nicolas Dental Clinic Document Management System

DentDocs organizes dental records, retains encrypted originals, and supports
staff-reviewed transcription, search, completeness and validity workflows.

**Current status:** Phases 2–7 and Phase 8 engineering/recovery work are implemented
for a **fictional-data, loopback-only installation**. Native PDF/OCR processing is
isolated from the API. Real-patient/LAN release remains blocked by outstanding
security assessment, off-device recovery, clinic policies and release sign-off.
This project does not certify legal compliance or clinical transcription accuracy.

Resume from [SESSION_RECAP.md](SESSION_RECAP.md) and the
[dated recall](DENTDOCS_RECALL_2026-11-03.md). The implementation branch is
`codex/phase4-review-validity`; `main` has not received these changes through a merge.

## System documentation

[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) provides the seven-chapter
system report, requirements, architecture/DFD/ER/UML diagrams, complete database
dictionary, implementation evidence, recorded test results and staff/operator guide.
Academic details, approvals, screenshots and unperformed evaluations are clearly
marked for completion.

## Current engineering continuation

[November 6 recovery checkpoint](RECOVERY_CHECKPOINT_2026-11-06.md) records a fresh
encrypted backup and isolated restore matching 19 tables and 40 originals, with
source, model, configuration and actual OCR/model checks. The app is stopped.

[Handwriting candidate evaluation](HANDWRITING_EVALUATION_2026-11-06.md) extends
the existing contrast/beam experiment with robustness, numeric and timing checks.
It does not change the application reader or claim independently validated dental accuracy.

[November 6 security refresh](SECURITY_REFRESH_2026-11-06.md) records successful
advisory refresh, supported OS updates, minimum-version build checks, fresh scans
and isolated verification. Open native/OS findings still require independent review.

[November 5 results](CONTINUATION_2026-11-05.md) cover bounded handwriting/embedding
transport, validation-only recognition experiments and outstanding security work.
The promising contrast/beam candidate is not enabled in the application.
[Release preparation](RELEASE_PREPARATION.md) provides the proposed HTTPS setup and
review conditions; it is not an activated LAN deployment or release approval.

## Implemented workflows

- **Records and originals:** eight document categories, patient folders, FDI tooth
  tags (permanent teeth), editable metadata, source versions, encrypted original downloads with hash
  checks, reversible archiving and restoration. X-rays are stored/tagged; no
  diagnostic image interpretation is claimed.
- **Printed OCR:** actual local Tesseract/Poppler processing of PDF, PNG and JPEG,
  conservative field suggestions, original preview and explicit failure/manual
  entry. Up to 20 MiB per upload and ten PDF pages; complex/unreadable inputs may
  still require manual transcription. Encrypted PDFs are rejected for processing.
- **Handwriting assistance:** optional experimental TrOCR suggestions for selected
  image lines, rotation/cropping, editable text and retained source/model evidence.
  Suggestions require staff verification and have no calibrated confidence score.
- **Named review:** extraction review, completeness verification and validity are
  separate decisions. Expiry requires explicit dates or an approved rule; unknown
  validity is retained when no basis is confirmed. Checklist definitions and clinic
  policies still require clinic approval; OCR does not verify signatures.
- **Search:** keyword filters plus optional local semantic/hybrid retrieval using
  pgvector and pinned embeddings. Matches identify their source passage/version.
  Hybrid reports keyword-only fallback if the reader is unavailable; semantic-only
  requests report failure. Summaries are not separately indexed as source evidence.
- **Administrative summaries:** local extractive drafts with source quotations,
  editable text and named dentist/admin approval. Drafts are separate from accepted
  summaries; source changes invalidate prior acceptance. These are administrative
  overviews, not clinical assessments or complete transcriptions.
- **Accounts and audit:** named staff accounts, server-enforced access rules,
  temporary-password changes, versioned notice acknowledgement, CSRF/origin checks,
  session revocation and append-only database histories. Server sessions expire
  after ten idle minutes or eight hours overall. Host/database administrators remain
  privileged; append-only controls are not a cryptographic tamper-proof guarantee.

| Role | Main scope |
| --- | --- |
| Administrator | Staff management, audit console, records, verification, archive/recovery and summary decisions |
| Dentist | Active clinical/administrative records, review, completeness/validity and summary decisions |
| Dental assistant | Active records, upload, transcription and tagging; treatment-plan edits and verification are restricted |
| Front desk | Billing/appointment records and manual administrative uploads; clinical records and unclassified OCR/handwriting processing are restricted |

The initial installation creates a single administrator account, not selectable
demo personas. See [PHASE3.md](PHASE3.md) for the detailed permission matrix.

## Architecture

| Service | Responsibility |
| --- | --- |
| `web` | React/TypeScript UI served by Nginx; only published port is `127.0.0.1:8080` |
| `api` | FastAPI, staff permissions, patient matching, encrypted files, provenance and workflow persistence |
| `db` | PostgreSQL 17 with pgvector 0.8.7; schema version 7 |
| `ocr` | Dedicated native printed-text worker; no database credentials, data/model mounts or host port |
| `handwriting` | Optional private CPU service for handwriting and embeddings, with local models mounted read-only |
| `migrate` | One-shot initialization/migration and database grant setup |

Five services run with the full semantic profile; `migrate` exits after completing.
API and worker execution are bounded and use read-only root filesystems. OCR's
private network is shared only with API. The worker-to-database connection is
explicitly denied and checked. Parser-library vulnerabilities remain tracked;
isolation limits access and does not waive those findings.

Model inference and processing run locally after preparation. Initial image/package/
public-model downloads require network access. A Git clone includes source and
fictional seed data; it does **not** include the existing database, originals,
private configuration, model weights or training environment.

See [PARSER_ISOLATION.md](PARSER_ISOLATION.md),
[SECURITY_FOLLOWUP.md](SECURITY_FOLLOWUP.md) and
[SECURITY_REVIEW.md](SECURITY_REVIEW.md) for boundaries and outstanding findings.

## Start an existing prepared installation

Run from the repository folder with Docker Desktop running:

```powershell
git status --short --branch
docker compose --profile semantic up --build -d
docker compose --profile semantic ps
```

Open [DentDocs](http://127.0.0.1:8080). Preserve `.env`, all keys, the database/files
volumes and local model folders. Do not rerun first-install steps, reseed, regenerate
keys, use live `down -v`, or run a blanket Docker prune merely to resume.

For an older installation missing the private OCR setting, run
`.venv/Scripts/python.exe scripts/configure-ocr.py` first. It adds only OCR_TOKEN and
preserves existing secrets. The current development installation is already configured.

## New fictional-data installation

Prerequisites: Docker Desktop with Linux containers and Compose, Git and Python
3.12. Host Node.js 22.12+ (22.x)/npm are needed for frontend development checks; Docker builds
provide their own Node environment. The examples below use Windows PowerShell.
These steps are for a **new** checkout with no existing `.env` or clinic data.

```powershell
git clone --branch codex/phase4-review-validity https://github.com/OhsirIIII/DentDocs.git
cd DentDocs
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.lock
.venv/Scripts/python.exe scripts/create-env.py
.venv/Scripts/python.exe scripts/bootstrap-admin.py
docker compose up --build -d
```

This starts the base app with isolated printed OCR and manual transcription.
Handwriting and embeddings require separately prepared local artifacts.

Initial sign-in: `admin@dentdocs.local`. Read its generated temporary password
privately from `work/initial-admin.txt`, change it at first sign-in, then acknowledge
the current draft confidentiality notice. Use **Staff** to create named accounts.
Never publish `.env`, initial/reset passwords or recovery keys. The bootstrap script
does not reset an existing account; deleting `.env` is not account recovery.

### Enable the optional model reader

First provision the prepared handwriting checkpoint at
`work/handwriting/amr-base-run-001/trained/`. Source-only clones do not contain it;
see [training/README.md](training/README.md) for the experiment and limitations.
With those weights present:

```powershell
.venv/Scripts/python.exe scripts/configure-semantic.py
.venv/Scripts/python.exe scripts/configure-handwriting.py
docker compose --profile semantic up --build -d
```

`configure-semantic.py` downloads/hash-checks the pinned public embedding artifact
into `work/semantic/model/`. `configure-handwriting.py` requires existing local
handwriting weights and adds the separate private reader credential. Both the
`semantic` and `handwriting` profiles start the same CPU reader, which serves both
models. [PHASE6.md](PHASE6.md) and
[PHASE5_HANDWRITING.md](PHASE5_HANDWRITING.md) contain the operating details.

## Development and verification

```powershell
npm ci
npm run lint
npm run build

# Complete API suite, including real OCR via the running private worker:
docker compose run --rm --no-deps -e DENTDOCS_MIGRATE=true -v "${PWD}/backend/tests:/app/tests:ro" api python -m pytest tests -q -p no:cacheprovider

# Native/service tests in the isolated OCR image:
docker compose run --rm --no-deps -T -v "${PWD}/ocr/test_server.py:/service/test_server.py:ro" -v "${PWD}/ocr/test_native.py:/service/test_native.py:ro" ocr python -m unittest test_server test_native -q

# Operator/recovery tests; use a fresh temporary test directory:
.venv/Scripts/python.exe -m pytest scripts/tests -q --basetemp work/readme-verification -p no:cacheprovider

# Read-only live deployment boundary check:
.venv/Scripts/python.exe scripts/verify-security.py --output work/runtime-security.json
```

Run the API/service commands after starting Compose; `--no-deps` does not start the
worker. The API test suite uses disposable SQLite fixtures while real OCR calls the
private worker; it does not use the running clinic database as its test database.
Latest implementation verification: 99 API, seven worker and 25 operator/recovery
tests passed, plus browser/type/build checks. See PARSER_ISOLATION.md for evidence.

`npm run dev` serves only the frontend at `127.0.0.1:3000`. Its current Vite proxy
expects a development API at `127.0.0.1:8000`; Compose deliberately does not publish
that API port. A separate development backend/origin configuration is required.
Use the Compose app on port 8080 for the documented full working installation.

## Backup and recovery

Follow [PHASE8.md](PHASE8.md) for keygen, backup, isolated drill, verification and
cleanup commands. Current bundles encrypt the database dump, originals, `.env`,
tracked/staged source, both models and all five runtime images. Stage reviewed new
source explicitly before snapshotting. Untracked files are excluded from the source
component; unrelated `output/` and `tmp/` are also excluded from build contexts.

Keep an encrypted off-device copy and a separately custodied recovery key. GitHub
source is not a backup of the running installation. Do not put the key in the bundle
or share both together. A same-disk trial copy is not disaster recovery.

The [November 6 isolated restore](RECOVERY_CHECKPOINT_2026-11-06.md) matched 19
persisted tables and 40 registered originals, exercised recovered OCR and both
models, and retained data-store isolation. Database readiness uses the final TCP
listener and imports are transactional. This was a fresh-volume test on the same
Docker host. A physical second-machine/operator drill is still outstanding.

## Project map and documentation

| Path | Contents |
| --- | --- |
| `src/` | React UI, API client, routes and staff workflows |
| `backend/` | API, migrations, permissions, workflow logic, protocol and tests |
| `ocr/` | Minimal private printed-OCR service image and native/service tests |
| `handwriting/` | Offline CPU handwriting/embedding service and dependency lock |
| `training/` | Separate research/preparation scripts and documented experimental results |
| `scripts/` | Private setup, encrypted recovery and deployment checks |
| `deployment/` | Database image and Nginx configuration |
| `work/` | Ignored local data, weights, credentials and verification artifacts |

- [SESSION_RECAP.md](SESSION_RECAP.md): current commit, service state and next tasks.
- [PARSER_ISOLATION.md](PARSER_ISOLATION.md): current OCR architecture/setup and recovery evidence.
- [PHASE2.md](PHASE2.md), [PHASE3.md](PHASE3.md), [PHASE4.md](PHASE4.md): storage, accounts, review and validity foundations.
- [PHASE5.md](PHASE5.md), [PHASE5_HANDWRITING.md](PHASE5_HANDWRITING.md): OCR and experimental draft workflows.
- [PHASE6.md](PHASE6.md), [PHASE7.md](PHASE7.md): search and administrative summaries.
- [PHASE8.md](PHASE8.md), [SECURITY_REVIEW.md](SECURITY_REVIEW.md), [SECURITY_FOLLOWUP.md](SECURITY_FOLLOWUP.md): recovery and release/security status.
- [DESIGN.md](DESIGN.md): current interface conventions.

Older phase documents describe their implementation stage; current code, recap and
parser-isolation documentation take precedence over historical pending-feature notes.

## Remaining release work

1. Independently assess/remediate remaining parser/OS findings and document any
   applicability or risk decisions; isolation is not a clean security scan.
2. Complete off-device/second-machine recovery, key custody, approved backup
   schedule/retention, recovery targets and monitoring.
3. Approve clinic privacy/retention, roles and completeness/validity policies;
   configure approved LAN HTTPS/secure cookies and obtain explicit release sign-off.
4. Finish staff/installation guides and final requirements, design, API/ERD and
   acceptance deliverables. Validate coverage against the actual implementation.
5. Obtain verified dental labels and independent writer-disjoint evaluation before
   claiming handwriting reliability. Supplied clinic transcriptions remain drafts.

No PR merge or real-patient release is implied by a source push or this README.
