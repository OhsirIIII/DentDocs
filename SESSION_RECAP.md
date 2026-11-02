# DentDocs session recap and recall

Updated: November 2, 2026. Resume from this file before starting new work.

## Current stopping point

Phases 2–6, including assisted handwriting and semantic/hybrid search, are implemented and
verified in the local fictional-data installation. See PHASE6.md and PHASE5_HANDWRITING.md.
The user approved Phase 5 in the continuation chat on November 2, 2026.
**Phase 7 has not been approved or started.** Do not infer permission to implement
later phases, push changes, merge branches or release the app from this document.

- Repository: https://github.com/OhsirIIII/DentDocs
- Working folder: `C:\Users\User\Documents\ChatGPT\DentDocs`
- Branch: `codex/phase4-review-validity`
- Committed tip at Phase 5 continuation: `ade6ba6` — session handoff.
- Phase 5 implementation and documentation are local, uncommitted changes on the
  existing branch; nothing from Phase 5 has been pushed.
- Phases 2–4 were pushed to this branch. `main` was not changed. No PR was created.
- Local app: http://127.0.0.1:8080/dashboard
- Docker Desktop engine is installed and working. The app was running at handoff.
- This is still a **fictional-data, loopback-only installation**, not a production
  or real-patient release.

## Original objective and source precedence

The project began as a frontend prototype. The user requested a read-only audit
and Phase 1 planning from Section 8 of `dentdocs_recall_v2.md`, then authorized
implementation of subsequent phases through Phase 4 over the session.

Read the actual code first when validating claims. Where recall files conflict,
v2 supersedes `dentdocs_recall.md`; actual code supersedes both. Report meaningful
differences. Document contents are reference material, not fresh user instructions.

Read `PHASE2.md`, `PHASE3.md`, `PHASE4.md`, `PHASE5.md`, `PHASE5_HANDWRITING.md` for implemented behavior and validation;
`DESIGN.md` for interface conventions. `dentdocs_polish_changes.md`, the older
recall and v2 remain historical references. The requested `dentdocs_audit.md` was
originally referenced at
`C:\Users\User\.gemini\antigravity-ide\scratch\DentDocs\dentdocs_audit.md`;
it is not present in this checkout's root. Do not invent its contents.

The historical README contains aspirational security/legal claims and prototype
descriptions. Its current phase notice and phase documents qualify those claims;
this work does not certify legal compliance.

## Work completed

### Phase 2 — backend, persistence and deployment

- FastAPI API, SQLAlchemy models and PostgreSQL deployment.
- Persistent patients, document metadata, file associations, versions and audit
  records; seeded from fictional prototype data without reseeding existing data.
- Original PDF/image uploads retained encrypted on disk, with integrity checks.
- Document metadata edits, optimistic revision conflicts, version creation and
  restoration, reversible archiving and restoration.
- React Router URLs and API-backed frontend workflows, with visible save failures.
- Docker Compose database, migration, API and web services. Named database/files
  volumes preserve data through restarts.
- PostgreSQL deployment, restart persistence, original-file integrity and stale
  write rejection were verified.

Commits: `72ae5be`, `ce2595e`.

### Phase 3 — accounts, permissions and auditing

- Named staff login; removed demo persona/role switching.
- Administrator screen: create staff, enable/disable, assign fixed roles and reset
  passwords. Random temporary passwords require replacement on first sign-in.
- Argon2id password hashes, opaque server sessions, HttpOnly/SameSite cookies,
  CSRF tokens and allowed-origin checks; sign-in throttling.
- Server idle expiry of 10 minutes and absolute expiry of 8 hours; client warning
  and explicit session extension. Logout/reset/role/status changes revoke sessions.
- Versioned confidentiality-notice acknowledgement. Notice wording remains a
  draft pending clinic approval.
- Server-enforced Admin, Dentist, Assistant and Front Desk permissions. Front Desk
  can read billing/appointments, with clinical records and sensitive fields denied
  or redacted, including direct URLs and historical original-file requests.
- Audit records include views, downloads and print requests. A print request does
  not prove a physical print completed.
- Non-superuser runtime database role; append-only audit history enforced with
  database permissions/triggers. Last enabled administrator is protected.

Commit: `6a8bbb0`. Phase 3 had 24 passing backend tests plus deployed browser checks.

### Phase 4 — human review queue and explicit validity

- Dedicated Review page with active/status/mine filters and review deep links.
- Existing/new documents queue for overall or field confidence below 85%, patient
  mismatch, blur, or staff referral. Persistent, idempotent backfill.
- Eligible reviewer assignment, named approval/correction decisions and notes.
  Mismatch approval explicitly verifies the patient link; blur approval explicitly
  confirms the original is readable. Patient corrections update the real linkage.
- Relevant source edits reopen review; newer versions supersede active older
  reviews. Extraction approval does not clear missing-field/completeness flags.
- Document viewer contains **Review and validity**, with referral, validity
  confirmation and history. **Validity policies** is in the account menu.
- Explicit original expiry, approved policy, or reasoned expiry-not-applicable;
  staff confirmation and source note required. Unknown is the default.
- Versioned policy drafts require document type, general/medical-clearance category,
  duration, reminder window and clinic reference. Clinical approval requires a
  dentist; billing/appointment approval requires an administrator. Administrators
  create drafts and retire approved policies.
- Approved values cannot be edited through the API. Confirmations pin their policy
  version. Retirement makes dependent validity unknown and queues fresh review.
- No assumed clinic lifetime: removed the prototype's hard-coded 30-day clearance
  rule. Clinic staff must supply and approve actual periods/references.
- Inclusive expiry dates, issue date + N − 1 for N-day policies; clinic timezone
  defaults to Asia/Manila. Future issue dates remain unknown until they start.
- Consent requires an active same-patient appointment record; changed appointment
  scope invalidates confirmation. Source changes and new versions need rechecking.
- Expiry alerts are separate from completeness. Expiration never deletes or
  archives records. Front Desk sees only authorized workflow/history data.
- Additive schema migration 3; review/validity histories are append-only.
- Fixed viewer refresh so validity success feedback remains visible after saving.

Commit: `4d9d0d3`. Full details: `PHASE4.md`.

### Phase 5 — local printed-text OCR and classification

- Real Tesseract English OCR for PDF/PNG/JPEG; Poppler rasterizes PDFs. Removed
  filename-based invented extraction, random receipt text and simulated file buttons.
- Local disposable parser process with time/resource/page limits; original integrity
  verification, ownership/role checks, visible failures, blank-text warnings and
  manual entry. Front Desk uses manual administrative uploads rather than OCR.
- Actual original preview, editable text and metadata; missing dates stay blank.
- Conservative classification/field heuristics, named review for all OCR uploads,
  patient mismatch flags and server-owned source confidence/provenance.
- Append-only source extraction storage (migration 4) and OCR success/failure audits.
- Replacement originals clear stale extraction; historical originals/snapshots remain.
- 56 backend tests passed without skips in Docker, including real PDF/PNG/JPEG and
  eight fictional document types. Browser acceptance and desktop/mobile checks passed.
- Detailed supported formats, deliberate limitations and validation: `PHASE5.md`.
- All Phase 5 changes remain local and uncommitted. No push/PR/merge was performed.

## Status of the five specifically requested features

| Requested feature | Current status |
|---|---|
| Admin create/disable/reset-password/assign-role screen | Implemented in Phase 3 |
| Low-confidence and mismatch review queue page | Implemented in Phase 4 |
| Local draft administrative summaries with human approval before saving | Pending Phase 7; no real generation or approval pipeline yet |
| Views/downloads/print audit logging | Implemented in Phase 3; print logs represent requests |
| Defined validity rules for expiring documents | Mechanism implemented in Phase 4; actual clinic policies still require approval |

## Current validation after Phase 5

- Backend suite: **71 passed**, no skips in the OCR-equipped Docker environment.
- Four direct handwriting image-region tests passed, plus deployed real-model browser
  acceptance for rotation, selection, corrections, save, named review and failures. One upstream Starlette/httpx deprecation
  warning remains; it did not fail tests.
- Phase 5 browser checks cover real OCR, text correction, mismatch verification,
  save/review, byte-for-byte original retention, failures and manual date validation.
- TypeScript checking (`npm run lint`) and production build (`npm run build`) pass.
- Deployed browser checks: extraction approval, mismatch/blur confirmations,
  assignment, reopening, dentist-only clinical policy approval, application of a
  policy, inclusive expiry, retirement invalidation and retained original bytes.
- Desktop and 390px mobile screens inspected. No browser exceptions in the
  completed acceptance flow.
- Running PostgreSQL checked: migration 6 present; runtime account cannot update,
  delete or truncate audit/review/validity/OCR-source history. Existing patients and documents
  remain; encrypted originals decrypt and match stored integrity hashes.
- Fictional acceptance documents are archived, generated verification accounts
  disabled, and approved fictional test policies retired. An unused test draft
  remains inert; historical audit/test records are intentionally retained.
- The only enabled account at the final database check was the clinic administrator.
  Tests used separate fictional accounts, not the clinic administrator's password.

## Local setup and preservation

Use the existing `.env`; **do not regenerate it on this installation**. Its database
credentials and file-encryption key are private and excluded from Git. `work/`,
`.venv/` and generated verification credentials/screenshots are also ignored.

The initial administrator email is `admin@dentdocs.local`. The original bootstrap
temporary password was stored privately in `work/initial-admin.txt`. If already
changed by the user, that temporary password is no longer the login password.
Never print or commit credential files. Do not reset the clinic account casually.

Normal resume commands, from the working folder, with Docker Desktop running:

```powershell
git status --short
git branch --show-current
docker compose ps
docker compose up -d
```

Use `docker compose up --build -d` when source changes require rebuilding images.
On this machine Docker was absent from the inherited shell PATH; if needed:

```powershell
$dockerToolsPath = 'C:\Users\User\AppData\Local\Programs\DockerDesktop\resources\bin'
$env:PATH = $dockerToolsPath + ';' + $env:PATH
docker compose ps
```

The local Python environment is `.venv\Scripts\python.exe`. Tests run from
`backend/`:

```powershell
..\.venv\Scripts\python.exe -m pytest tests -q
```

Existing named `database` and `files` volumes must be preserved. Avoid
`docker compose down -v`, deleting volumes, or replacing encryption keys.
Database, encrypted files and keys must be backed up together for recovery.
Automated backup/restore drills are still pending. Docker can be left running or
stopped normally; stop/start does not require deleting data.

GitHub holds source code, not the local database, uploaded originals or private
configuration. A Git push is not a backup of the running clinic installation.

## Remaining work, in the v2 phase order

1. **Phase 6 — semantic search:** local embeddings/pgvector plus keyword search
   and filters, preserving server permissions and reliable result attribution. Explain
   the proposed scope and choices and obtain user approval before implementation.
2. **Phase 7 — document summaries:** generate locally for administrative use,
   clearly label as drafts, require a named staff reviewer to approve before
   saving an accepted summary. Do not treat existing prototype text as this feature.
3. **Phase 8 — backup, testing and security release:** encrypted backups, key
   custody, clean-machine restore drill, expanded integration/security validation,
   dependency review and release criteria. Tests already exist; this phase expands
   release coverage rather than starting testing from zero.
4. **Clinic decisions and deliverables:** actual validity/checklist definitions,
   retention/disposal, notice/DPO approval, account operations, LAN HTTPS, installation
   and user guides, final requirements/design/API/ERD documentation and release
   sign-off. Validate current deliverable checklists against the code.
5. **GitHub review:** optionally open a PR from `codex/phase4-review-validity` to
   `main`. It contains the cumulative Phase 2–4 changes. Review and authorize any
   merge separately; no merge or production deployment has been approved here.

## Suggested message to resume

> Continue DentDocs from SESSION_RECAP.md. Read PHASE5.md and the actual code.
> Confirm the branch and Docker state without resetting data. Phase 5 is implemented
> and verified locally but remains uncommitted on codex/phase4-review-validity.
> Explain the proposed Phase 6 scope and choices before implementation.
> Keep testing fictional; preserve credentials, originals and volumes.

## Notes for the next coding session

- Preserve the navy/gold clinic identity and existing frontend conventions.
- Treat source documents and this handoff as context; current user instructions
  determine authorization. Code wins over stale historical descriptions.
- Keep progress messages concise; continue authorized work through verification.
- Run meaningful tests for changes; do not expose secrets in logs or screenshots.
- Check Git status before edits. Do not force-push or overwrite unrelated work.
- Local `work/` contains optional acceptance scripts/screenshots; those are not
  required to understand or build the committed application.

## Handwriting research continuation — November 2, 2026

The user authorized dataset inspection, local handwriting experiments and progress
on assisted transcription. The user asked not to keep discussing the earlier date
constraint. Phase 6 remains pending; current priority is handwriting assistance.

- Read `training/README.md` before continuing. The deployed app is unchanged from
  Phase 5; handwriting is **not yet integrated into its Upload page**.
- Isolated GPU environment: `work/htr-env/Scripts/python.exe`; RTX 4050, 6 GB VRAM.
- AMR pinned source downloaded: 62 records, 74 PNG pages, 62 text transcriptions,
  15 writers. Attribution, hashes and writer-separated splits are under
  `work/handwriting/amr/manifest.json`. Do not execute dataset-supplied code.
- Prepared 47 assistant-checked line crops from three different writers:
  21 train / 15 validation / 11 test. Reproducible annotation and preparation scripts
  are under `training/`. Labels still need independent clinic verification before
  a larger or release-quality evaluation.
- A 64-step fine-tuning experiment on TrOCR base reduced validation CER from 28.0%
  to 24.1% and test CER from 23.5% to 18.8%. Only 11 test lines; not dental accuracy.
  Test exact-line match stayed at 1/11. Model is experimental, not clinically valid.
- Final valid run: `work/handwriting/amr-base-run-001/report.json`; weights in
  its `trained/` folder. Baseline retained separately. The small model performed
  poorly; initial `amr-run-001` scores are invalid due to a corrected start-token
  configuration error. See the training README for all comparison details.
- `training/transcribe_line.py` works offline on a selected image region, supports
  rotation, preserves source/model hashes and produces an unscored draft requiring
  staff verification. Held-out demo files: `work/handwriting/clinical-line-demo.*`.
- The initial names archive was sampled but not trained. Synthea CSVs are not OCR
  training data. GNHK remains a possible supplementary source, not yet downloaded.
- Next application work: crop/rotate UI, authenticated local inference, editable
  suggestions and named review connected to retained originals. No application
  handwriting service is currently running. Dataset/model work changed no clinic
  credentials, originals, volumes, database records or Docker services.
- Training code/docs are local and uncommitted along with Phase 5. Do not represent
  them as pushed or released.

## Dental example review packet

The user supplied eight dental-chart photos and authorized preparing draft labels.
There are seven unique images (examples 04/05 are exact duplicates). Prepared 24
procedure-line crops from examples 01, 04, 06, 07 and 08. Personal-information headers
and signatures were excluded. The blank chart and demographic/history form were
not used as handwriting training examples. Originals remain unchanged in Downloads.

Private/local artifacts: `work/handwriting/dental-examples/STAFF_REVIEW.md`,
`staff-review.csv`, `review-manifest.json`, and `crops/`. They contain assistant visual
DRAFTS plus separate offline model DRAFTS. All 24 are unverified and training-ineligible.
Some regions contain neighboring/clipped strokes and must be recropped or rejected
before training. Do not treat any draft or repeated shorthand as confirmed truth.
No photos were uploaded to the app/external inference or used in model training.

`training/import_dental_review.py` imports only rows with corrected transcription,
verified=true, reviewer, crop_quality=accepted and a writer_group, with no [unclear]
marker, and checks crop hashes. Its initial run correctly accepted zero and retained
24 pending. Writer grouping must be confirmed before train/test separation; distinct
photos are not evidence of distinct writers. The current model remains unchanged.


### Supplied transcription document imported as drafts

The user supplied `dental_records_transcription_and_translation.md` from Downloads.
When asked about verification, the user explicitly answered: **Still drafts / not
confirmed**. `training/apply_transcription_document.py` matched literal handwritten
text fragments to all 24 existing crops and updated the local review sheet/table.
Clinical translations are separate unconfirmed explanation fields, never OCR labels.
The final note has an unresolved April versus prior Approx draft discrepancy.
Corrected transcription/reviewer/writer fields remain blank, verified=false, and
training_eligible=false. Re-running the verified-label importer correctly retained
all 24 as pending. No retraining or application/database changes occurred.
Source hash and mapping report are recorded privately under
`work/handwriting/dental-examples/transcription-import-report.json`.


## Current stopping point — handwriting extension complete

This section supersedes earlier notes saying handwriting is not integrated.
The user authorized finishing the Phase 5 extension. It is now implemented and
running at http://127.0.0.1:8080/upload. Read `PHASE5_HANDWRITING.md` for full scope.

- Upload a JPG/PNG, open Handwriting assistance, rotate/select one line with drag or
  keyboard percentage controls, suggest/edit one or more lines, then continue to
  metadata review and save. All generated sources are retained separately from
  corrected text. Saved records require the existing named review decision.
- Suggestions are unscored and experimental; selected lines are not whole-document
  transcription. Completeness and validity remain separate. PDFs retain printed OCR
  and manual entry. Front Desk cannot generate unclassified handwriting suggestions.
- Dedicated private Docker reader uses local, read-only AMR-trained base weights,
  no published port, offline model loading, one inference at a time and container
  resource limits. The local .env has a newly added private HANDWRITING_TOKEN;
  existing credentials and encryption keys were preserved. Never print the token.
- Start all services with `docker compose --profile handwriting up --build -d`.
  Weights are ignored by Git at `work/handwriting/amr-base-run-001/trained/`.
  A source checkout alone will not contain the model. Optional credential setup is
  `scripts/configure-handwriting.py`; it preserves existing secrets.
- Additive migration 5 creates append-only handwriting_drafts. All source history is
  server-owned, matched to original/user/patient, and the app runtime cannot update,
  delete or truncate it. Viewer Extracted Text and Review show source region,
  rotation, model hash, original draft and suggesting staff member.
- Validation: 63 backend tests, 4 direct reader geometry/format/pixel-limit tests,
  TypeScript, production build and deployed browser acceptance passed. Browser
  coverage includes real CPU model inference, 270-degree orientation correction,
  pointer/keyboard region selection, corrected text, save/review, original-byte
  equality, reader-failure fallback, and desktop/390px mobile layouts.
- PostgreSQL migration 5 and history privileges checked; all retained originals
  decrypt and match their hashes; the original 12 patients remain. Fictional
  acceptance documents are archived and the temporary verification account disabled.
  Only the existing clinic administrator remains enabled and its account was untouched.
- User-supplied dental photos/transcription drafts remain unconfirmed and excluded
  from training. No dental labels or photos were imported into the live database.
  No retraining occurred during integration. No source changes have been committed,
  pushed, merged or released; existing branch codex/phase4-review-validity remains.
- Next planned phase is Phase 6 semantic search. Explain scope/choices and obtain
  the user's instruction before beginning it. Verified dental-label adaptation can
  continue when corrected labels are available; do not manufacture verification.


## Current stopping point — Phase 6 complete

This section supersedes earlier notes listing Phase 6 as pending. The user explicitly
instructed proceeding with the next phase after handwriting integration.

- Read `PHASE6.md` and the actual code before resuming. Search now supports local
  semantic, hybrid and keyword methods with existing filters. It retrieves passages
  and does not generate summaries or clinical answers. Phase 7 remains unapproved.
- PostgreSQL remains 17.11/Alpine on its existing volume. A custom database image
  adds pgvector 0.8.7; additive migration 6 creates a real vector(384) search_chunks
  cache. The original database/files/keys and 12 patients were preserved.
- MiniLM embedding model is pinned at revision
  1110a243fdf4706b3f48f1d95db1a4f5529b4d41, downloaded under work/semantic/model
  and hash-checked. scripts/configure-semantic.py reproduces that artifact.
- The existing private CPU reader now serves both handwriting and embeddings.
  Start with `docker compose --profile semantic up --build -d`; the handwriting
  profile also starts the same reader. Existing private credential is reused;
  no source/model text is uploaded externally. Both model artifacts are ignored
  by Git and must accompany a prepared installation.
- Search filters/permissions apply before embedding and database vector ranking.
  Cached chunks are matched to source fingerprint, model identity and revision;
  changed sources are re-indexed and stale results omitted. Results show passage,
  source field and document version/revision. Handwriting source drafts are not
  independently indexed; saved transcription text remains subject to staff review.
- First searches can warm the index synchronously. Exact cosine pgvector scans
  are intended for this small installation; threshold 0.40 is heuristic, not
  accuracy/confidence. Hybrid outages explicitly show keyword-only fallback;
  semantic mode reports failure. English semantics only was smoke-tested.
- Validation: 71 backend tests, TypeScript, production build, deployed real-model
  pgvector browser acceptance and actual reader-outage recovery passed. Desktop/
  390px views checked. Search found an endodontic passage for root canal without
  literal text, and editing the source removed its old semantic match.
- Final PostgreSQL check confirms extension 0.8.7, vector(384) chunks, migration 6,
  protected histories and original integrity. Fictional test records archived,
  temporary account disabled; only the clinic administrator remains enabled.
- Pre-image-change snapshot: work/phase6-safety/before-pgvector.dump. It does not
  replace a complete database/files/keys backup or restore drill (Phase 8 pending).
- User dental labels remain explicitly unconfirmed and unused for training. No
  real patient photos were imported. Source changes remain local/uncommitted on
  codex/phase4-review-validity; nothing was pushed/merged/released.
- Next phase: Phase 7 local administrative summary drafts with named human approval
  before accepting/saving a summary. Obtain the user's instruction before starting.


## Source publication — November 3, 2026

The user explicitly authorized committing and pushing the completed Phase 5–6
source changes to the existing `codex/phase4-review-validity` branch. This note
supersedes earlier descriptions of those changes as uncommitted or not authorized
for push. This commit includes the implementation, tests, setup scripts and phase
records. No merge, main-branch change or real-data release is authorized by the push.
Private settings, clinic database/files, uploaded dental examples, model weights,
training environments and local review packets remain excluded under ignored work/.
Verify the remote branch before claiming a push completed; this note records the
user's authorization and packaged source rather than remote transport status.
