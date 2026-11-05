# Draft pull request

Status: prepared but **not created**. The connected GitHub integration returned
403 (resource not accessible); no local GitHub CLI is installed and the available
browser is signed out. Source push succeeded. No permissions or account settings
were changed to work around this limitation.

Repository: `OhsirIIII/DentDocs`  
Base: `main`  
Head: `codex/phase4-review-validity`  
Create as: **Draft**  
[Branch comparison / creation page](https://github.com/OhsirIIII/DentDocs/compare/main...codex%2Fphase4-review-validity?expand=1)

## Title

Implement local document workflows, isolated OCR and encrypted recovery

## Description

DentDocs extends the frontend prototype into a persistent fictional-data local
system. Staff can retain encrypted originals and versions, correct recognition
drafts, record separate review/completeness/validity decisions, search source
passages and approve administrative summaries. The branch adds named accounts,
isolated native OCR, encrypted recovery tools and illustrated system documentation.

The latest implementation, `7683524`, bounds and validates private handwriting and
embedding responses, rejects redirects/compression/malformed provenance, and adds
36 regression cases. An offline benchmark compares image preparation and decoding
without retraining or changing the application reader. On 15 previously inspected
AMR validation crops, contrast plus four beams reduced CER from 24.13% to 19.93%,
with unchanged 2/15 exact lines and median CPU latency increasing from 2.28 to
5.68 seconds. This is research validation, not dental accuracy; the candidate is
not deployed.

Validation:

- 135 backend tests passed in the final isolated API image, including real printed
  OCR and new transport cases.
- Live runtime/network/datastore boundary checks passed; actual handwriting and
  embedding round trips passed without saving records.
- GPU and deployment-version CPU experiments reproduced the shortlisted error
  counts. Deskew worsened results and was rejected.
- Python syntax, local documentation links and diff whitespace checks passed.
  Frontend/native/operator code was unchanged in this continuation; older
  suite/restore results retain their dates.

This is engineering review, not release approval. API/OCR scans retain 232/552 raw
matches using the November 3 advisory database; the attempted refresh did not
complete. Vendor backport evidence and open stable libxml2/Poppler issues are
documented without suppression. Independent review, refreshed scans, physical
off-device recovery, clinic policies/UAT, licensing and explicit release approval
remain outstanding. The HTTPS template is preparation only. The existing recovery
checkpoint predates this continuation and needs refresh/verification before a new
release checkpoint.

Review `CONTINUATION_2026-11-05.md`, `RELEASE_PREPARATION.md`,
`PARSER_ISOLATION.md`, `PHASE8.md` and `SYSTEM_DOCUMENTATION.md`.
Preserve configuration, keys, originals, models and database/files volumes. No
main merge or real-patient deployment is included.
