# Phase 5 — local printed-text OCR and classification

> This records the printed-OCR baseline. The implemented handwriting extension is
> documented in [PHASE5_HANDWRITING.md](PHASE5_HANDWRITING.md), which supersedes
> the handwriting-unsupported boundary below.

Implemented and verified November 2, 2026 in the existing fictional-data,
loopback-only installation. This is a limited local OCR implementation, not
validation for real patient scans or production release. Phases 6–8 remain pending.

## Staff workflow

Choose the patient and a real PDF, PNG or JPEG on **Upload**. **Read Document
Locally** stages the encrypted original, then runs Tesseract English OCR locally.
PDF pages are rendered by Poppler before recognition. Filename-based simulated
text, random receipts and sample-file buttons have been removed.

Review the actual original beside editable text and metadata. The original can
also be opened separately to inspect every page. Correct fields against the source;
the selected patient is a staff choice, not proof that OCR identified that person.
Dates that cannot be extracted unambiguously remain blank and must be entered.
Saving reuses the staged original rather than uploading another copy.

All OCR uploads enter the existing named staff review workflow. Patient-name or
record-number differences require explicit patient-link verification. Server-owned
confidence, source flags and extraction provenance cannot be raised or cleared by
the upload client. Review approval does not mark completeness verified or establish
document validity. Source extraction remains retained even if staff edit the text.

Malformed, encrypted or oversized-page-count PDFs and invalid images produce visible
errors. Retry processing, choose another file, or use **Enter metadata manually and
send for review**. Blank scans return a no-readable-text state, never invented text.
An empty page in a multi-page result produces a warning. Processing does not save a
patient document until staff confirm. Abandoned staged originals remain encrypted;
their cleanup policy is still a later operational task.

Front Desk retains manual billing/appointment uploads. It cannot call OCR, including
through direct API requests: processing an unclassified scan could reveal clinical
text. Administrators, dentists and assistants can process their own unused uploads.
Changing a staff role revokes sessions as before.

## Supported extraction and limits

- Printed English text; PDF/PNG/JPEG, existing 20 MB upload limit, at most 10 PDF pages.
- Content-based keyword classification for the existing eight document types.
  Multiple matching types or no match require staff selection; the form's Patient
  Record fallback carries zero classification confidence.
- Recognizes `PT-YYYY-NNNN` record numbers, explicitly labeled patient names,
  unambiguous `YYYY-MM-DD` dates and permanent FDI numbers on tooth/teeth/FDI lines.
- Clinical procedure category and tags require manual entry. Administrative
  classification suggests Billing & Administrative. The clinical category's
  existing Restorative form fallback has zero confidence and requires verification.
- Overall confidence is a character-weighted mean of Tesseract word confidence;
  per-page scores and character counts are retained. Field scores are capped
  heuristic evidence scores derived from recognized content and overall confidence,
  not calibrated field probabilities or a guarantee of accuracy. Missing evidence
  gets zero. Every OCR upload requires review regardless of score.
- Handwriting recognition, image interpretation, signature validation, credential
  verification, automatic completeness certification and a validated blur detector
  are outside this implementation. OCR can read printed labels on an X-ray; it
  cannot interpret anatomy or findings. Non-ISO/ambiguous dates need manual entry.

Tesseract was selected as a small local baseline with word-confidence output and
no runtime model download. PaddleOCR was not benchmarked; no comparative accuracy
claim is made. This evaluation uses synthetic fictional scans and does not establish
accuracy across clinic forms, handwriting, languages, rotations or poor photographs.

## Processing, storage and version behavior

The API decrypts and checks the uploaded original's integrity before processing.
OCR runs in a disposable child process with credentials omitted from its environment.
The Docker/Linux worker limits address space to 768 MiB, CPU to 70 seconds and
individual output files to 64 MiB; the parent enforces a 90-second wall timeout and
kills the process group on timeout. At most two OCR jobs run per API process. PDF
rasterization is capped at 2400 pixels on the long edge and ten pages. Native
Windows development does not supply the Linux resource-limit guarantees; use the
packaged Docker environment for acceptance.

Temporary plaintext input and page images live outside the retained-files volume
and are removed after processing, including handled failures. This is process
separation and resource limiting, not a hardened hostile-file sandbox or malware
scanner. Real-data release isolation and dependency review remain Phase 8 work.

Additive migration 4 creates `file_extractions`, keyed to the original upload and
patient selection. Successful extraction is cached, with source text, scores,
engine/rules identifiers and warnings retained. PostgreSQL permissions and triggers
prevent runtime updates, deletion and truncation. New audit actions are
`OCR_EXTRACTED` and `OCR_FAILED`; their details do not contain extracted text.

Replacing an original clears the previous source's text, scores and provenance and
requires review. A processed replacement can use its own matching-patient OCR result.
The existing version editor otherwise remains a manual revision workflow; it does
not automatically run OCR. Restoring a historical version restores its associated
original and extraction snapshot, with the usual fresh review/validity requirements.

## Validation

- **56 backend tests passed, no skips**, in the packaged Docker environment.
  Coverage includes real multi-page PDF, PNG and JPEG recognition, all eight types,
  blank/no-text handling, malformed originals, page-count rejection, busy-worker
  handling, confidence/provenance enforcement, patient mismatch, ownership, CSRF,
  Front Desk denial, retries, audit events, immutable extraction sources and replacing/
  restoring originals, plus all earlier phase contracts.
- `npm run lint`, production Docker web build and `git diff --check` passed.
- Eight large-print fictional PDF fixtures classified correctly, with retained
  record number, date and tooth number. Measured overall confidence was 87–96;
  individual processing times were approximately 0.49–0.58 seconds in this run.
  These are smoke-test measurements, not an accuracy benchmark or latency promise.
- Deployed Edge checks passed: actual file selection and OCR, staff text correction,
  original preview, metadata/save, mismatch verification, named extraction approval,
  unchanged completeness/unknown validity, exact original download, retryable failure,
  manual-entry date validation and desktop/390px mobile layout.
- One fictional name was recognized as `J uan` rather than `Juan`, despite high
  overall confidence. The UI retained the text, flagged the mismatch and required
  explicit patient-link verification. This illustrates the need for human review.
- Running PostgreSQL has migration 4. Runtime OCR/audit/review/validity history
  modification privileges are absent. All retained original hashes matched after
  decryption; the 12 existing patients and earlier documents remain.
- Saved fictional acceptance records are archived. The temporary verification
  account is disabled and its sessions revoked. Only the existing clinic
  administrator remains enabled; its password was not used or changed.

One upstream Starlette/httpx deprecation warning remains in the tests.

Reproduce packaged tests from the project folder with Docker Desktop running:

```powershell
docker compose run --rm --no-deps -e DENTDOCS_MIGRATE=true -v "${PWD}/backend/tests:/app/tests:ro" api python -m pytest tests -q -p no:cacheprovider
```

Use the existing `.env` and preserve named volumes. `docker compose up --build -d`
installs the processing tools during image build; normal OCR requires no external
service or runtime downloads. Do not regenerate keys or delete volumes.

Implementation references: [Tesseract command-line/TSV documentation](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html)
and [Poppler pdftoppm documentation](https://manpages.debian.org/experimental/poppler-utils/pdftoppm.1.en.html).
