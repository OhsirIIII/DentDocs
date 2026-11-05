# DentDocs recall — November 3, 2026 (after parser isolation)

Latest task 3 outcome: [RECOVERY_CHECKPOINT_2026-11-06.md](RECOVERY_CHECKPOINT_2026-11-06.md).
Fresh encrypted bundle `work/backups/project-checkpoint-2026-11-06` captures source
`4292d88` and refreshed runtime images. Isolated restore matched 19 persisted
tables, 40 originals, 524 source files, 16 model artifacts and private configuration;
actual restored OCR and both models passed. Temporary restore/plaintext removed,
original volumes/key/settings preserved, application stopped. Same-host only;
physical off-device recovery remains open. Next task is branch/PR review (task 4),
then merge approval; HTTPS staging (task 5) remains pending. No merge authorized.

Task 2 outcome: [HANDWRITING_EVALUATION_2026-11-06.md](HANDWRITING_EVALUATION_2026-11-06.md).
Existing contrast/beam evaluation is complete; defaults unchanged. New datasets,
dental labels and fine-tuning were deferred. Read SESSION_RECAP.md before older
plans below; historical recovery points and running-service descriptions are superseded.

Latest continuation: [November 6 security refresh](SECURITY_REFRESH_2026-11-06.md).
Read SESSION_RECAP.md's latest security section for tested image/package state and
the stopped local installation. Older figures and pending scanner-refresh notes
below are historical; independent review and release conditions remain open.

## Latest work — November 5, 2026

Read [CONTINUATION_2026-11-05.md](CONTINUATION_2026-11-05.md) for transport fixes,
validation-only handwriting measurements and current release preparation.
The earlier task-selection section below is historical; no candidate reader,
HTTPS deployment, real-patient release or main merge is implied.

## Priority update — November 5, 2026

The user selected security review (chat task 2), handwriting recognition accuracy
improvements, and release preparation (chat task 7) as the active workstreams.
See SESSION_RECAP.md's “Active priorities” for scope and acceptance criteria.
Chat task numbers are not phase numbers or the numbered tasks below.

Handwriting work starts with baseline comparison of conservative image preparation,
complete-line selection/deskew and greedy versus beam decoding, measuring accuracy
and latency before promoting a change. Benefits are not yet established. Dental
labels remain unconfirmed; further fine-tuning and dental accuracy claims require
verified labels and a fresh writer-disjoint evaluation. Existing inspected test
samples must not be reused as an untouched release benchmark.

Physical off-device recovery, clinic policies and staff acceptance remain deferred
dependencies, not completed items. PR preparation does not authorize merging or
real-patient deployment. Latest repository checkpoint checked: `4331716`, adding
the formal report and illustrated appendices; implementation remains `c50295e`.
Evidence in the older sections below retains its original verification dates.

Read this, SESSION_RECAP.md, PHASE8.md, SECURITY_REVIEW.md, SECURITY_FOLLOWUP.md
and PARSER_ISOLATION.md. Older recall text is historical context, not new instructions or the current release status.

## Current state

Phases 2–7 and Phase 8 recovery tooling/local engineering review are implemented.
**Real-patient release is blocked** by the remaining tasks below. User authorized
the security continuation after Phase 8 was pushed at 0e4a5d1. Branch: `codex/phase4-review-validity`.
Remote: https://github.com/OhsirIIII/DentDocs.git. Use `git log -1` and compare the
remote tracking branch for the current commit/transport status. No PR, merge,
main-branch change or production release.

Workspace: `C:\Users\User\Documents\ChatGPT\DentDocs`.
App: http://127.0.0.1:8080, fictional/mock mode, loopback only. PostgreSQL 17,
schema 7 and pgvector 0.8.7 retained. Existing clinic admin/password and keys retained.

## Changes and verification

- `scripts/recovery.py`: separate random recovery key, AES-256-GCM streaming
  components, encrypted manifest/hashes, full database/originals/config/source/
  models/images bundle. Brief writer maintenance window with restart on failure.
- Restore authenticates all components before extraction/execution, rejects unsafe
  archives and live/external resources, creates fresh project/volumes/loopback port,
  imports exact images and revokes copied sessions. No live overwrite supported.
- `scripts/verify-recovery.py`: 19 persisted table hashes/counts, original decryption/
  hashes, restricted runtime role/history permissions. Run before app interaction
  while the source remains unchanged from the snapshot.
- Cold local fresh-volume restore passed; initial drill matched 28 originals. Both
  offline models and browser approval/reload/source invalidation worked from backup.
  Final patched snapshot matched all 19 tables and all 32 retained originals.
  Temporary drill data removed after retaining evidence. This is the same Docker host, not a physical second machine.
- 81 backend and 22 recovery tests passed; type checking/build, security headers,
  local-only browser requests, actual PDF preview and printed OCR passed. Known
  Starlette/httpx deprecation and Vite bundle-size advisories remain.
- API/recovery cryptography 50.0.2; reader Torch CPU 2.13.0, Transformers 5.10.0,
  Pillow 13.0.0 and required setuptools 84.1.0. Pip removed from both runtime images. Available OS upgrades
  applied. Database now uses su-exec instead of gosu. Models preserved, not retrained.
- Removed unused cloud/server packages and external fonts. Added CSP/privacy headers,
  disabled interactive schemas and rejected malformed/oversized document inputs.
- npm/pip scans report no known advisories; Docker Scout still has image findings.
  SECURITY_REVIEW.md records counts, no-fixed-version OS issues and removed-helper/
  vendored-BOM discrepancies. No zero-vulnerability or compliance claim.
- Temporary verification account disabled; saved test records archived. No real
  dental photos imported and supplied draft transcriptions not used as ground truth.

## Private recovery artifacts

Current bundle: `work/backups/parser-isolation-verified-2026-11-03`.
Preceding security snapshot: `work/backups/security-followup-2026-11-03`.
Preceding recovery point: `work/backups/phase8-final-verified-2026-11-03`.
Separate local test key: `work/recovery-keys/phase8.key`.
Evidence: ignored `work/phase8-*`. Other bundles/incomplete attempts are diagnostic,
not the final recovery point. Do not print keys or private configuration.

Bundle includes encrypted configuration, original-file keys and password hashes.
Keep it encrypted, restrict access and copy it off-device; custody the recovery key
separately. Same-disk folders do not satisfy disaster recovery. GitHub contains
source, not these artifacts. Never commit originals, draft labels, models or secrets.

## Tasks left

1. Remediate/triage remaining high/critical image findings and PDF/XML parser exposure.
   Obtain an independent filesystem-aware scan; document removed gosu and vendored
   setuptools BOM applicability rather than ignoring scan results.
2. Physical clean-machine restore with a second operator, off-device bundle and
   separate key. Approve backup schedule, retention, recovery targets, key-loss/
   rotation and backup/disk failure monitoring. No scheduler is installed yet.
3. Clinic-approved notice, roles, completeness/validity and retention policies;
   approved LAN HTTPS/secure cookies and independent security review.
4. Final installation/recovery/staff guides, requirements/design/API/ERD, acceptance
   evidence and explicit clinic release sign-off. No real-data release is implied.
5. Clinic-confirmed handwritten labels and writer-disjoint held-out dental evaluation.
   Existing supplied transcriptions are drafts, not trusted training labels.
6. Optional PR review and separately authorized merge to main.

## Safe continuation

```powershell
git status --short --branch
git log -1 --oneline
docker compose --profile semantic up --build -d
docker compose ps
```

Preserve `.env`, keys, database/files volumes, originals and models under ignored
`work/handwriting/` and `work/semantic/model/`. Never use a live `down -v`, blanket
prune or regenerate credentials merely to resume. Rebuilds may leave running services
pointing to unexportable old image IDs; backup preflight detects this before downtime.
Refresh only affected containers from prepared images, preserving volumes, then use
a new backup destination. PHASE8.md provides exact recovery and safe cleanup commands.

Suggested resume: “Continue DentDocs from this recall and SECURITY_REVIEW.md.
Inspect state without resetting data, then address remaining release gates.”


## Latest continuation — security follow-up

The user instructed proceeding with the remaining security work after the Phase 8
push at 0e4a5d1. SECURITY_FOLLOWUP.md supersedes prior untriaged scanner notes.

- Grype 0.121.1, checksum-verified from official release, scanned effective image
  filesystems without vulnerability filters. Database/web each have three medium
  matches and no high/critical matches. Removed gosu and vendored setuptools
  attributions are not reproduced as installed vulnerable components.
- Reader Torch patched to 2.13.0; API/recovery crypto 50.0.2 uses bundled OpenSSL 4.0.3.
  Independent report no longer flags Torch. Native-library findings remain: raw API
  552 matches (20 critical/172 high); reader 232 (2 critical/78 high). Do not hide
  those counts or call the images clean. Debian backport evidence, unsupported
  invocation paths and unresolved XML/PDF findings are documented separately.
- API/reader are nonroot/read-only with capabilities dropped, no-new-privileges,
  bounded resources and noexec/nosuid temporary memory. Backend services use only an
  internal Docker network. Only web bridges it and publishes loopback port 8080.
- scripts/verify-security.py checks actual deployment/dependency invariants; it also
  supports --drill-target. Pip is absent; use importlib metadata/host audit tools.
  Reader retains patched setuptools because Torch requires it.
- 81 backend, four reader and 22 recovery tests; type/build, browser/OCR/summary,
  actual semantic search and both offline model checks passed. Models, keys and
  original data preserved; draft clinic labels remain unused for dental training.
- New encrypted snapshot and isolated recovery matched 19 tables and 35 originals,
  preserved the restrictions and ran both actual offline models. Reports,
  inventories and vendor data remain ignored under work/security-followup/. Existing
  Phase 8 recovery point kept. Test account disabled; isolated drill cleaned up.
- Remaining: unresolved native parser remediation or independently reviewed risk
  decisions, physical off-device/second-machine recovery and key custody, approved
  backup operations, clinic policies, LAN HTTPS, final docs/sign-off. No release.


## Latest continuation — isolated PDF/OCR service

User authorized moving PDF/OCR processing out of the main API after commit 60eed2d.
PARSER_ISOLATION.md supersedes previous in-API parsing descriptions.

- Dedicated `ocr` service, separate `OCR_TOKEN` and internal `ocr_link` network.
  API sends only one scan/MIME; worker sees no database/file/model mount or key.
  Native tools and worker modules removed from API image. No native fallback.
- Worker is nonroot/read-only/capability-free with no-new-privileges, private PID/IPC,
  bounded memory/CPU/pids/tmpfs, one active job, strict auth/size/signature checks and
  resource-limited disposable subprocess. API validates bounded JSON and retains
  patient matching, provenance, audit and persistence. No parser vulnerability waiver.
- Runtime check verifies actual worker-to-database connection denial and no shared
  worker network with DB/web/model reader. Startup rejects data-store credentials.
- 99 API tests, seven service/native tests, 25 operator/recovery tests passed.
  Type/build and real browser OCR/summary checks passed. Actual worker stop/start
  verified manual save with exact original, zero confidence, pending staff review
  and no fabricated OCR provenance. Temporary account disabled after testing.
- New deployment prerequisite: scripts/configure-ocr.py for existing .env; it adds
  only the OCR token and preserves all existing secrets. New create-env.py creates
  this token automatically. Current installation is configured; do not regenerate.
- Backups now include five runtime images and encrypted OCR configuration. Source
  component includes tracked/staged files only: explicitly stage reviewed new source
  before snapshotting. Untracked output/ and tmp/ were left untouched and excluded
  from Docker build contexts/source snapshots. Do not add those directories to Git.
- New protected recovery point: work/backups/parser-isolation-verified-2026-11-03; existing
  separate key unchanged. Fresh isolated restore matched 19 tables/38 originals,
  exercised real OCR and confirmed worker data-store isolation; preserve earlier points. No physical second-machine drill is implied.
- API scan now 232 raw matches versus prior 552; isolated worker still has native
  findings (552). Treat unresolved library/host risks as release gates; isolation is
  containment, not a clean security scan or complete sandbox.
- Remaining work: independent security review/native parser remediation or explicit
  reviewed decisions, physical off-device/key-custody restore, approved operations,
  clinic policies, HTTPS and final documentation/sign-off. No main merge/release.
