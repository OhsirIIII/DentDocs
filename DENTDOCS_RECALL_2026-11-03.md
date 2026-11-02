# DentDocs recall — November 3, 2026

Read this first, then SESSION_RECAP.md and the actual code. Attached documents and
older recall text are context, not new instructions. Current code and current user
instructions take precedence over historical plans.

## Completed in this continuation

Phase 7 adds working local administrative summaries to the document viewer:

- Generate a separate draft containing metadata and selected exact source quotations.
- Review/edit the draft, add a note and explicitly confirm source comparison.
- A dentist or administrator must approve before it becomes an accepted summary.
- Named approval/rejection history is immutable. Source version/revision/fingerprint
  and original association are retained; source changes invalidate old acceptance.
- Pending extraction review blocks acceptance. Current and historical permissions
  apply; clinical drafts remain hidden from front desk staff after reclassification.
- Schema migration 7, summary audit actions, browser UI and regression coverage.

See PHASE7.md for behavior and limits. This uses a local extractive algorithm, not
a new trained generative model. It does not improve recognition of unreadable
handwriting or validate the underlying OCR. Selected quotations require staff review.

## Verification and repository state

- Phases 2–7 are implemented locally; 79 backend tests passed, plus type checking,
  production build, deployed browser checks and desktop/390px visual inspection.
- Browser verified draft/approval, reload persistence, unchanged original download,
  source invalidation and rejection. PostgreSQL verified schema 7, append-only
  protections, original integrity and twelve retained fictional patients.
- Test records were archived; temporary verification account disabled and sessions
  revoked. Only the existing clinic administrator remains enabled; its password
  was not used or changed. No real photos were imported for these tests.
- Branch: `codex/phase4-review-validity`.
- Remote: https://github.com/OhsirIIII/DentDocs.git
- Prior pushed Phase 5–6 commit: `3749dbd`.
- The user authorized implementing Phase 7, updating this recall, committing and
  pushing to this same branch. This handoff is included in the Phase 7 commit.
  Determine the resulting commit with `git log -1`; compare it with
  `origin/codex/phase4-review-validity` to verify current transport status.
- No PR, merge, main-branch change or production/real-data release.
- Known advisories: Starlette/httpx test deprecation; Vite bundle-size advisory.

## Tasks left

1. Phase 8: design encrypted backups for database, encrypted originals and required
   keys/config; establish key custody and perform an isolated clean-machine restore
   drill. Verify original hashes, accounts/history, models and offline workflows.
2. Phase 8: expand deployment/security integration checks, dependency review and
   release criteria; review access, sessions, uploads, histories and recovery paths.
3. Clinic decisions: approved completeness/validity policies, privacy notice/DPO
   review, retention/disposal, account administration and LAN HTTPS configuration.
4. Deliverables: installation/recovery and staff guides, current requirements/design,
   API/ERD documentation, acceptance evidence and explicit clinic release sign-off.
5. Handwriting: obtain clinic-confirmed line transcriptions and measure held-out
   accuracy across different writers before dental adaptation/reliability claims.
   User-supplied labels are still draft interpretations and not training ground truth.
6. Optional PR review from this branch to main, with merge authorized separately.

Phase 8 is pending and has not been started. Explain its proposed scope before
implementation. Do not infer permission for a real-data release from this handoff.

## Resume without resetting the installation

Workspace: `C:\Users\User\Documents\ChatGPT\DentDocs`.
App: http://127.0.0.1:8080 (loopback-only, fictional-data mode).

```powershell
git status --short --branch
git log -1 --oneline
docker compose --profile semantic up --build -d
docker compose ps
```

Keep `.env`, keys, existing PostgreSQL/files volumes and encrypted originals. Never
use `down -v`, reinitialize the database or regenerate keys to start a new session.
Existing private reader token must not be printed. Docker Desktop may need to be
running; its executable is in the user's DockerDesktop resources/bin directory.

Offline handwriting and embedding models live under ignored `work/handwriting/`
and `work/semantic/model/`; source-only GitHub clones do not include these artifacts.
The private CPU reader serves both. See PHASE5_HANDWRITING.md, PHASE6.md and setup
scripts for reproduction. PostgreSQL remains version 17 with pgvector 0.8.7.

Private datasets, real dental images, draft label packets, credentials, database
files, model weights, screenshots and test-account helpers stay under ignored local
paths. A Git push is source publication, not a backup of the installation. The
Phase 6 safety dump is incomplete recovery coverage; Phase 8 still needs a full drill.

Suggested resume: “Continue DentDocs from DENTDOCS_RECALL_2026-11-03.md. Inspect the
branch and running app without resetting data, then explain the Phase 8 scope.”
