# Security and release review — Phase 8

Latest architecture: [PARSER_ISOLATION.md](PARSER_ISOLATION.md) moves native OCR
out of the API and adds a fifth recovery image. Earlier runtime descriptions and
scan counts below describe the preceding baseline.

Current continuation: [SECURITY_FOLLOWUP.md](SECURITY_FOLLOWUP.md) records independent
filesystem scans, newer runtime versions and deployment restrictions. Counts and
package-manager descriptions below are the preceding Phase 8 baseline.

Local fictional-data installation reviewed November 3, 2026. This is an engineering
baseline review, not a penetration-test certificate or compliance approval.
**Release status: blocked for real patient data and LAN exposure.**

## Changes applied

- Removed unused cloud SDK, Express/server and environment-loader dependencies.
- Removed Google Fonts requests; the interface uses its system fallback offline.
- Nginx now applies same-origin CSP (including frame-ancestor protection), denies
  framing, suppresses version headers, disables referrers and browser device/location
  permissions. Blob PDF/image previews remain supported; inline styling is allowed
  for the existing interface. API retains no-store/nosniff and has matching privacy
  headers. Interactive schema/docs endpoints are disabled.
- Bound malformed/oversized transcription, tag/checklist and warning-flag inputs.
  Existing server permissions, CSRF, origin checks, session revocation/expiry,
  Argon2 passwords, encrypted originals and append-only histories remain in force.
- Patched API cryptography to 50.0.0; reader Transformers 5.10.0, Pillow 13.0.0,
  PyTorch CPU 2.10.0 and setuptools 84.1.0. Reader dependencies are now fully pinned
  apart from the separately pinned CPU Torch wheel. Pip is pinned to 26.3 in images.
- Pulled/rebuilt base images and applied available Debian/Alpine package upgrades.
  Database privilege dropping now uses Alpine su-exec; the old gosu executable was
  removed. Runtime verified su-exec and no gosu; fresh isolated DB initialization
  and restore are part of the recovery check. API runtime pip/setuptools versions
  were directly checked. These changes do not erase historical base-layer SBOMs.
- Added full authenticated-encryption backup, isolated restore, session revocation,
  hash/count comparison, resource isolation checks and protected cleanup tooling.

## Review coverage

| Area | Evidence | Release work remaining |
| --- | --- | --- |
| Access control | Existing role, historical-source, staged-file ownership and archived-record tests; summary/history checks | Independent deployment review and clinic role assignment |
| Authentication/session | Password change, disabled/reset accounts, revocation, expiry and throttling tests | Real staff provisioning, incident procedures and TLS cookies on approved HTTPS |
| Injection/output | Parameterized ORM/SQL, document bounds, React text escaping and same-origin CSP | Independent adversarial testing, parser exploit assessment |
| Crypto/secrets | Encrypted originals, separate backup key, authenticated manifests and wrong-key/tamper tests | Approved off-device storage, alternate key custodian, key-loss/rotation procedures |
| Supply chain | npm audit, pip-audit of API/installed reader, all four Docker Scout image scans | Resolve or formally assess remaining findings below; repeat scans at release |
| Security configuration | Loopback-only web; no published DB/API/reader port, nonroot API/reader, no public schema | Approved LAN HTTPS, host firewall/OS patching and production configuration |
| Source/model integrity | Exact images/models in encrypted backup; hashes/source revisions; immutable named decisions | Dental handwriting held-out accuracy, verified labels and protected model custody |
| Logging/monitoring | Persisted audit and denied-access events; protected history DB privileges | Operator log review, incident response, disk/backup failure monitoring |
| Errors/resource limits | Upload/OCR/image/token limits, manual fallback and explicit reader failures; malformed input tests | Larger-load and independent parser/failure testing |
| Recovery | Fresh-volume restore, table/original equality, forced fresh sign-in and isolated resource guards | Physical second-workstation drill and approved recovery-time/recovery-point targets |

No clinical inference, legal validity or compliance certification follows from these
checks. Draft summaries, OCR and handwriting still require staff verification.

## Dependency findings

`npm audit` after removing unused packages reported zero known advisories. The
pinned API and installed reader pip-audit scans also reported zero known advisories
at the time checked. These scans do not cover all OS packages or vendored components.

Docker Scout v1.27.0 reports the following rule counts on the final image scans
(counts are scanner findings, not unique exploitable application defects):

| Image | Total | Critical | High | Medium | Low | Unspecified |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| api | 120 | 0 | 7 | 8 | 105 | 0 |
| handwriting | 33 | 0 | 3 | 2 | 28 | 0 |
| db | 73 | 4 | 31 | 30 | 7 | 1 |
| web | 12 | 0 | 1 | 5 | 5 | 1 |

Raw SARIF and pip/npm reports remain under ignored `work/phase8-*` paths. Do not
claim a clean container scan. Examples requiring follow-up include:

- Debian image findings for libxml2, expat, poppler and zlib with no fixed version
  supplied by the scanner. Poppler processes uploaded PDFs; assess this exposure
  before any real-data/LAN release rather than relying on loopback testing.
- Alpine libxml2 and musl findings remain after available repository updates.
- Scout still attributes Go findings to `/usr/local/bin/gosu` although that binary
  was removed and runtime now uses su-exec. It also reports setuptools 70.3.0 from
  pip's vendored `bom.cdx.json`, although runtime setuptools is 84.1.0. Obtain a fresh
  filesystem-aware SBOM/independent scan and document applicability; these reports
  have not been silently ignored or accepted as a release waiver.
- Reader Scout reports low-severity CVE-2025-3000 for Torch 2.10.0+cpu (suggesting
  2.13.0), while pip-audit did not flag it. Review the advisory discrepancy and test
  any further runtime migration against the saved model before changing it.

## Required before release

1. Resolve/assess every remaining high/critical image finding and relevant parser
   exposure, recording evidence and authorized risk decisions; recheck dependencies.
2. Perform a physical clean-machine restore with a second operator using an
   off-device encrypted bundle and separately obtained recovery key. Set approved
   recovery targets, backup frequency/retention and monitoring; exercise key loss.
3. Obtain clinic-approved privacy notice, retention/disposal, completeness/validity
   policies, staff roles and installation/security ownership; configure LAN HTTPS
   and secure cookies only after that deployment is approved.
4. Complete installation/recovery and staff guides, requirements/design/API/ERD and
   acceptance documentation, independent security review and explicit release sign-off.
5. Keep model accuracy claims experimental until verified clinic labels and
   writer-disjoint held-out dental tests exist. Existing supplied labels are drafts.

The app remains gated to mock mode. No PR merge, LAN publication or real-patient
release was performed as part of Phase 8.
