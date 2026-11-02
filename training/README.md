# Handwriting experiments for DentDocs

The first clinical handwriting preparation, baseline comparison and bounded
fine-tuning experiment are complete. The experimental base checkpoint is now connected to the DentDocs Upload screen
through the Phase 5 handwriting extension; see ../PHASE5_HANDWRITING.md. The
experiments below describe its limited measured quality. No clinic accounts, records, originals, keys or
Docker services were changed by these experiments.

## Data and attribution

**AMR Contributors (2026), African Medical Records (AMR): Nigerian Handwritten
Clinical Records Dataset**, [original dataset](https://huggingface.co/datasets/Nigeria-Health-data-OCR-pipeline/African-Medical-Records),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Source revision: `fa27d29dae4128ac45f035fd580928c84bec4e98`.

Downloaded 62 paired records, consisting of 74 page images and 62 transcription
files, from 15 contributors (approximately 219 MB). The source authors describe
the records as synthesized/volunteer-produced clinical documents. Source content
was downloaded as data only; its bundled Python loader was not executed.

`prepare_amr.py` records source attribution and image/text SHA-256 hashes, and
assigns writers to fixed train/validation/test splits. All pages from a writer
remain in the same split. The source provides page-level transcriptions, not
ready-to-use line labels.

`amr-line-annotations.json` is an adaptation of the source: manually selected crop
coordinates and assistant-checked transcriptions. The initial 47 crops are from
three pages/writers: 21 training lines, 15 validation lines and 11 test lines.
The crop labels preserve visible text rather than automatically expanding clinical
abbreviations. Some spacing and punctuation are transcribed manually; these labels
have not been independently checked by a clinician. The sample includes headings,
demographics and clinical statements and does not represent the full corpus.

`prepare_amr_lines.py` reproduces these crops and checks source hashes, image
boundaries, duplicate image content and writer separation. Data, model weights,
prediction files and the isolated environment stay in ignored `work/handwriting/`
and `work/htr-env/`, outside source control.

## Measured results

Final valid comparison: `work/handwriting/amr-base-run-001/report.json`.
Pretrained model: [Microsoft TrOCR base handwritten](https://huggingface.co/microsoft/trocr-base-handwritten),
source revision `eaacaf452b06415df8f10bb6fad3a4c11e609406`.
TrOCR is a single-line recognizer; these results do not demonstrate full-card/table
understanding or automatic row/column attribution.

| Measure | Pretrained base | Base after fine-tuning |
|---|---:|---:|
| Validation character error rate (15 lines) | 28.0% | 24.1% |
| Test character error rate (11 lines) | 23.5% | 18.8% |
| Validation exact-line matches | 1/15 | 2/15 |
| Test exact-line matches | 1/11 | 1/11 |

Character error rate uses Levenshtein edits divided by reference character count,
after uppercasing and collapsing whitespace. Punctuation remains significant.
An error rate can exceed 100% when there are many inserted characters. It is not
a calibrated confidence score or clinical-field accuracy measure.

Fine-tuning used 64 optimizer steps, batch size 4, accumulation 2, learning rate
0.00001, frozen image encoder and mixed precision on an RTX 4050 laptop GPU. The
training stage took approximately 22 seconds after loading/evaluation; total setup
and model downloads took longer. Repeated exposure to 21 lines made training loss
very low, which is consistent with overfitting risk. Validation determined the
relative checkpoint recommendation. Test examples were held out of training but
inspected during feasibility work, so this is not an untouched release benchmark.

The small-model comparison (`amr-run-002`) was substantially worse: validation CER
74.5% before and 70.3% after fine-tuning; test CER 105.5% before and 88.2% after.
It is not a useful transcription checkpoint for these samples. The earlier
`amr-run-001` is **invalid** because a decoder start token was incorrectly
overridden; retain it only as debugging history and do not cite its scores.
The training script now preserves the checkpoint's generation start token.

The base-model improvement is encouraging but cannot establish generalization to
dental cards, a new clinic writer, tooth numbers, medications, dates or amounts.
The experimental base checkpoint is integrated as an editable draft reader; it has not been established as clinically valid.
The next useful data work is more verified clinical/dental line crops from several
writers, followed by a fresh independent evaluation. GNHK was researched as a
possible supplementary photographed-handwriting source but was not downloaded or
used in this experiment; no benefit from it is claimed.

## Offline draft transcription

`transcribe_line.py` reads a local image, optionally rotates it counterclockwise,
crops a selected line, loads local safetensors weights and produces a draft JSON.
It records image/model hashes and crop coordinates, and returns `confidence: null`
with an explicit staff-verification requirement. It does not save a clinic record,
infer a diagnosis or upload images to any external service.

A held-out source crop was successfully transcribed as `Clinical Summary`, with
its exact preview and draft saved at:

- `work/handwriting/clinical-line-demo.png`
- `work/handwriting/clinical-line-demo.json`

Run from the project folder:

```powershell
work/htr-env/Scripts/python.exe training/prepare_amr.py
work/htr-env/Scripts/python.exe training/prepare_amr_lines.py
work/htr-env/Scripts/python.exe training/train_names.py --dataset work/handwriting/amr-lines --output work/handwriting/amr-base-run-002 --model work/handwriting/pretrained-base --steps 64 --scope "Clinical-line feasibility; not dental validation"
work/htr-env/Scripts/python.exe training/transcribe_line.py work/handwriting/amr/htr/AMR_037_HTR.png --checkpoint work/handwriting/amr-base-run-001/trained --box 750 120 1350 245 --output work/handwriting/draft.json
```

The training script retains its original `train_names.py` filename but accepts
any prepared train/validation/test manifests of image/text pairs. Training and
evaluation use local GPU inference. Only initial public dataset/model downloads
require network access. Exact installed packages are recorded in
`work/handwriting/training-environment.lock` (PyTorch 2.7.1+cu128 and Transformers
4.57.1). The application environment and backend dependency locks are unchanged.

The earlier user-supplied names archive was prepared into a separate 2,048/128/128
subset with empty/sentinel labels filtered and identical-image hashes excluded
across the selected splits. It has not been fine-tuned here: clinical-line
evaluation took priority. The Synthea CSV archive was not used for OCR training.

## Verification and next application work

All 74 source images and 47 crops decoded successfully. Preparation verified
writer separation and crop boundaries, and metric/label-filter checks passed.
An offline held-out crop transcribed successfully using local trained weights.

The crop/rotation selector, authenticated local inference, editable draft text,
retained source history and named staff review are now implemented in Upload.
See ../PHASE5_HANDWRITING.md for operation and validation. Further model adaptation
still depends on verified dental labels; application integration did not turn
these research measurements into clinical validation.


## User-supplied dental review packet

A separate, private review packet is in
`work/handwriting/dental-examples/STAFF_REVIEW.md` with editable `staff-review.csv`.
It contains 24 procedure-line crops from five unique source photos; patient headers
and signatures were excluded. Visual/model suggestions are drafts only, and crops
with overlapping or clipped strokes need correction or rejection. Nothing in this
packet has been used for training or imported into the running app.

Use `training/import_dental_review.py` after staff correction. Only explicit verified
rows with an accepted crop, nonempty corrected transcription/reviewer/writer group,
no `[unclear]` marker and a matching crop hash are eligible. The importer creates
verified candidates without training or automatically splitting writers. Its first
run accepted zero of the 24 pending entries, as intended. Keep source photos, crop
images and annotations private under ignored `work/` rather than committing them.
