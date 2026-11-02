# DentDocs recall — November 3, 2026 (after Phase 8)

Read this, SESSION_RECAP.md, PHASE8.md, SECURITY_REVIEW.md and the code. Older recall
text is historical context, not new instructions or the current release status.

## Current state

Phases 2–7 and Phase 8 recovery tooling/local engineering review are implemented.
**Real-patient release is blocked** by the remaining tasks below. User authorized
Phase 8 after Phase 7 was pushed at e47aec0. Branch: `codex/phase4-review-validity`.
Remote: https://github.com/OhsirIIII/DentDocs.git. Use `git log -1` and compare the
remote tracking branch for the final Phase 8 commit/transport status. No PR, merge,
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
- API cryptography 50.0.0; reader Torch CPU 2.10.0, Transformers 5.10.0, Pillow 13.0.0,
  setuptools 84.1.0; pip 26.3 and pinned reader dependencies. Available OS upgrades
  applied. Database now uses su-exec instead of gosu. Models preserved, not retrained.
- Removed unused cloud/server packages and external fonts. Added CSP/privacy headers,
  disabled interactive schemas and rejected malformed/oversized document inputs.
- npm/pip scans report no known advisories; Docker Scout still has image findings.
  SECURITY_REVIEW.md records counts, no-fixed-version OS issues and removed-helper/
  vendored-BOM discrepancies. No zero-vulnerability or compliance claim.
- Temporary verification account disabled; saved test records archived. No real
  dental photos imported and supplied draft transcriptions not used as ground truth.

## Private recovery artifacts

Final bundle: `work/backups/phase8-final-verified-2026-11-03`.
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
