# Local HTTPS staging verification — November 6, 2026

Task 5's same-machine HTTPS rehearsal passed, using fictional records and a
separate installation. One redirect bug was reproduced and fixed. Clinic-network,
browser/device acceptance and a second-computer test remain pending. The saved
DentDocs installation is stopped and its configuration/data were preserved.

## Changes

An HTTPS request to `/api/health/` previously returned a redirect to
`http://localhost/api/health`, losing HTTPS and the nonstandard staging port.
`deployment/nginx.conf` now keeps redirects relative and explicitly rewrites the
API's internal origin. The response becomes `/api/health`, which preserves the
browser's HTTPS hostname and port. No forwarded-protocol trust or certificate
verification bypass was introduced.

[Caddyfile.local-test](deployment/https/Caddyfile.local-test) provides a loopback
rehearsal profile: HTTPS 18443, HTTP redirect 18083 and upstream web 18084. It accepts
`localhost` and the user's working name `dentdocs`. Its admin endpoint is disabled,
HTTP/3 is disabled for this test, and it does not install CA trust in Windows or a
browser. [Caddyfile.example](deployment/https/Caddyfile.example) now uses `dentdocs`
as the proposed working name; actual private name resolution/trust still needs
provisioning before clinic use.

[scripts/verify-https.py](scripts/verify-https.py) is a read-only transport verifier.
It checks certificate/hostname/expiry, TLS version, HTTP and API redirects, static
assets, privacy headers and unauthenticated access denial. An optional
`--connect-ip` maps only the URL hostname within that test process; the original
hostname is still used for TLS verification. No OS DNS/hosts change is needed.
Fourteen regression cases cover unsafe redirects, dropped ports, invalid origins
and restoring the scoped resolver after failure.

## Evidence

- Official **Caddy 2.11.9** Windows executable; its downloaded archive matched the
  published **SHA-512** checksum. Both Caddy configurations validated successfully.
  The download/checksum record is included in the sanitized evidence below.
- Real TLS **1.3**, chain/hostname verification enabled and certificate expiry
  checked. Untrusted-CA and wrong-hostname connections were rejected. Both
  `localhost` and `dentdocs` passed HTTPS/HTTP redirect and asset checks.
- Windows did not resolve either `dentdocs` or `dentdocs.localhost` in this test.
  `dentdocs` therefore used a test-client-only mapping to 127.0.0.1. TLS and
  hostname verification stayed enabled. No DNS, hosts, firewall or OS trust-store
  changes were made. The test CA was absent from both Windows root trust stores.
- Secure, HttpOnly, SameSite=Strict session cookies; temporary-password change,
  notice acknowledgement, sign-in/logout and server-enforced idle expiry passed.
  The secure cookie was not sent to the HTTP upstream. Forged origins and missing
  CSRF tokens were rejected. A sign-in/activity/document/logout round trip also
  passed under the requested `dentdocs` hostname.
- Upload and exact original-file download, actual printed OCR, named review,
  explicit validity, actual hybrid search and named administrative-summary approval
  passed over verified HTTPS using disposable fictional records.
- Three page assets loaded over the verified origin. API redirects retained HTTPS,
  host, port and query string. CSP/privacy headers remained present. This is HTTP
  client/static-asset evidence, not a completed browser mixed-content/device test.
- Backend services stayed private. Process restrictions, private service exposure
  and actual OCR-worker-to-database denial passed service-boundary verification
  again. The reviewed API image and existing role/migration configuration were retained.
- An encrypted fictional database checkpoint restored into a separate database
  within the disposable project and matched all **19 persisted tables**. This was
  a database rehearsal, not a new full runtime or off-device recovery checkpoint.
- HTTP configuration rollback and HTTPS reapplication preserved the fictional
  original, accepted summary, keys/settings and CA. Proxy restart retained the
  same CA. Actual certificate renewal and expiry rollover were not exercised.
- **43 operator/recovery/research checks passed**, including the 14 new cases.
  The web image's production build and Nginx syntax check passed. The existing
  frontend chunk-size warning remains. Backend/model/frontend source was unchanged;
  earlier full-suite results retain their dates.
- The exact new web image was scanned with Grype 0.121.1, the existing refreshed
  November 5 database, squashed scope and no suppressions: **3 medium matches**.
  Existing API/reader/OCR findings and independent security review remain open.

Sanitized results, source/image identities and checksum provenance are in
[deployment/https-staging-2026-11-06.json](deployment/https-staging-2026-11-06.json).
Detailed local evidence is in ignored `work/https-staging-2026-11-06/`.

## Repeating the transport check

First prepare a **separate fictional-data installation** with fresh volumes and
credentials. Publish only its web service at `127.0.0.1:18084`, set its API to
`COOKIE_SECURE=true`, and allow only the exact rehearsal origins
`https://localhost:18443,https://dentdocs:18443`. Keep the saved installation's
`.env`, credentials and volumes unchanged. The local Caddyfile expects that
upstream; it is not a command to activate clinic networking.

Use a checksum-verified Caddy executable. Give its child process dedicated,
access-restricted `XDG_DATA_HOME` and `XDG_CONFIG_HOME` paths under ignored `work/`,
then validate/run `deployment/https/Caddyfile.local-test`. Caddy's generated CA is
under `<XDG_DATA_HOME>/caddy/pki/authorities/local/root.crt`. Pass that public root
certificate explicitly to the client; do not install the temporary CA globally.

```powershell
.venv/Scripts/python.exe scripts/verify-https.py --url https://dentdocs:18443 --connect-ip 127.0.0.1 --http-url http://dentdocs:18083 --ca <private-test-data>/caddy/pki/authorities/local/root.crt --output work/https-check.json
```

This command performs read-only transport checks. The recorded workflow/checkpoint
rehearsal additionally created fictional fixtures in the disposable installation.
Stop its proxy and remove only its dedicated containers/volumes and private test
CA/configuration after verification. Never apply drill cleanup to saved volumes.

## Final state and next checks

The test proxy, all disposable containers/volumes/networks, credentials, CA/private
keys and fictional checkpoint were removed. Test ports are closed. The original
installation's volumes, configuration, existing recovery key and models remain;
DentDocs is stopped. The checked Caddy binary and separately tagged test web image
remain local tools/artifacts; no system service or persistent HTTPS deployment was
installed. The source changes are on `codex/https-staging-verification` for review.
Implementation/evidence commit `2f2759f` is pushed in draft
[PR #2](https://github.com/OhsirIIII/DentDocs/pull/2), targeting `main`; no merge
approval or merge has occurred for this new PR.

The user chose `dentdocs` as a working name and can contact a groupmate remotely.
To continue, agree on an authorized private-network connection and actual hostname
resolution, provision reviewed certificate trust on the second computer, then test
the browser/device workflows and authorized/unauthorized access boundaries. That
network/device test has not happened. Operational CA/key custody, renewal,
monitoring, policy ownership and a matching full runtime recovery checkpoint also
remain pending. Existing independent security, clinic acceptance/policies,
licensing and real-patient release conditions are unchanged.

Official references consulted November 6:
[Caddy 2.11.9 release](https://github.com/caddyserver/caddy/releases/tag/v2.11.9),
[global options](https://caddyserver.com/docs/caddyfile/options),
[listener binding](https://caddyserver.com/docs/caddyfile/directives/bind),
[data/configuration locations](https://caddyserver.com/docs/conventions#file-locations).
