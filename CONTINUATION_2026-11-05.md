# Security, handwriting and release preparation — November 5, 2026

This continues the three user-selected workstreams. It records engineering work,
not independent security certification, dental validation or release approval.

## Security changes

The API's handwriting and embedding connections now stream and bound private-reader
responses (64 KiB and 1 MiB respectively), disable redirects/environment proxies,
request uncompressed responses and reject compressed output. Connect/write/pool
timeouts are explicit. Handwriting transport admits only two simultaneous calls.
The worker's existing one-job inference limit remains unchanged.

Handwriting output must match the exact draft contract, original SHA-256, region,
rotation and model-hash format. Invalid Unicode, malformed/deep JSON, unexpected
fields, fabricated approval/confidence and malformed crop evidence are rejected.
Embedding output must match the pinned model, batch cardinality, 384-dimensional
finite normalized vectors and expected response fields. Transport failures remain
safe errors; keyword fallback and manual entry remain explicit alternatives.

New regression suites: `backend/tests/test_handwriting_transport.py` (21 cases)
and `backend/tests/test_embedding_transport.py` (15 cases). They exercise hostile
responses, status/timeouts, concurrency recovery and ordered embedding batches.
The whole backend suite is rerun in the final API image; see final results below.

The API image was rebuilt on the available Python 3.12-slim base. Its apt step
reported no outstanding upgrades. Original keys, data volumes and model weights
were preserved. These transport changes do not patch native parser libraries.

### Advisory review and scans

Grype 0.121.1 scanned effective filesystems without suppressions. A fresh advisory
database update did not complete and was stopped. The available database is dated
**November 3, 2026, 06:20:47 UTC**. November 5 scans therefore use that advisory
snapshot and must not be represented as a fully refreshed November 5 advisory set.
Reports are private under `work/security-2026-11-05/`.

| Image | Raw matches | Critical | High | Other findings |
|---|---:|---:|---:|---|
| Rebuilt API | 232 | 2 | 78 | 81 medium, 18 low, 53 negligible |
| Existing isolated OCR | 552 | 20 | 174 | 138 medium, 58 low, 161 negligible, 1 unknown |

These are scanner matches, not independently exploitable vulnerability counts.
No finding was hidden to reduce totals. Reader/database/web were not rescanned in
this continuation; their older scans retain their original dates.

Vendor pages consulted November 5 still list the cited
[libxml2 issue](https://security-tracker.debian.org/tracker/CVE-2026-86140) and
[Poppler issue](https://security-tracker.debian.org/tracker/CVE-2026-107705) as open
for the applicable stable packages. Do not substitute mixed-distribution libraries
or declare these fixed because OCR is isolated. Existing no-password/local-file
invocation constraints remain engineering evidence requiring independent review.

The actual API `openssl` and `libssl3t64` packages are `3.5.7-1~deb13u3`.
Debian's [OpenSSL tracker](https://security-tracker.debian.org/tracker/source-package/openssl)
lists resolved issues; specifically, the newer reviewed
[CVE-2026-54873](https://security-tracker.debian.org/tracker/CVE-2026-54873) and
[CVE-2026-72897](https://security-tracker.debian.org/tracker/CVE-2026-72897) are fixed
in that security revision despite upstream-version scanner matches. This extends
backport evidence, not a blanket waiver of every OpenSSL/native finding.

## Handwriting experiment

`training/benchmark_reader.py` performs offline inference only. It verifies crop
hashes/path containment and train/validation writer separation, preserves weights,
uses a new output directory, and evaluates **validation only**. No old test sample
was revisited in this continuation. The validation set is previously inspected,
contains 15 crops from one validation writer and has assistant-checked research
labels. It is not independently confirmed dental ground truth.

The experiment compared current raw/greedy inference with conservative grayscale
autocontrast (1% cutoff), four-beam decoding and bounded projection-based deskew.
Each run used 64 new tokens and a 40-second generation time bound, matching the
reader's current generation limits. All measured generations reached EOS.

| Preparation / decoding | Character edits / 286 reference characters | CER | Exact lines / 15 | Numeric-string agreement / 6 lines | CPU median seconds | CPU p95 seconds |
|---|---:|---:|---:|---:|---:|---:|
| Raw / greedy (baseline) | 69 | 24.13% | 2 | 0 | 2.28 | 3.17 |
| Raw / four beams | 64 | 22.38% | 2 | 0 | 7.15 | 11.55 |
| Contrast / greedy | 60 | 20.98% | 2 | 0 | 2.59 | 4.98 |
| Contrast / four beams | 57 | 19.93% | 2 | 1 | 5.68 | 8.25 |

This is a 4.20 percentage-point reduction in character error for the most promising
candidate, with a substantial latency tradeoff. The numeric metric compares ordered
digit strings; it does not establish correct clinical date/tooth/dose attribution.
Exact-line results remained poor. Concurrent host workloads and 15 samples limit
latency conclusions; these are warmed single-pass measurements, not a service SLA.

GPU research environment: Torch 2.7.1+cu128, Transformers 4.57.1, Pillow 12.3.0.
Isolated CPU environment: Torch 2.13.0+cpu, Transformers 5.10.0, Pillow 13.0.0,
two CPUs and 3 GiB memory, no network, read-only model/dataset, no datastore mount.
Both environments reproduced the four configurations' character-error counts.
CPU output: `work/handwriting/cpu-ablation-2026-11-05/run-01/report.json`.
GPU output: `work/handwriting/reader-ablation-2026-11-05/report.json`.

Deskew plus contrast worsened GPU CER to 25.17% with greedy decoding and 24.48%
with four beams. That method was rejected and was not carried into the CPU shortlist.
Tighter crop/line-selection improvements still require independently reviewed crop
boundaries; automatic table-line removal was not introduced.

**Decision:** retain the current application reader and model weights as the
baseline. Contrast/four-beam is a candidate, not a deployed default. More exact-line
and critical-number evidence is required before promotion. No dental retraining,
automatic abbreviation correction, inferred text or calibrated confidence was added.
The private unconfirmed dental packet remains excluded from trusted evaluation.

Reproduce the CPU comparison with a compatible prepared local environment:

```powershell
python training/benchmark_reader.py --device cpu --profiles raw contrast --beams 1 4 --output work/handwriting/new-validation-ablation
```

Use a **new** destination and separately provisioned safetensors checkpoint. CPU/GPU
versions and result hashes are retained by the script. The benchmark is not part of
the reader HTTP service; no experiment settings were silently enabled in the app.

## Release preparation

Implementation `7683524` was committed and pushed to the existing branch; local
and remote-tracking hashes matched after push. The initial PR attempt failed with
403. On November 6, 2026 (Asia/Shanghai), the user corrected the GitHub installation
under `OhsirIIII`; discovery and creation succeeded through the connector.
Draft PR [#1](https://github.com/OhsirIIII/DentDocs/pull/1) is open and unmerged.
The review title/body is preserved in [PULL_REQUEST_DRAFT.md](PULL_REQUEST_DRAFT.md).
This resolves the connector blocker, not the outstanding release conditions.

See [RELEASE_PREPARATION.md](RELEASE_PREPARATION.md) for the review scope, HTTPS
topology, host Caddy template, configuration steps, planned staging checks, rollback
and remaining release conditions. The template is not installed/activated. It does
not expose the local app or change cookies/origins. No merge or deployment to real
patients is authorized by preparing a draft PR.

The existing encrypted snapshot predates this continuation. It remains valid for
its recorded source/images, not a recovery proof for these new changes. Create and
verify a fresh complete snapshot before treating the updated branch as a new
recovery/release checkpoint; preserve the previous snapshots and key custody.

## Verification and remaining work

- Final containerized backend suite: **135 passed**, including 36 new private-reader
  transport cases. Existing Starlette/httpx deprecation remains.
- Final live security-boundary verification passed: restricted execution, internal
  networks, no native parser in API, worker datastore denial and loopback headers.
- Actual local handwriting and embedding round trips passed both strict transports
  without saving clinic records; handwriting remained draft/unscored.
- GPU six-configuration and deployment-version CPU four-configuration validation
  experiments completed. No training or production-reader promotion occurred.
- Final API scan: image `sha256:f9e08bb6ef28b2ed95b5ad7d1b5f2eaf28bf43dd3009bfc19a19f952acbd257c`,
  232 raw matches using the explicitly dated advisory snapshot. Native OCR remains
  at 552 matches. Findings were not suppressed.
- Markdown links, Python syntax and diff whitespace were checked. Frontend/native
  worker/operator source did not change; their older suite results were not
  relabeled as new runs. HTTPS staging checks remain unperformed.

The first host-side API test attempt could not create its temporary directory; an
attempt with a workspace temp directory stalled and was stopped. An initial
container invocation lacked the documented `DENTDOCS_MIGRATE=true` test setting and
was stopped. The final supported isolated-container command enabled initialization
and completed all 135 tests. No test database was substituted for the live store.

Remaining: refresh the advisory database and repeat scans; independent security
assessment/remediation decisions; new confirmed dental evaluation/crop boundaries;
candidate latency/accuracy acceptance before reader promotion; fresh full recovery
checkpoint and physical off-device drill; approved clinic policies/UAT; validated
HTTPS staging, license confirmation and explicit release authorization.
