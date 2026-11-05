# Release preparation — November 5, 2026

The branch is prepared for engineering review. It is not approved for real-patient
or LAN release. The existing Compose application remains fictional-data, loopback
HTTP. The sample HTTPS configuration below has not been activated or certified.

Draft PR [#1](https://github.com/OhsirIIII/DentDocs/pull/1) was created on
November 6, 2026 (Asia/Shanghai), after the user corrected the GitHub installation
under `OhsirIIII`. Repository discovery and PR creation succeeded; the earlier
403 blocker is resolved. Review material is retained in
[PULL_REQUEST_DRAFT.md](PULL_REQUEST_DRAFT.md). The PR remains a draft, not a merge
or release approval.

## Review scope

Latest security state: [SECURITY_REFRESH_2026-11-06.md](SECURITY_REFRESH_2026-11-06.md).
The advisory database was refreshed and supported OS updates verified on all six
images. Independent native/OS review remains pending; older scan notes retain dates.

The branch `codex/phase4-review-validity` contains persistent document/original
handling, real staff accounts, source-bound review and validity, isolated printed
OCR, experimental selected-line handwriting, local retrieval, named administrative
summaries, encrypted recovery and system documentation. Main has not been merged.

November 5 continuation adds bounded handwriting transport and regression coverage,
a reproducible offline validation benchmark, current security dispositions and this
HTTPS deployment preparation. Report research improvements separately from dental
accuracy, and describe a draft PR as a review artifact rather than release approval.

## Proposed HTTPS topology

```text
Approved staff browser --trusted HTTPS--> host reverse proxy :443
                      --> 127.0.0.1:8080 web --> private API
```

Keep API, database, model reader and native worker unpublished. Keep Compose web's
existing `127.0.0.1:8080:80` binding. A proxy running on the Docker host can reach
this loopback upstream; a separate proxy container's loopback would refer to itself.

`deployment/https/Caddyfile.example` is an example for a host-installed Caddy using
an internal certificate authority and a reserved placeholder hostname. It requires
clinic-approved DNS, reviewed Caddy installation/version, persistent protected CA
state, and explicit trust provisioning on each authorized device. Alternatively use
an approved organizational certificate/issuer. Never bypass certificate errors or
disable verification. Certificate/key custody and renewal are operational tasks.

Official references, consulted November 5, 2026:
[TLS directive](https://caddyserver.com/docs/caddyfile/directives/tls),
[reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## Configuration changes for an approved staging deployment

After choosing the actual hostname, preserve the existing configuration/keys and
edit only these non-secret settings in that staging installation:

```dotenv
APP_ORIGIN=https://dentdocs.clinic.example
COOKIE_SECURE=true
```

Use the real approved origin with its actual port if nonstandard. Do not use a
wildcard or retain unnecessary HTTP origins. Do not regenerate encryption/database/
reader credentials. Recreate API using the reviewed image/configuration while
retaining volumes. Use only the HTTPS origin for staff sign-in: a secure cookie
will not support the old ordinary HTTP sign-in path. Do not alter `DENTDOCS_MODE`
to bypass the fictional-data guard; there is no approved real-data mode today.

Before starting a reviewed host proxy, validate its configuration with the installed
Caddy version. Firewall ingress must be limited to approved clinic networks and the
reviewed proxy ports; do not publish database/API/worker ports. No public Internet
exposure or router port forwarding is part of this proposal. Access/error logging
must follow the clinic retention/privacy policy; do not log bodies or credentials.

## Staging acceptance evidence still required

- Trusted hostname/certificate chain, expiry/renewal and HTTP-to-HTTPS behavior.
- Cookies carry Secure, HttpOnly and SameSite; login, password replacement, notice,
  logout and session expiry work through the HTTPS origin.
- Forged origins and missing CSRF are rejected; no broad origin trust is introduced.
- Upload, original preview/download, review, search and summary decisions function
  without mixed-content requests; CSP/privacy headers remain present.
- Backend service exposure remains private and worker-to-database denial holds.
- A second authorized workstation can access only the approved proxy; an
  unauthorized network cannot. Document the browser/device matrix.
- Snapshot/drill and configuration rollback have been rehearsed; key custody,
  monitoring and certificate renewal responsibilities are assigned.

These are planned staging checks, not completed November 5 test results. The
existing `scripts/verify-security.py` targets the loopback mock deployment and does
not by itself validate this proposed host proxy or a second workstation.

## Outstanding release conditions

Independent security assessment and remaining native/OS findings; physical
off-device recovery; approved privacy/retention, role, completeness and validity
policies; staff acceptance; HTTPS staging evidence; licensing confirmation and
explicit release authorization remain outstanding. Completing source review or
merging a PR does not satisfy these conditions.

## Rollback and handoff

Preserve the last verified encrypted snapshot and separately held recovery key.
For a staging-only HTTPS configuration rollback, stop/restrict the host proxy and
restore the prior origin/cookie settings in the isolated fictional installation.
Do not re-enable real-data HTTP access as a rollback shortcut. Keep volumes,
originals, model files and encryption keys unchanged. Existing sessions may require
fresh sign-in. Record reviewed image identities and do not restore older runtime
images without acknowledging the older security posture.
