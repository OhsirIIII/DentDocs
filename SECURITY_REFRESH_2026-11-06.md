# Security refresh — November 6, 2026

This report continues task 1: refresh advisories, rescan current images, apply
supported fixes and assess remaining findings. It is an engineering assessment,
not independent release approval. Real-patient/LAN release remains blocked.

## Changes applied

- Refreshed Grype's database successfully. The latest available database returned
  by the service was built **November 5, 2026, 06:21:06 UTC**, replacing the
  November 3 database used previously. The refresh completed after downloading and
  extracting the database; the download-complete message alone was not treated as
  a successful refresh.
- Scanned the exact six existing service images, including migration, rather than
  assuming mutable tags matched the stopped containers. Then rebuilt all images
  with fresh vendor bases/package indexes and rescanned the resulting image IDs.
- Updated APT/libapt to **3.0.4** where older images contained 3.0.3. This addresses
  CVE-2026-109518 under [Debian DSA-6607-1](https://lists.debian.org/debian-security-announce/2026/msg00526.html).
  API was already on 3.0.4; OCR, model reader and migration needed the update.
- Added build-time minimum-version checks to the API/migration, OCR and reader
  Dockerfiles. A stale APT build now fails rather than silently shipping 3.0.3.
- Updated Alpine images to **3.24.4-r0** and apk-tools/libapk to **3.0.9-r0**.
  Web/database Dockerfiles now require those minimum package-manager versions.
  [Alpine release announcement](https://www.alpinelinux.org/posts/alpine-3.21.10-3.22.8-3.23.8-3.24.4-released/).
- No model retraining, dependency substitutions across distributions, secret/key
  regeneration, application schema changes or suppression rules were introduced.

Sources changed: `backend/Dockerfile`, `ocr/Dockerfile`,
`handwriting/Dockerfile`, `deployment/database/Dockerfile` and root `Dockerfile`.
Existing package-upgrade instructions were retained. A cache-bypassing rebuild
was used for this refresh; normal cached builds are not a periodic update policy.

## Scan results

Scanner: checksum-verified existing Grype **0.121.1**. Scans used the effective
merged filesystem (`--scope squashed`), the same refreshed database before/after,
and no vulnerability suppressions, severity filters or VEX waivers.

| Service | Before raw matches | After raw matches | Before critical/high | After critical/high | After medium/low/negligible/unknown |
|---|---:|---:|---:|---:|---|
| API | 233 | 233 | 2 / 78 | 2 / 78 | 82 / 18 / 53 / 0 |
| Model reader | 235 | 233 | 2 / 80 | 2 / 78 | 82 / 18 / 53 / 0 |
| OCR | 554 | 552 | 20 / 176 | 20 / 174 | 139 / 58 / 160 / 1 |
| Database | 3 | 3 | 0 / 0 | 0 / 0 | 3 / 0 / 0 / 0 |
| Web | 3 | 3 | 0 / 0 | 0 / 0 | 3 / 0 / 0 / 0 |
| Migration | 235 | 233 | 2 / 80 | 2 / 78 | 82 / 18 / 53 / 0 |

The two high matches removed from each affected Debian image correspond to APT
and libapt. Alpine package-manager updates do not reduce the remaining BusyBox
matches. Counts are scanner matches, not independently exploitable bugs. Changed
advisory coverage explains differences from earlier dated reports; earlier counts
have not been overwritten or relabeled as current.

Exact tested/scanned image IDs, fixed-package inventories and private evidence
hashes are in
[deployment/security-image-manifest-2026-11-06.json](deployment/security-image-manifest-2026-11-06.json).
Raw reports, logs, package inventories and vendor data remain ignored under
`work/security-2026-11-06/`. No configuration, credentials or original records are
included in the committed manifest.

## Distribution-aware triage

Official [Debian security data](https://security-tracker.debian.org/tracker/data/json)
was retrieved over HTTPS. High/critical matches were mapped to installed Debian
source packages, including unique installed-source mappings for upstream CPE
artifacts. Native `dpkg --compare-versions` checked installed revisions against
the vendor's fixed revision; upstream version strings alone were not compared.
Ambiguous or missing mappings remain explicit review cases.

The automated register contains **17 unique source-package/CVE pairs** with
vendor-resolved status and a verified sufficient installed revision, **74 pairs**
still open in vendor records, and **one pair requiring attribution review**.
These deduplicate source/package aliases across services, not all scanner matches.
Vendor-open status does not prove an application's exploit path, and
vendor-resolved status is not a blanket approval of the image.

| Source family | Installed source revision | Vendor-resolved/version verified | Vendor open | Attribution review |
|---|---|---:|---:|---:|
| acl | `2.3.2-2` | 0 | 2 | 0 |
| curl | `8.14.1-2+deb13u7` | 0 | 31 | 0 |
| cyrus-sasl2 | `2.1.28+dfsg1-9` | 0 | 1 | 0 |
| expat | `2.9.0-1~deb13u1` | 0 | 4 | 0 |
| gcc-14 | `14.2.0-19` | 0 | 2 | 0 |
| glibc | `2.41-12+deb13u4` | 0 | 3 | 0 |
| gnupg2 | `2.4.7-21+deb13u1` | 0 | 1 | 0 |
| gzip | `1.13-1+deb13u1` | 1 | 0 | 0 |
| krb5 | `1.21.3-5+deb13u1` | 3 | 1 | 1 |
| libarchive | `3.7.4-4+deb13u1` | 0 | 1 | 0 |
| libx11 | `2:1.8.12-1` | 0 | 1 | 0 |
| libxml2 | `2.12.7+dfsg+really2.9.14-2.1+deb13u3` | 0 | 8 | 0 |
| libxrender | `1:0.9.12-1` | 0 | 1 | 0 |
| ncurses | `6.5+20250216-2` | 0 | 1 | 0 |
| openssl | `3.5.7-1~deb13u3` | 13 | 0 | 0 |
| perl | `5.40.1-6+deb13u1` | 0 | 2 | 0 |
| poppler | `25.03.0-5+deb13u4` | 0 | 1 | 0 |
| sqlite3 | `3.46.1-7+deb13u2` | 0 | 3 | 0 |
| tesseract | `5.5.0-1` | 0 | 5 | 0 |
| tiff | `4.7.0-3+deb13u3` | 0 | 1 | 0 |
| util-linux | `2.41.5-0+deb13u1` | 0 | 4 | 0 |
| zlib | `1:1.3.dfsg+really1.3.1-1` | 0 | 1 | 0 |

The resolved set comprises 13 OpenSSL issues, one gzip issue and three Kerberos
issues. OpenSSL is `3.5.7-1~deb13u3`, gzip `1.13-1+deb13u1`, and Kerberos
`1.21.3-5+deb13u1`. This extends prior backport evidence; raw matches remain in
every report. The complete per-match register is private
`high-critical-vendor-triage.json`; grouped issues are in
`vendor-triage-summary.json` under the evidence directory.

### Findings that remain open

- **Native PDF/XML/image parsing:** stable-package issues remain, including
  [libxml2](https://security-tracker.debian.org/tracker/source-package/libxml2),
  [Poppler](https://security-tracker.debian.org/tracker/source-package/poppler),
  Tesseract and TIFF. Current supported vendor updates did not resolve all of
  them. Do not mix unstable-distribution libraries into the image or call parser
  isolation a patch. Independent reachability/remediation review remains required.
- **Curl/TIFF invocation constraints:** supported OCR passes local files to
  pdfinfo/pdftoppm/tesseract, never remote URLs, credentials or tiffcrop options.
  These existing constraints are engineering evidence, not formal acceptance of
  every issue in the dependency family. Raw critical counts remain visible.
- **Core OS/library families:** open source-family issues include glibc, GCC
  runtime libraries, ncurses, SQLite, util-linux, ACL, Perl, zlib and other OCR
  dependencies. Runtime restrictions reduce exposure but do not establish that
  every affected function is unreachable. Keep these in independent review.
- **CVE-2007-3149 attribution:** the scanner associates this with krb5; Debian
  tracks the condition under [sudo](https://security-tracker.debian.org/tracker/CVE-2007-3149).
  The OCR image has neither the sudo executable nor installed sudo package, as
  verified. The register retains this as attribution review, not a claimed krb5
  patch or a hidden match.
- **BusyBox:** database/web each retain three medium matches for
  [CVE-2025-60876](https://security.alpinelinux.org/vuln/CVE-2025-60876), across
  BusyBox-related binary packages at 1.37.0-r31. Alpine lists the installed stable
  revision as possibly vulnerable. No fixed stable version was established here;
  the production application does not invoke wget for staff requests. This is not
  a waiver or a clean-image claim.

## Verification

Testing used temporary project `dentdocs-security-20261106`, its own new
database/files volumes and loopback port 18081. No live database/original volume
was mounted into that project's database/files services. Existing model mounts
were read-only; existing secrets were not printed, reset or regenerated.

- All six tested image IDs matched the scanned rebuilt images.
- **135 backend tests passed**, including real printed OCR through the temporary
  worker and strict handwriting/embedding transport cases.
- **Seven native/service OCR tests passed**, including actual PDF/PNG/JPEG,
  invalid/encrypted/over-limit input, concurrency and temporary-file cleanup.
- Actual local handwriting and embedding requests passed; drafts remained
  unscored, with original integrity checked. No clinic records were saved.
- Schema 7 and restricted runtime history grants passed verification. UPDATE,
  DELETE and TRUNCATE privileges were absent on all seven protected history tables.
- Existing process/network checks passed: nonroot/read-only restricted services,
  no privilege escalation/capabilities, bounded temporary files, pip absence,
  dependency consistency, private networks, no native parser in API, denied
  OCR-to-database connection, fictional-data guard and browser security headers.
- `npm audit` reported zero known advisories for the locked frontend dependencies.
  No npm packages were changed. No new pip-audit result is claimed; host pip-audit
  was unavailable. Image scans included discoverable Python packages.
- All fixed package versions were checked independently in disposable containers.
  Python/TypeScript source was unchanged; the fresh web build passed. The existing
  test-library deprecation and large-bundle advisory are not declared resolved.

After evidence retention, only the verified temporary project's containers,
networks and volumes were removed. The original installation's containers were
recreated on the rebuilt images **without starting them**. The original database/
files volumes, `.env`, keys, model weights and snapshots were retained. DentDocs
remains stopped as requested; the next normal start uses the refreshed images.

## Repeat and review

For a later approved refresh, preserve configuration/volumes and use:

```powershell
docker compose --profile semantic build --pull --no-cache api migrate ocr db web handwriting
```

This builds images; it does not itself start services. Refresh the advisory DB,
scan immutable image IDs without suppressions, verify exact installed package
revisions against vendor data and rerun applicable isolated tests before adopting
the new images. Use a fresh evidence directory. Never publish `.env`, keys,
database dumps, originals or unconfirmed labels with the scan evidence.

This completes the available vendor-update pass, not all security work. Next:
independent review of open native/OS issues and attribution, documented remediation
or explicit risk decisions, and a fresh complete recovery checkpoint for the
updated images before release. The physical recovery, policy, UAT, HTTPS and
release-approval conditions remain unchanged. Nothing was merged or released.
