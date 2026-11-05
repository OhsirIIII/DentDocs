# Handwriting candidate evaluation — November 6, 2026

This completes the next evaluation pass for task 2 on the existing contrast/beam
candidate. New datasets, dental-label preparation and fine-tuning were deferred at
the user's request. No staff-verification flags, model weights or application
recognition defaults were changed.

## Scope and method

`training/evaluate_candidate.py` compares three fixed configurations:

- Baseline: original RGB line, greedy decoding.
- Contrast/greedy: grayscale autocontrast with 1% cutoff, greedy decoding.
- Contrast/beam: the same preparation, four-beam decoding.

The existing checkpoint and 15 previously inspected AMR validation crops were used.
All 15 references come from one validation writer, separate from the training
writer. They are assistant-checked research references, not clinician-confirmed
dental truth. Crop hashes/path containment and writer separation were checked.
The old test split and the unconfirmed dental packet were not evaluated.

Generation used the reader's current settings: at most 64 new tokens, configured
`max_time=40`, two CPU threads and no training. Each decoding configuration was
warmed up. Configuration order rotated between samples/repeats to reduce fixed
ordering bias. Latencies include image preparation, processing and decoding but
exclude initial model loading and HTTP/queue time. The test is not a service SLA.

The GPU run compared original images and two fixed synthetic conditions:
contrast 0.6 followed by brightness 0.65, and Gaussian blur radius 0.7. Synthetic
copies are repeated measurements of the same lines, not independent new samples
or evidence for other writers, glare, clipped text or unfamiliar dental notes.
There were 135 GPU inference measurements: 15 lines × three configurations ×
three conditions. No tuning search or new labels were introduced during this pass.

The CPU run used the security-refreshed deployment reader image, offline, with
two CPUs/3 GiB memory, read-only weights and research samples, and no datastore
mounts. Two original-image repetitions checked timing and reproducibility.
The saved DentDocs application remained stopped throughout.

## Accuracy and robustness

| Condition | Configuration | CER | Word error rate | Exact lines / 15 | Exact numeric strings / 6 numeric lines |
|---|---|---:|---:|---:|---:|
| Original | Baseline | 24.13% | 69.57% | 2 | 0 |
| Original | Contrast/greedy | 20.98% | 65.22% | 2 | 0 |
| Original | Contrast/beam | 19.93% | 60.87% | 2 | 1 |
| Dim/low contrast | Baseline | 24.13% | 69.57% | 2 | 1 |
| Dim/low contrast | Contrast/greedy | 20.28% | 65.22% | 2 | 0 |
| Dim/low contrast | Contrast/beam | 19.93% | 60.87% | 2 | 1 |
| Soft blur | Baseline | 23.43% | 71.74% | 2 | 0 |
| Soft blur | Contrast/greedy | 21.33% | 67.39% | 2 | 0 |
| Soft blur | Contrast/beam | 19.58% | 60.87% | 3 | 0 |

CER/WER use edit distance over uppercase, whitespace-normalized references with
punctuation retained. Numeric agreement compares ordered digit strings, including
punctuation within numbers; it does not establish correct tooth/date/dose/amount
field interpretation. An invented number on a reference line with no numbers is
counted as an error. No such number insertions occurred in these 135 measurements.
This absence is limited to these samples, not a general hallucination guarantee.

Compared with the baseline on original images, contrast/beam improved character
errors on seven lines, worsened three and left five unchanged. It gained no exact
lines on original images. Under dim/low contrast it improved six, worsened one and
left eight unchanged. Under blur it improved nine, worsened two, left four
unchanged and gained one exact line. These are paired line counts, not additional
independent examples.

Contrast/beam introduced no numeric regression relative to baseline in the three
GPU conditions, but absolute numeric accuracy remained only 0–1 of six lines.
Contrast/greedy lost one previously correct numeric line under dim/low contrast.
Consequently a lower aggregate CER does not establish uniform improvement.

## Repeated CPU comparison

| Configuration | CER | Median seconds | p95 seconds | Exact lines per repeat | Numeric lines correct per repeat |
|---|---:|---:|---:|---:|---:|
| baseline | 24.13% | 1.27 | 1.88 | 2/15 | 0/6 |
| contrast-greedy | 20.98% | 1.27 | 2.04 | 2/15 | 0/6 |
| contrast-beam | 19.93% | 3.59 | 5.18 | 2/15 | 1/6 |

Both CPU repetitions produced identical text for every configuration/line and
matched the GPU original-image predictions. Each configuration has 30 measured
calls (15 underlying lines repeated twice), not 30 independent examples. All 225
GPU/CPU measurements reached EOS. No numeric insertions occurred on the tested
nonnumeric lines.

The beam candidate took approximately 2.83 times the baseline median.
Different host load and rotated execution order explain why these timings differ
from the earlier November 5 single-pass measurements; neither run is a service SLA.

GPU environment: Torch 2.7.1+cu128, Transformers 4.57.1, Pillow 12.3.0. This is
the separate legacy research environment, not the application's dependency set.
CPU environment: Torch 2.13.0+cpu, Transformers 5.10.0, Pillow 13.0.0. Timing
comparisons use CPU results only; GPU timings are not substituted for local-service
latency. No cloud inference, downloads or unsafe model serialization was used.

## Decision

**Keep the current application default.** Contrast/beam remains the strongest
aggregate-text candidate on these research cases, but original exact-line matches
did not improve, three original lines regressed, numeric correctness remained
weak and CPU decoding is slower. The evidence does not support silently replacing
every existing suggestion or advertising better dental accuracy.

Task 2's current-data evaluation is complete. Model improvement/fine-tuning is
deferred, not blocked on a new staff-labeling task in this pass. A future optional
enhanced retry could expose the speed/quality tradeoff explicitly; that UI/API
feature was not added here. Broader independent examples and critical-field
acceptance criteria are required before a general default change.

## Evidence and reproduction

Aggregate results: [training/candidate-evaluation-2026-11-06.json](training/candidate-evaluation-2026-11-06.json).
Private detailed predictions/references remain in ignored directories:

- `work/handwriting/candidate-robustness-2026-11-06/`
- `work/handwriting/candidate-cpu-repeat-2026-11-06/run-01/`

The checkpoint and manifest hashes are recorded in reports. The current checkpoint
hash matched the experiment, and the staff-verified candidate count remained zero.
No private dental labels/photos or weights are committed. No app image or API
contract changed as part of this evaluation.

With separately provisioned local research samples/weights and compatible packages,
use a new destination for each run:

```powershell
python training/evaluate_candidate.py --device cpu --conditions original --repeats 2 --output work/handwriting/new-cpu-repeat
python training/evaluate_candidate.py --device cuda --conditions original dim-low-contrast soft-blur --output work/handwriting/new-robustness-run
.venv/Scripts/python.exe -m unittest discover -s training/tests -q
```

Four metric checks cover invented-number penalties, number ordering/punctuation,
matching comparison cases, and numeric/exact-line regressions hidden by aggregate
improvements. They passed. Application tests from the November 6 security pass
retain their own date and were not unnecessarily rerun for this research-only work.
