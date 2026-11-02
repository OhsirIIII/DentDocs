# Security follow-up — November 3, 2026

This continues Phase 8 and supersedes its pending scanner-triage notes.
**Real-patient/LAN release remains blocked.** Hardening and applicability evidence
are recorded here; neither scanner differences nor mitigations waive open findings.

## Changes verified

- API and recovery cryptography upgraded from 50.0.0 to 50.0.2, whose wheels use
  OpenSSL 4.0.3. Original encryption keys and encrypted data remain unchanged.
- Reader upgraded from Torch CPU 2.10.0 to 2.13.0, the patched release listed for
  CVE-2025-3000. The saved model weights were preserved. Real handwriting inference,
  embedding inference and semantic retrieval still work; no training was performed.
- Removed pip from API/reader images and unused setuptools from API. Reader retains
  patched setuptools 84.1.0 because PyTorch declares it as a runtime dependency.
  Runtime dependency requirements are checked using importlib metadata, not pip.
- API/reader root filesystems are read-only, all Linux capabilities are dropped,
  privilege escalation is disabled, CPU/memory/process counts are bounded, and
  temporary files use bounded noexec/nosuid memory filesystems. The original-files
  volume remains writable for authorized uploads; these settings are not a complete
  parser sandbox and do not remove the API's legitimate database/file access.
- API, reader, database and migration use an internal Docker backend network with
  no published ports or external route. Web bridges that network to a separate
  edge network and publishes only 127.0.0.1:8080. Application downloads/setup remain
  host-side; the running models do not require external network access.
- `scripts/verify-security.py` verifies actual container/process settings, dependency
  consistency, temporary-file behavior, service network membership and browser
  headers. It can also check a restored drill via `--drill-target`.

## Independent scan and vendor applicability

Grype 0.121.1 was downloaded from the official Anchore GitHub release and its Windows
archive checked against the release SHA-256 checksum. It scanned effective merged
filesystems (`--scope squashed`), rather than deliberately including removed layers.
No severity/package/CVE filters or suppression files were used. Reports, scanner
checksum, runtime inventories and the Debian tracker snapshot remain under ignored
`work/security-followup/`; only engineering summaries are committed.

| Image | Raw matches | Critical | High | Medium | Other |
| --- | ---: | ---: | ---: | ---: | ---: |
| API | 552 | 20 | 172 | 140 | 220 |
| Reader | 232 | 2 | 78 | 81 | 71 |
| Database | 3 | 0 | 0 | 3 | 0 |
| Web | 3 | 0 | 0 | 3 | 0 |

Counts include matches for multiple binary packages and upstream/distribution
namespaces; they are not counts of independently exploitable application bugs.
The larger API/reader counts are not hidden in favor of the earlier Scout results.

| Finding | Evidence / engineering disposition |
| --- | --- |
| Scout's removed gosu/Go findings | Independent database scan has no Go/gosu match and no high/critical match. Actual runtime has su-exec and no gosu. Prior removed-helper attribution is not evidence that the executable is still installed. |
| Vendored setuptools 70.3.0 BOM reports | Pip and its vendored BOM were removed from current API/reader filesystems. Independent scan has no pip/setuptools match; reader's actual declared setuptools requirement is satisfied by 84.1.0. |
| Torch CVE-2025-3000 | Upgraded to patched CPU 2.13.0; no torch match in final independent report. Source/model code uses local safetensors, not user-supplied pickle/TorchScript. |
| OpenSSL CVE-2026-63073 and CVE-2026-75803 | Independent scan matches `/usr/bin/openssl` at upstream version 3.5.7. Actual Debian package is 3.5.7-1~deb13u3; vendor tracker marks these resolved from 3.5.7-1~deb13u2. This is a backport-aware disposition, not blanket dismissal of OpenSSL findings. Crypto's separately bundled library is now OpenSSL 4.0.3. |
| libtiff CVE-2026-52490 | Vendor identifies tools/tiffcrop.c/process_command_opts. Supported OCR invokes local pdfinfo/pdftoppm/tesseract, never tiffcrop; its absence in the actual image was verified. Package tracker still marks the source issue open; other TIFF findings are not covered by this observation. |
| libcurl critical matches | CVE-2026-10536, 11856, 18924, 19931, 86414, 8926, 9079 and 92388 concern HTTP/2 dependency/push, credential reuse, proxy authentication, netrc or FTP-handle reuse. App transport is HTTPX; OCR passes local temporary paths, never remote URLs or libcurl credentials/options. Internal-only backend networking adds protection. These are engineering app-path constraints, not patched-library or formal risk-acceptance claims. |
| XML/PDF/image parsing | Unfixed/undetermined native-library findings remain. In particular Debian still marks libxml2 CVE-2026-6653/86140 and Poppler CVE-2026-107705 open for installed stable packages. Poppler's cited overlong-password path requires an application-supplied password; this app passes no password option and rejects encrypted PDFs. This observation does not establish safety against other PDF/XML/parser flaws. |

Stable-vendor revisions, affected functions and current invocation paths matter;
installing arbitrary newer shared libraries from another distro was not used as a
shortcut. Open native-library findings remain release requirements, even where
Debian assigns a lower urgency than the scanner. Obtain independent review of
reachability and any proposed package backport, parser isolation or risk decision.

## Validation and recovery

- 81 backend regression tests passed inside the restricted API image, including
  actual PDF/image OCR. Four reader crop/image checks and 22 recovery tests passed.
- Type checking/build, real semantic search, source reindexing, upload/OCR/PDF
  preview, summary approval/history/reload and desktop/mobile browser checks passed.
- Both real offline models ran after the upgrade; model weights/keys were retained.
- Runtime boundary and dependency-consistency checks passed; final pip-audit reports
  and exact inventories are retained locally. Scan discrepancies are not a clean
  container bill of health. Existing Starlette/httpx and Vite advisories remain.
- A new encrypted snapshot and isolated restore verify the changed image/network
  settings. All 19 tables and all 35 originals matched; restored process/network
  checks and both offline models passed. Copied sessions are revoked. Temporary account disabled and drill cleaned up.
  The earlier Phase 8 snapshot remains available as the preceding recovery point.

Run the read-only deployment check:

```powershell
.venv/Scripts/python.exe scripts/verify-security.py --output work/security-followup/runtime-security.json
```

Current private snapshot: `work/backups/security-followup-2026-11-03`.
Separate local recovery key remains `work/recovery-keys/phase8.key`. Neither is in
Git. Same-disk custody is not disaster recovery. Physical second-machine/off-device
restore, independent security assessment, open native-library remediation/decisions,
clinic policies, LAN HTTPS and explicit release sign-off remain outstanding.

Primary references: [Grype scope/CLI](https://oss.anchore.com/docs/reference/grype/cli/),
[official Grype releases](https://github.com/anchore/grype/releases),
[cryptography 50.0.2](https://cryptography.io/en/stable/changelog/),
[Torch advisory](https://github.com/advisories/GHSA-rrmf-rvhw-rf47),
[Debian OpenSSL backport](https://security-tracker.debian.org/tracker/CVE-2026-63073),
[second OpenSSL backport](https://security-tracker.debian.org/tracker/CVE-2026-75803),
[Debian libxml2](https://security-tracker.debian.org/tracker/CVE-2026-86140),
[Debian Poppler](https://security-tracker.debian.org/tracker/CVE-2026-107705),
[Debian TIFF affected tool](https://security-tracker.debian.org/tracker/CVE-2026-52490).
