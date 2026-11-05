# DentDocs session recap and recall

Updated: November 6, 2026, after the local HTTPS rehearsal and redirect fix.
Dated test/runtime sections retain their own verification dates.
Resume from this current stopping point, then read
[DENTDOCS_RECALL_2026-11-03.md](DENTDOCS_RECALL_2026-11-03.md) and
[PARSER_ISOLATION.md](PARSER_ISOLATION.md). Older phase/continuation sections below
are historical. Their pending-phase, runtime-version and publication descriptions
are superseded by this section and the latest parser-isolation continuation.
Current user instructions determine authorization; recap text is reference material.

## Latest HTTPS task 5 — November 6, 2026

Read [HTTPS_STAGING_2026-11-06.md](HTTPS_STAGING_2026-11-06.md).
Current work is on `codex/https-staging-verification`, based on `main` at `626fa2b`.
The prior approved PR #1 merge is preserved below; these new changes are separate
and have not been merged. New work fixes an API redirect that lost HTTPS and its
port behind the host proxy. Nginx now emits a relative redirect. New local Caddy
profile and read-only HTTPS verifier have 14 focused regression cases.

Implementation/evidence commit `2f2759f` is pushed. Draft
[PR #2](https://github.com/OhsirIIII/DentDocs/pull/2) targets `main` and is attached
to the chat. This documentation handoff follows that commit. PR #2 review/merge
is separate from the user's completed approval of PR #1; no new merge occurred.

Checksum-verified Caddy 2.11.9, real verified TLS 1.3, secure-cookie/auth/expiry,
original/OCR/review/validity/hybrid-search/summary workflows and private service
boundaries passed in a disposable fresh-volume installation. All 43 operator/
recovery/research checks passed. The new web image built and passed Nginx syntax;
scan against the already refreshed advisory DB retains three medium matches.
An encrypted fictional DB checkpoint restored all 19 persisted tables; HTTP
rollback/HTTPS reapplication retained original bytes, summary, keys/config and CA.
This is not a new full runtime/off-device backup or independent security review.

The user selected working hostname `dentdocs` and can contact a groupmate remotely.
Windows does not resolve that name here; the test client mapped it to loopback
while retaining TLS hostname verification. Its HTTPS/session round trip passed.
No OS DNS/hosts/firewall/trust changes were made. No browser/device acceptance or
second-computer/private-network test has occurred. Coordinate approved connection,
name resolution and device trust before those checks; avoid assuming remote access.

All temporary services, volumes/networks, credentials, CA/private keys and fixture
checkpoint were removed, and test ports are closed. The original installation is
still stopped with original data/settings/keys/models preserved; its images and
verified task 3 backup predate the recent source fixes. Source review/merge of this
branch, network/browser/device acceptance, operational certificate/backup custody
and existing security/clinic/operator release conditions remain outstanding.

## Approved main-branch merge — November 6, 2026

The user explicitly approved merging PR #1 after the review/fixes were pushed as
`8bad5017cae7ff27851229d26b4498ab3dcaadee`. GitHub was checked for that exact head,
the PR was marked ready and merged with its expected head guarded. GitHub confirms
PR #1 is closed/merged at `36773545ea255041c2819f4b2278b9f5b048034c`
(November 6, 07:08:37 Asia/Shanghai). No statuses or pull-request workflow runs were
returned for the approved head; local review evidence retains its recorded scope.

At that handoff the workspace was on `main`, fast-forwarded to the merged source; the former
implementation branch is retained. This documentation-only handoff follows the
merge. No new application tests were needed for recording the approved merge;
the previously tested application code is unchanged.

Task 4 is complete, including merge approval and execution. Next available task:
task 5, whose subsequent local rehearsal is recorded above. The app remains stopped;
saved runtime containers and task 3's source `4292d88` backup predate the fixes.
Rebuild API/migration images when applying the merged source and refresh the
runtime backup before a new release checkpoint. Existing volumes, settings, keys,
models and unrelated untracked output/tmp files remain preserved. Independent
security review and all clinic/operator release conditions remain open. The merge
authorizes continued local fictional-data development, not a real-patient release.

## Latest branch/PR review task 4 — November 6, 2026

Read [PR_REVIEW_2026-11-06.md](PR_REVIEW_2026-11-06.md).
Review of head `283a106` against refreshed `origin/main` (`b5d2607`) reproduced
and fixed three findings: nested clinical history leaked after administrative
reclassification; older clinical review notes were exposed through queue/detail;
version/restore histories recursively duplicated earlier history. New flat snapshot
helpers, role checks against review source versions and four regressions resolve
these cases, including legacy reads/edits/restores. No schema/model/frontend change.

130 backend tests passed, nine OCR-service-dependent cases skipped on host; 29
operator/setup/research checks and seven real native OCR/service checks passed.
Frontend type checking/build passed. A separately built API image passed fresh
PostgreSQL permission/version/restore/concurrency/restart checks, real printed OCR,
exact source hashes and security-boundary verification. Same refreshed advisory DB
scan of that exact API image retains 233 matches (2 critical/78 high); independent
review remains open. Report/JSON link detailed evidence and limitations.

Disposable containers/volumes/networks and credentials were removed. Original
data/configuration/keys remain; saved installation is stopped on its preceding
images. The new tested API image is separate, not installed into saved containers.
Task 3's verified source `4292d88` backup predates these fixes. Rebuild images when
applying new source and refresh the runtime backup before a new release checkpoint.

Local review/fixes and the approved merge are complete as recorded above.
Task 5 HTTPS staging and
independent security/clinic/operator release conditions remain open. New dental
datasets, labeling and fine-tuning remain deferred.

## Latest recovery task 3 — November 6, 2026

Read [RECOVERY_CHECKPOINT_2026-11-06.md](RECOVERY_CHECKPOINT_2026-11-06.md).
New private bundle: `work/backups/project-checkpoint-2026-11-06`, capturing clean
source `4292d8855e6ac171d14adb2a2b2c7b79430eb53f`, current configuration, both offline
models and five refreshed runtime images. Existing separate recovery key reused;
no keys/passwords reset. This recap/report postdates the captured source.

Fresh isolated restore passed: all 19 persisted tables and 40 registered original
files matched; all 524 tracked source files, 16 runtime model artifacts and private
configuration matched. Image identities, role/history restrictions, session
revocation and runtime boundaries passed. Actual restored printed OCR, handwriting
and embedding calls passed without saving records. Detailed ignored evidence is in
`work/recovery-2026-11-06/`; sanitized evidence is linked from the report.

The decrypted drill target and its temporary containers/networks/volumes were
removed. Original volumes, keys, configuration, models and older backups remain;
all DentDocs services are stopped. Same-host verification is complete, not a
physical off-device drill or release approval. No merge occurred.

Task 4's local review/fixes and approved merge are complete above.
Task 5 HTTPS staging remains pending. Independent security
review and clinic/operator release conditions remain outstanding. New dental
labeling/datasets/fine-tuning remain deferred as requested.

## Latest handwriting task 2 — November 6, 2026

The user clarified task 2 means further evaluation of the existing contrast/beam
candidate. New datasets, dental-label preparation and fine-tuning were deferred.
The interrupted label-inspection turn made no training, crop, review-flag or model
changes. Do not resume that work from older proposed plans without new direction.

Read [HANDWRITING_EVALUATION_2026-11-06.md](HANDWRITING_EVALUATION_2026-11-06.md).
The paired run used the same 15 research validation lines from one writer, with
original/low-contrast/blurred copies on GPU and two original-image repetitions in
the security-refreshed offline CPU image. Total: 225 inference measurements, not
225 independent examples. No old test or private dental labels were evaluated.
CPU/GPU original predictions matched; both CPU repetitions were identical.

Contrast/beam retained 19.93% CER versus 24.13% baseline, with 2/15 exact lines and
1/6 numeric lines correct. On original images it improved seven lines, worsened
three and left five unchanged. CPU median increased from 1.27 to 3.59 seconds.
Default remains raw/greedy; no app/model/API changes or promotion. Four research
metric checks passed. Evidence/aggregate JSON and limitations are linked in the
report. This evaluation pass is complete; new labeling/training remains deferred.
The isolated benchmark container exited; the application remains stopped.

Task 3's fresh backup/restore is now complete as recorded above.
Task 4 PR review and task 5 HTTPS staging remain. Security updates/scans are
done for this pass, but independent review of open findings is still outstanding.

## Latest security pass — November 6, 2026

Read [SECURITY_REFRESH_2026-11-06.md](SECURITY_REFRESH_2026-11-06.md) first for current
security state. Grype's latest available database refreshed successfully (built
November 5, 06:21:06 UTC); all six service images were scanned before/after a
vendor-package rebuild, including migration. APT/libapt 3.0.4 and Alpine
apk-tools/libapk 3.0.9-r0 are verified. Dockerfiles now enforce these minimums.
Raw post-update matches: API/reader/migration 233 each (2 critical/78 high), OCR
552 (20 critical/174 high), database/web 3 medium each. No suppressions were used.
17 source/CVE pairs have verified vendor-fixed revisions; 74 remain vendor-open
and one attribution case remains explicit review. Independent review is pending.

135 backend tests, seven native OCR tests, real reader/embedding requests, schema/
history grants and runtime boundary checks passed on an isolated temporary stack.
Its tested image IDs matched the scanned IDs. Fresh npm audit reported no known
advisories. See the report and deployment/security-image-manifest-2026-11-06.json.
The audit stack and only its disposable volumes/networks were removed. Original
DentDocs containers were recreated on refreshed images without starting services;
the original volumes, keys, settings, model weights and snapshots were preserved.
The app remains stopped at the user's request. No merge/release occurred. A fresh
complete backup/restore checkpoint for these images is now verified above.

## GitHub handoff — November 6, 2026

The user installed/reconnected the GitHub app under repository owner `OhsirIIII`.
Connector discovery now returns DentDocs and PR creation succeeded. The earlier
403 permission blocker is resolved. Draft PR
[#1](https://github.com/OhsirIIII/DentDocs/pull/1) targets `main` from
`codex/phase4-review-validity` and is attached to this chat. No merge or real-data
release occurred. Runtime/test/benchmark evidence below retains its original dates;
no application checks were rerun just for the GitHub connection update.

## Latest continuation — November 5, 2026

Latest implementation: `7683524`, committed and pushed to the existing branch.
The complete PR title/body is in [PULL_REQUEST_DRAFT.md](PULL_REQUEST_DRAFT.md).
PR creation initially failed with 403; the November 6 handoff above resolves that
blocker and records draft PR #1. Main merge and real-data release remain pending.

See [CONTINUATION_2026-11-05.md](CONTINUATION_2026-11-05.md) for current evidence
and [RELEASE_PREPARATION.md](RELEASE_PREPARATION.md) for HTTPS/review preparation.
Handwriting and embedding transports now reject oversized, redirected, compressed
or malformed private-reader output; source/draft/vector contracts are validated.
The validation experiment reproduced 24.13% baseline versus 19.93% contrast/four-beam
CER on 15 research lines in GPU and deployment-version CPU environments, with
unchanged 2/15 exact lines and poor numeric agreement. Deskew was rejected. The
application reader and weights remain unchanged; candidate promotion needs more
independent evidence. No unconfirmed dental labels were trained/evaluated.

Final backend suite: 135 passed, including 36 new transport cases. Actual reader/
embedding round trips and live security-boundary verification passed.
Runtime services were resumed using existing configuration/volumes. A rebuilt API
contains the new checks; current results and review state are in the continuation.
New image scans use the November 3 advisory database because the attempted update
did not complete. Native findings/independent review remain open. Proposed HTTPS
configuration is documented only; the app remains loopback fictional-data HTTP.
This continuation supersedes the earlier task-selection-only status below; it does
not mark deferred clinic/recovery/acceptance conditions complete.

## Active priorities — November 5, 2026

The user selected the following three workstreams. “2” and “7” refer to the
seven-item remaining-work list discussed in chat, not phase numbers or the
numbering of the release gates below. These tasks are planned, not completed.

1. **Security review (chat task 2):** assess remaining native-parser/OS findings,
   apply available fixes, retain applicability evidence, and rerun relevant checks.
   Independent review remains a separate outstanding release condition.
2. **Handwriting recognition accuracy:** benchmark the existing reader, then
   compare tighter complete-line crops, slight-angle deskew, conservative contrast/
   background preparation, and greedy versus beam decoding. Measure character
   error rate, exact-line matches, latency, and critical tooth/date/amount errors
   where verified references exist. Preserve originals and draft provenance;
   retain the current reader as baseline and promote changes only when measured
   evidence supports them. Preprocessing/decoding benefits are hypotheses, not
   demonstrated improvements. Current research labels are not clinic-confirmed;
   supplied dental transcriptions remain unconfirmed and cannot serve as trusted
   training/evaluation labels. Further dental fine-tuning requires verified labels
   and a fresh writer-disjoint evaluation set. Do not repeatedly tune on the old
   inspected test split or claim the historical 18.8% CER as dental accuracy.
3. **Release preparation (chat task 7):** reconcile pending documentation, review
   branch changes, prepare PR/review material, and document HTTPS configuration.
   Merge and real-patient deployment require separate explicit authorization and
   completion of applicable release conditions.

Other tasks (physical recovery, clinic policies, label confirmation and staff
acceptance) remain outstanding dependencies; they were deferred, not removed.
This update records the task selection; it does not implement model changes,
perform a new security assessment, publish a PR, or authorize release.

Historical repository checkpoint at task selection: `4331716` (`docs: add formal system
report and illustrated appendices`), following implementation commit `c50295e`.
The report and illustrated Word document are committed. README/training README
and recap edits remain local; the runtime observations below are historical.

## Earlier stopping point — November 3 baseline

Phases 2–7, Phase 8 recovery/security tools, the security follow-up and dedicated
PDF/OCR parser isolation are implemented and verified locally. Real-patient/LAN
release remains blocked by unresolved native/OS risk assessment, physical off-device
recovery, clinic decisions and release sign-off.

- Repository: https://github.com/OhsirIIII/DentDocs
- Working folder: `C:\Users\User\Documents\ChatGPT\DentDocs`
- Branch: `codex/phase4-review-validity`
- Latest implementation commit: `c50295eb4b0394becb6f214f00de7a028f8dbb4a`
  (`security: isolate native OCR from the data-store API`). Push completed; local
  HEAD and the remote-tracking branch matched when this recap refresh began.
- This recap refresh is a subsequent local documentation edit; it has not itself
  been committed/pushed. Do not describe it as part of c50295e.
- `main` was not changed. No PR, merge or production/real-patient release.
- App: http://127.0.0.1:8080/dashboard, fictional/mock mode and loopback only.
- Docker services checked during this refresh: `api`, `db`, `handwriting`, `ocr`
  and `web` are running. PostgreSQL 17 / pgvector 0.8.7 / schema 7 retained.
- At the user's request, two Codex task terminal process trees were terminated.
  Docker services were left running; no volumes or data were removed.
- Unrelated untracked `output/` and `tmp/` remain untouched. Do not stage/delete
  them. They are excluded from Docker contexts and tracked/staged source snapshots.

### Implemented parser boundary

- API has no native PDF/OCR binaries or worker modules and no native fallback.
  It authenticates staff, verifies/decrypts the original, and sends only that scan
  and MIME to the private worker. Matching, provenance, review and persistence
  remain in the API; OCR suggestions do not approve clinical information.
- Dedicated `ocr` service has a distinct token, only its private `ocr_link` network,
  no database/file/model mounts or credentials, no published port, and bounded
  nonroot/read-only/capability-free execution. Actual database connection from
  the worker was denied. API input/output bounds and job timeouts are enforced.
- Actual OCR outage/manual entry was tested: exact original retained, zero
  confidence, pending staff review and no fabricated extraction provenance.
- Existing `.env` already has OCR_TOKEN configured. `scripts/configure-ocr.py`
  safely adds it to older installations; never regenerate existing data keys.
- API/recovery cryptography 50.0.2; reader Torch CPU 2.13.0, Transformers 5.10.0,
  Pillow 13.0.0 and required setuptools 84.1.0. Pip removed from runtime images.
  Existing model weights and unconfirmed dental labels were not retrained.

### Validation and recovery evidence

- 99 API tests, seven isolated worker/native tests and 25 operator/recovery tests
  passed (131 total). Type checking, production build and browser OCR/summary/
  history checks passed. Existing Starlette/httpx and Vite advisories remain.
- Current encrypted snapshot: `work/backups/parser-isolation-verified-2026-11-03`.
  It includes all five runtime images, source, configuration, originals, DB and models.
- Separate existing recovery key: `work/recovery-keys/phase8.key`. Never print,
  commit or send it with the encrypted bundle. Same-disk storage is not off-device
  recovery custody. Prior snapshots were preserved.
- Final fresh-volume restore matched all 19 persisted tables and all 38 originals.
  Recovered OCR and data-store isolation checks passed. Restored sessions revoked;
  history privileges protected. Drill containers, volumes and decrypted files removed.
- A cold-start race found during the drill was fixed: readiness now waits on the
  final PostgreSQL TCP listener and imports are transactional.
- Evidence: ignored `work/parser-isolation/`. Source snapshot verified to exclude
  untracked `output/`, `tmp/`, `work/` and plaintext `.env`.
- Temporary verification account disabled; saved fictional test records archived.
  Original clinic administrator/password, encryption keys and 12 patients retained.

### Next work / release gates

1. Independent native-parser/OS security review and remediation or explicitly
   reviewed applicability/risk decisions. Isolation contains access; it does not
   fix every library flaw or establish a clean scan. Read SECURITY_FOLLOWUP.md
   and PARSER_ISOLATION.md; retain raw scan evidence and vendor backport context.
2. Physical second-machine/off-device restore with a second operator and separate
   key custody. Approve backup schedule, retention, recovery targets, key loss/
   rotation and backup/disk-failure monitoring. No scheduler is installed.
3. Clinic-approved privacy/retention, roles and completeness/validity policies;
   approved LAN HTTPS/secure cookies, independent review and release sign-off.
4. Finish installation/recovery/staff guides and requirements/design/API/ERD and
   acceptance deliverables. Dental model accuracy needs clinic-confirmed labels
   and writer-disjoint held-out evaluation; supplied transcriptions remain drafts.
5. Optional PR review and separately authorized merge. Do not infer release
   permission from an implementation, recap update or source push.

### Safe resume

Inspect Git and Docker state first. Preserve `.env`, keys, models and both data
volumes; never use live `down -v`, blanket prune, reseeding or credential regeneration
merely to resume. Refer to PHASE8.md for recovery commands and PARSER_ISOLATION.md
for the current five-service architecture. Use explicit reviewed paths when staging.

```powershell
git status --short --branch
git log -1 --oneline
docker compose --profile semantic ps
# If services need starting:
docker compose --profile semantic up --build -d
# Read-only boundary verification:
.venv/Scripts/python.exe scripts/verify-security.py --output work/parser-isolation/runtime-security.json
```

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
| Local draft administrative summaries with human approval before saving | Implemented Phase 7; local extractive drafts, source pinning and named staff decisions |
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

1. **Release security:** triage/remediate remaining image findings, especially PDF/XML
   parsers. Obtain an independent filesystem-aware scan and applicability decisions.
2. **Recovery operations:** off-device copy, separate key custody, approved schedule,
   retention/RPO/RTO, physical second-workstation restore and operator drill.
3. **Clinic deliverables:** notice, policies, roles, retention, LAN HTTPS, secure
   cookies, installation/staff guides, requirements/API/ERD and release sign-off.
4. **Handwriting:** verified labels and writer-disjoint held-out evaluation; supplied
   labels remain drafts and unused for dental training or accuracy claims.
5. **GitHub review:** optional PR and separately authorized merge/release.

## Suggested message to resume

> Continue DentDocs from DENTDOCS_RECALL_2026-11-03.md, PHASE8.md and
> SECURITY_REVIEW.md. Preserve volumes, credentials and encrypted recovery artifacts.
> Address remaining release gates; keep testing fictional.

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


## Current stopping point — Phase 7 complete (November 3, 2026)

This section supersedes historical Phase 5/6 statements about uncommitted work,
Phase 6 being next, or Phase 7 lacking authorization. The user explicitly requested
the next phase, push and a renewed recall document in this continuation.

- Local administrative overview drafts now use deterministic extraction of selected
  exact source lines. This is not an abstractive language model or a handwriting fix.
- Drafts are stored separately from accepted summaries. Only a dentist/administrator
  can accept or reject; acceptance requires edited/reviewed text, a note and explicit
  source comparison confirmation. Pending extraction review blocks acceptance.
- Source version/revision/fingerprint and original-file association are retained.
  Any document revision invalidates earlier acceptance, including restore/archive.
  Drafts and named decisions are append-only; one final decision per draft.
- Source permissions apply to both current and historical types. The new audit
  actions are SUMMARY_VIEW, SUMMARY_DRAFT, SUMMARY_APPROVED and SUMMARY_REJECTED.
- Additive schema version 7, deployed PostgreSQL history protections and original
  integrity verified. Twelve fictional patients retained; browser test documents
  archived; temporary account disabled and sessions revoked. Existing clinic admin
  password was not used or changed.
- Validation: 79 backend tests, TypeScript, production build, deployed browser
  acceptance, persistence after reload, source invalidation, exact original download
  and desktop/390px mobile checks. Upstream Starlette/httpx deprecation and Vite's
  bundle-size advisory remain. See PHASE7.md for details and limitations.
- Detailed current handoff: DENTDOCS_RECALL_2026-11-03.md. Phase 8 backup/recovery
  and release review remain pending. No PR, merge or real-data release.


## Current stopping point — Phase 8 engineering baseline (November 3, 2026)

This section supersedes earlier notes calling Phase 8 unapproved or unstarted.
The user instructed proceeding with Phase 8 after the Phase 7 push at e47aec0.

- Full encrypted bundles include DB, originals, configuration/keys, source, both
  offline models and exact Docker images. Separate key and protected folders.
- Isolated fresh-volume restore, 19-table equality and original integrity passed;
  models and browser summary workflow ran from recovered artifacts. Copied sessions
  are revoked. History permissions are preserved. No live restore/volume reset.
- 81 backend and 22 recovery tests passed, plus type checking/build and deployed
  headers/local-only requests, PDF preview, printed OCR and mobile/browser checks.
- API cryptography 50.0.0; reader Torch CPU 2.10.0, Transformers 5.10.0, Pillow 13.0.0,
  setuptools 84.1.0; pip 26.3. Available OS upgrades applied. Database now uses
  su-exec instead of gosu. Schema remains 7 and pgvector remains 0.8.7.
- Added CSP/privacy headers, removed external font requests and unused cloud/server
  dependencies, disabled interactive schema endpoints and bounded document input.
- npm/pip scans found no known advisories; Docker Scout still reports image findings.
  SECURITY_REVIEW.md records missing OS fixes and removed-helper/vendored-BOM
  discrepancies. These findings are not waived; real-patient release remains blocked.
- Final bundle: work/backups/phase8-final-verified-2026-11-03. Separate local test key:
  work/recovery-keys/phase8.key. Never print/commit these. Same-disk custody is not
  disaster recovery. Other complete/incomplete bundles are diagnostic artifacts.
- Evidence under ignored work/phase8-*. Temporary drills removed after verification;
  test account disabled and saved test records archived. Existing clinic admin,
  password, original keys and twelve patients retained. No PR, merge or release.
- Physical clean-machine recovery, independent security assessment, remaining image
  remediation/triage, approved backup operations and clinic decisions remain pending.


## Latest continuation — security follow-up (November 3, 2026)

This supersedes earlier runtime versions and untriaged scanner notes. See
SECURITY_FOLLOWUP.md and the updated dated recall. The user authorized proceeding.

Crypto is 50.0.2 (bundled OpenSSL 4.0.3), Torch CPU 2.13.0; original keys/models kept.
Pip removed, required reader setuptools 84.1.0 retained. API/reader are read-only,
nonroot, capability-free/no-new-privileges and resource bounded; private backend
network prevents direct external routing. Only web exposes loopback 8080.
Independent checksum-verified Grype effective-filesystem scans support removal of
old gosu/vendored-setuptools findings and the Torch fix. Raw API/reader native-library
findings remain; documented vendor backports/path constraints are not release waivers.

81 backend, four reader and 22 recovery tests plus type/build, browser/OCR/summary,
real semantic retrieval, both model inference and runtime-boundary checks passed.
New protected snapshot: work/backups/security-followup-2026-11-03; existing separate
recovery key unchanged. Fresh isolated restore and cleanup completed; preceding
Phase 8 snapshot retained. Test account disabled and original admin untouched.

Next work is the remaining independently assessed parser/security release gates,
physical clean-machine/off-device/key-custody drill, approved clinic/deployment
operations and final deliverables/sign-off. No main merge or real-data release.


## Latest continuation — parser isolation (November 3, 2026)

User requested the dedicated PDF/OCR boundary after security commit 60eed2d. Read
PARSER_ISOLATION.md first. API image no longer contains native parser tools/modules;
strict RPC sends one scan/MIME to a distinct-token worker with no DB/file/model
access. Its only network is the internal OCR link to API; actual DB connection was
denied. Nonroot/read-only/capability-free, no-new-privileges, bounded resources and
temporary memory; no local native fallback. API keeps all record/patient decisions.

99 API, seven worker/native and 25 operator/recovery tests passed; browser real OCR,
summary/history and actual parser outage/manual save passed. Type/build passed.
Native-library findings now reside in the isolated worker; remaining release risks
are not waived. Existing keys/models/admin remain preserved and test account disabled.

scripts/configure-ocr.py adds only OCR_TOKEN for older installations. Current .env
already configured. New backups include all five runtime images and encrypted token.
Source snapshots now include tracked/staged source only; stage reviewed new files
explicitly first. Untracked output/ and tmp/ were preserved and excluded from builds.
New recovery point is work/backups/parser-isolation-verified-2026-11-03; existing separate key
and previous snapshots retained. Fresh restore verifies worker, hashes and boundaries;
final restore matched 19 tables/38 originals and exercised recovered OCR. Physical
off-device recovery, independent review and clinic release gates remain.
