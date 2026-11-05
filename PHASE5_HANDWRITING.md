# Phase 5 extension — assisted handwriting transcription

Implemented in the existing local fictional-data installation. The experimental
TrOCR base model from `training/README.md` is now connected to Upload. These are
editable suggestions, not reliable automatic dental-chart transcription or a
real-patient release. Phase 6 semantic search remains pending.

## Use the workflow

1. On Upload, choose the patient and an original **JPG/PNG**.
2. Open **Handwriting assistance · experimental**. Rotate the image if needed.
3. Drag over one complete handwritten line, or enter left/top/right/bottom
   percentages using the labeled number inputs. Coordinates refer to the rotated
   image. The original file is retained unchanged.
4. Click **Suggest transcription**. Compare the suggestion with the selected line,
   then correct it. Repeat for additional lines; at most 20 suggestions per original.
5. Click **Continue to metadata review**. Enter the date and other metadata from
   the original, check patient linkage, and review the combined edited text.
6. Save the record. It enters the existing review queue. An eligible named reviewer
   records the decision and note. This does not verify completeness or validity.

Handwriting suggestions are unscored. Legacy numeric confidence fields are set to
zero for the existing review mechanism, but the interface labels handwriting as
unscored/staff check rather than presenting zero as a measured accuracy.

Selected regions are **partial transcriptions**, not proof that all pages, rows,
tooth diagrams or amounts have been interpreted. Check wire sizes, arrows, tooth
numbers, dates and amounts against the original. Abbreviations are not silently
expanded into clinical interpretations. PDFs retain the existing printed OCR and
manual-entry paths; the handwriting selector currently supports image files only.

Front Desk retains manual administrative uploads and cannot generate handwriting
suggestions for unclassified originals. Administrators, dentists and assistants can
process their own unused originals. An assistant's existing treatment-plan editing
restrictions remain. Reader failures leave retry/manual entry available; no false
success is shown.

## Retained evidence and review

Each model draft records its source SHA-256, selected normalized/pixel region,
counterclockwise rotation, model hash/engine, server timestamp and suggesting staff
member. Migration 5 adds `handwriting_drafts` without replacing existing records or
volumes. History is append-only, with PostgreSQL runtime UPDATE/DELETE/TRUNCATE
privileges revoked and mutation triggers in place.

All generated drafts for the attached original are retained as source history,
including drafts removed from the final combined text. Edited text is saved
separately. The server supplies the evidence; the client cannot forge, remove or
raise its confidence. It requires matching upload owner and patient and forces
review. There is no automatic promotion of a model suggestion to approved text.

**Handwriting source history** appears in the viewer's **Extracted Text** tab and
the review inspector. It displays original draft text and region/model details;
source status remains draft after a separate review decision. Front Desk responses
omit this clinical source history, including in returned historical snapshots.
Replacing an original clears stale sources; restoring a historical version restores
its associated evidence under the existing version/review rules.

## Local processing setup

The reader is a separate private Docker service with **no published host port**.
Only the API calls it using a private credential. It uses the local AMR experiment
weights mounted read-only, local-only model loading and offline library settings.
It runs on CPU to avoid a new host GPU service dependency; the training environment
and GPU remain separate. No image is sent to a cloud model and no runtime model
download is required.

The service allows one inference at a time, has a read-only container filesystem,
a temporary-memory directory, a 3 GB memory limit, two CPUs and a process limit.
Input is capped at 20 MB and 30 megapixels; PNG/JPEG decoding and region bounds are
checked. The API checks original-file integrity before inference and verifies the
reader's returned source hash. The model gets at most 64 new tokens and a generation
time limit; the API request times out after 65 seconds. Source text and credentials
are omitted from reader logs and audit details. This is not a hardened hostile-file
parser or a production security certification.

On this installation the credential is configured in the existing private `.env`.
Do not regenerate other settings or encryption keys. Model files and training data
are intentionally ignored by Git, so a source-code checkout alone does not include
working model weights. The current mount expects:

`work/handwriting/amr-base-run-001/trained/`

To configure a prepared installation and start the optional service:

```powershell
.venv/Scripts/python.exe scripts/configure-handwriting.py
docker compose --profile handwriting up --build -d
```

The configuration script preserves existing credentials. Normal `docker compose up`
without the profile does not start a missing reader; the UI reports unavailability
and preserves printed OCR/manual entry. Preserve the local model artifact and its
model hash with installation assets, in addition to normal clinic data/key backups.
Existing backup/restore release work remains Phase 8 scope.

## Validation

- Full backend suite: **63 tests passed**, no skips, in the packaged OCR environment.
  Includes ownership/role/CSRF restrictions, invalid regions/rotation, PDF rejection,
  failed-reader retries, mismatched source integrity, immutable sources, enforced
  review/unscored state, replacement/restore and the 20-suggestion bound.
- Four direct reader tests passed: crop geometry, rotation before crop, invalid
  bounds/formats and oversized-image rejection.
- Type checking, production build and whitespace checks passed.
- Deployed Edge acceptance passed with a fictional clinical-line fixture: real
  offline model inference, 270-degree correction, drag and keyboard selection,
  editable suggestion, metadata/save, original-byte download, retained provenance,
  named review and separate completeness/unknown validity. Failure recovery and
  desktop/390px mobile layouts were checked without browser exceptions.
- PostgreSQL migration 5, append-only history privileges and original-file integrity
  were checked after acceptance. Fictional acceptance records are archived and the
  temporary verification account disabled; the clinic administrator is unchanged.

The model's existing limited AMR experiment remains the only reported recognition
measurement. App acceptance verifies the workflow, not dental transcription
accuracy. The user's 24 dental-label drafts remain explicitly unconfirmed and were
not used for training or imported into the running database. The new integration
does not change that status. One upstream Starlette/httpx deprecation warning
remains in the backend tests.

Reader tests from the project folder:

```powershell
docker compose run --rm --no-deps -v "${PWD}/handwriting/test_server.py:/service/test_server.py:ro" handwriting python -m unittest test_server -v
```
