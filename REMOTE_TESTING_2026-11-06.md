# Private remote testing — November 6, 2026

The user authorized private internet testing from this computer and chose a
groupmate's own Tailscale account for the second device. A separate fictional-data
installation is running through private Tailscale HTTPS. The saved installation,
original volumes/configuration/keys and model artifacts remain preserved.

Host setup is verified. The groupmate accepted the device share and their device
is online, but reported a browser DNS lookup failure. Successful second-computer
application access and acceptance are **not yet confirmed**.

## What is configured

- Official Tailscale Windows **1.104.5**, installed through WinGet with installer
  hash verification; the executable's publisher signature was valid. The device's
  Tailscale name is `dentdocs`. Its actual private URL and addresses are retained
  only in ignored local configuration, not this public report.
- Tailscale Serve forwards private HTTPS **443** to the dedicated web service at
  `http://127.0.0.1:18085`. Public Funnel is off. No router port forwarding was set
  up. This is private remote access over the internet; devices need not share Wi-Fi.
- Tailscale DNS is enabled so the private full hostname resolves normally on this
  computer. No exit node or accepted subnet routes are configured. This does not
  route ordinary internet traffic through another device.
- The initial unrestricted tailnet grant was replaced with an HTTPS-only grant
  for this device's IPv4 and IPv6 addresses. Members and users who have accepted
  this device share can reach TCP 443. Policy assertions allow HTTPS and reject
  SSH, RDP, SMB, database, direct API and direct upstream ports for both address
  families. Existing unrelated SSH policy settings were preserved; network access
  to SSH is not granted by this test rule.
- One non-reusable device invitation was created and retained privately for the
  user to forward. No email or other message was sent to the groupmate. Their
  accepted share and online device were subsequently observed.
- A limited **assistant** test account was created in the separate installation.
  It cannot manage accounts, archive records or approve clinical review/completeness.
  Its first-use password-change and notice requirements remain active. The
  existing first-use administrator account was left untouched; no extra admin
  account was created. Credentials were not printed or committed.

The remote test installation uses fresh keys/credentials/volumes and the reviewed
API/model/OCR images plus the HTTPS-fixed web image. API `APP_ORIGIN` is the exact
private HTTPS origin and `COOKIE_SECURE=true`. Backend services remain unpublished;
only its web upstream is bound to loopback. It has fictional seed data, not copies
of the saved installation's records or the supplied dental photos.

## Host-side verification

- Actual private HTTPS passed with ordinary system certificate verification,
  including hostname, expiry and TLS 1.3. No custom CA or certificate bypass was
  needed. API redirects preserve HTTPS; static assets and privacy headers passed.
- The private sign-in page opened in the browser. Anonymous record access was
  denied. Owner/assistant sign-in, Secure/HttpOnly/SameSite cookies, first-use
  record-access gates and logout/session revocation passed over HTTPS. Neither
  account's password was changed and no human notice acknowledgement was bypassed.
- Effective network filters permit only TCP 443 for the two private address
  families. Public Funnel remains disabled, the correct loopback upstream is
  configured, and the accepted peer's addresses match the HTTPS rule.
- Private container/process boundaries and actual OCR-worker-to-database denial
  passed again. The original Compose installation is still stopped.
- **45 operator/recovery/research checks passed**, including two new cases for
  normal system certificate trust. The HTTPS verifier now accepts omission of
  `--ca` for publicly trusted certificates; explicit private-CA checks remain
  supported. No backend, frontend or model source changed in this continuation.

These are host-side/network-policy results. An online peer or a saved policy test
does not establish that the remote browser successfully opened DentDocs.

## Groupmate connection and DNS checks

1. Install and connect the Tailscale desktop application using their own account.
2. Accept the device invitation using that same account. A Tailscale website login
   alone does not connect the computer.
3. In the desktop client's preferences, enable **Use Tailscale DNS settings**.
4. Open the **full private `https://…ts.net/` URL**, not plain HTTP or just
   `dentdocs`. The same-host `--connect-ip` test mapping is not a remote setup.
5. Sign in with the separate assistant account. They must set their own password
   and review the notice before accessing the fictional records.

The submitted remote screenshot showed the accepted shared machine and a Brave
DNS lookup error (`DNS_PROBE_POSSIBLE`). Host HTTPS and peer authorization were
healthy at that point. A subsequent recipient screenshot showed **Use Tailscale
DNS settings already checked**. Leave that setting enabled. The next check is the
same HTTPS URL in Edge. If Edge also fails, compare `tailscale dns query` and
Windows `Resolve-DnsName` for the full private hostname on the recipient's computer.
This distinguishes the Tailscale resolver from Windows/browser resolution. A
custom browser DNS provider may bypass private name resolution; that remains a
hypothesis until the comparison. No certificate warning should be bypassed to
troubleshoot DNS. The outcome of these recipient-side checks is still pending.

Keep this hosting computer awake, online, and running Docker Desktop/Tailscale
during testing. Record the actual browser/device and whether sign-in, first-use
password/notice, original preview, upload, handwriting assistance, search and
role restrictions work. Clinical approval requires the appropriate owner/reviewer
role; the assistant test account is intentionally restricted.

## Private operator files and stopping

Ignored directory: `work/remote-testing-2026-11-06/`.

- `private/initial-admin.txt`: first-use owner login for this test installation.
- `private/groupmate-login.txt`: limited assistant's temporary login.
- `private/groupmate-network-invite.txt`: one-use device invitation, now accepted;
  it is not an app password or reusable invitation for additional testers.
- `private/connection.json`: actual HTTPS origin and private device addresses.
- `private/access-policy-before.hujson`: prior policy retained for review.
- `private/access-policy-applied.hujson`: restricted test policy.
- `runtime-command.json`: exact separate Compose project/command and image IDs.

These files contain credentials or account/network details and must stay private.
Give the tester only their own app credentials and authorized device access.
Do not send the owner password or a real clinic account.

The remote test stack and Serve are deliberately left running for the user's
requested test. To stop access, verify Serve still points only to this test's
`127.0.0.1:18085` upstream, then disable its HTTPS 443 Serve endpoint with
`tailscale serve --https=443 off`. Stop only the dedicated `dentdocs-remote-*`
Compose project recorded above; retain its volumes/keys if the test will resume.
Revoke the groupmate's device share when the test access is no longer needed.
Do not remove original volumes, regenerate saved keys or restore the earlier
unrestricted policy just to stop this app.

Source is still on draft PR #2's `codex/https-staging-verification` branch. No new
merge or real-patient release is authorized. Independent security review, actual
second-computer/browser acceptance, clinic policies, licensing, operational
certificate/backup custody and a matching full runtime recovery checkpoint remain
outstanding. This test installation is not a production deployment.

References: [private Serve](https://tailscale.com/docs/features/tailscale-serve),
[device sharing](https://tailscale.com/docs/features/sharing),
[client preferences](https://tailscale.com/docs/features/client/manage-preferences),
[MagicDNS](https://tailscale.com/docs/features/magicdns),
[grants syntax](https://tailscale.com/docs/reference/syntax/grants).
