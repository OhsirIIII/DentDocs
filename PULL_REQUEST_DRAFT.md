# Pull request record

Status: [PR #1](https://github.com/OhsirIIII/DentDocs/pull/1) merged into `main`
from `codex/phase4-review-validity` on November 6, 2026 with explicit user approval.
Approved head: `8bad5017cae7ff27851229d26b4498ab3dcaadee`.
Merge commit: `36773545ea255041c2819f4b2278b9f5b048034c`.
The description below preserves the pre-merge review text and its then-pending
approval status. Current state is in SESSION_RECAP.md; release remains unapproved.

## Title

Implement local document workflows, isolated OCR and encrypted recovery

## Archived pre-merge description

DentDocs extends the frontend prototype into a persistent fictional-data local system. Staff retain encrypted originals and versions, correct recognition drafts, record separate review/completeness/validity decisions, search source passages and approve administrative summaries. The branch adds named accounts, isolated native OCR, encrypted recovery and illustrated system documentation.

Local branch review (November 6): three reproduced findings are fixed: nested clinical history could leak after administrative reclassification; historical clinical review notes were exposed through queue/detail; repeated version/restore operations recursively duplicated history. Flat version snapshots now prevent recursive histories, legacy responses/writes are flattened, and review access independently checks the source version's type. Four API regressions cover repeated versions/restoration, nested legacy history, clinical review isolation and legacy edit/restore. No schema, model or frontend changes.

Validation for these fixes: 130 host backend checks passed, nine OCR-service-dependent cases skipped; 29 recovery/setup/research checks and seven real native OCR/service checks passed. Type checking and production build passed. A separate reviewed API image passed fresh PostgreSQL permission/version/restore/concurrency/restart checks, original-byte preservation, actual OCR and full process/network/browser boundary checks. Source hashes matched the tested image. Grype with the existing refreshed November 5 database retains 233 API matches (2 critical/78 high), without suppressions. Temporary resources/credentials were removed; the saved installation stays stopped on preceding images. The task 3 backup predates these fixes; applying the patch requires rebuilt images and a matching recovery checkpoint before release. See PR_REVIEW_2026-11-06.md and deployment/pr-review-2026-11-06.json. This local review is complete; explicit merge approval and independent security/release conditions remain pending.

Latest security pass (November 6, commit b45fc78):
- Successfully refreshed Grype's advisory database to the latest returned build, November 5 at 06:21:06 UTC. Scanned all six exact service images, including migration, before/after vendor-package rebuilds without suppressions.
- Updated APT/libapt to 3.0.4 for DSA-6607-1 and Alpine apk-tools/libapk to 3.0.9-r0. Dockerfiles now enforce minimum fixed versions. No model weights, keys or application schema changed.
- Removed two high scanner matches from each affected OCR/reader/migration image. Post-update raw matches remain API/reader/migration 233 each (2 critical/78 high), OCR 552 (20 critical/174 high), database/web 3 medium each. Vendor source-revision checks distinguish 17 resolved source/CVE pairs, 74 vendor-open pairs and one attribution-review case. This is not a clean scan or independent release approval.
- 135 backend tests and seven real native/service OCR tests passed on a temporary isolated stack. Real handwriting/embedding requests, schema/history privileges, process/network/datastore isolation and HTTP-header checks passed; tested image IDs matched scans. npm audit reported no known advisories. The temporary stack was removed. The saved installation remains stopped with refreshed images prepared.

Handwriting evaluation (November 6, commit 4292d88): paired original/dim/blur experiments and repeated deployment-version CPU runs completed 225 inference measurements on the same 15 previously inspected AMR validation lines from one writer. Contrast/beam retained 19.93% CER versus 24.13% baseline, with unchanged 2/15 exact lines and only 1/6 numeric lines correct. Seven original lines improved and three worsened. Repeated CPU median increased from 1.27 to 3.59 seconds; repetitions were identical and matched original GPU predictions. Four metric regression checks passed. The application default remains unchanged. New datasets, dental-label preparation and fine-tuning were deferred. These transformed/repeated cases are not independent dental validation. See HANDWRITING_EVALUATION_2026-11-06.md and training/candidate-evaluation-2026-11-06.json.

Recovery checkpoint (November 6): a new encrypted runtime bundle captures clean source 4292d88, configuration, both models and all five refreshed runtime images. Fresh-volume isolated restoration matched all 19 persisted tables and 40 registered originals, all 524 tracked source files, 16 runtime model artifacts and private configuration. Image identities, revoked sessions, history privileges and service isolation passed. Actual restored printed OCR, handwriting and embeddings ran without saving records. The temporary restore and decrypted files were removed; original volumes, settings and keys are preserved and the saved installation is stopped. This is same-host verification; physical off-device recovery remains outstanding. See RECOVERY_CHECKPOINT_2026-11-06.md and deployment/recovery-checkpoint-2026-11-06.json. The report/docs were written after the captured source checkpoint.

Review SECURITY_REFRESH_2026-11-06.md and deployment/security-image-manifest-2026-11-06.json for current security evidence; CONTINUATION_2026-11-05.md for research; RELEASE_PREPARATION.md, PARSER_ISOLATION.md, PHASE8.md and SYSTEM_DOCUMENTATION.md for operation/design.

This is a draft engineering review. Independent native/OS security assessment and remediation/risk decisions, physical off-device recovery, confirmed dental evaluation, clinic policies/UAT, licensing, validated HTTPS staging and explicit release authorization remain outstanding. HTTPS is documented only; no main merge or real-patient deployment is included. Preserve existing configuration, keys, originals, models and database/files volumes.
