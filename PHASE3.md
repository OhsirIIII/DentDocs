# Phase 3 — accounts, permissions and auditing

The app at http://127.0.0.1:8080 now requires a named staff account. The demo role
switcher and persona chooser have been removed. All records remain fictional.
Clinic release approval, LAN HTTPS, backup drills and DPO-approved notice wording
are still outstanding; this phase does not certify legal compliance.

## First sign-in

The initial administrator email is `admin@dentdocs.local`. Its randomly generated
temporary password is stored privately in `work/initial-admin.txt`, not source
control or the website. Open that local file, sign in, and choose a new password of
12–128 characters. The initial account was not used by automated browser tests.

After changing the password, review the confidentiality notice. Its acknowledgement
is stored per user with a server timestamp and notice version. The current wording
is explicitly a draft pending clinic DPO approval. Changing the notice requires a
new `NOTICE_VERSION` in `backend/app/security.py` and renewed staff acknowledgement.

Open **Staff** in the administrator navigation to create accounts, assign one of
the four fixed roles, disable/enable accounts, and reset passwords. New and reset
passwords are random, shown once, and must be replaced at the next sign-in. Share
them privately; passwords never appear in audit details. Role/status changes and
password resets revoke the account's existing sessions. The last enabled
administrator cannot be disabled or demoted.

For a new installation:

```powershell
python scripts/create-env.py
python scripts/bootstrap-admin.py
docker compose up --build -d
```

The second script also upgrades an existing Phase 2 `.env`, preserving its file
encryption key and database password. It does not reset an existing account. Do not
delete `.env` to recover a lost account; doing so can lose file encryption keys.

## Permission policy implemented

| Operation | Admin | Dentist | Assistant | Front Desk |
|---|---|---|---|---|
| Read active clinical records | Yes | Yes | Yes | No |
| Read active billing/appointments | Yes | Yes | Yes | Yes |
| Upload originals | Yes | Yes | Yes | Yes, administrative documents only |
| Edit metadata / create revisions | Yes | Yes | Except treatment plans | Administrative documents only |
| Verify completeness / restore old version | Yes | Yes | No | No |
| Archive, recover archives, read archived files | Yes | No | No | No |
| Manage accounts / read clinic audit console | Yes | No | No | No |

Assistant uploads cannot certify completeness; they are marked for review. Front
Desk responses exclude clinical documents, medical alerts, tooth data, date of
birth, guardian/emergency details, and clinic audit records. Clinical alert
generation is disabled for that role. Historical file versions are independently
authorized, so a clinical original cannot be fetched through a reclassified record.
Staged files can be attached only by their uploader and can be consumed only once.

The backend enforces this policy on bootstrap data, search, direct document IDs,
file downloads, print requests and every mutation. Client-provided persona headers
are ignored. Frontend guards are for usability, not the authorization boundary.

## Sessions and credentials

- Argon2id salted password hashes; no plaintext passwords in database records.
- Random opaque session cookies; only token hashes are retained server-side.
- HttpOnly, SameSite=Strict cookies; session rotation on sign-in/password change.
- CSRF tokens for authenticated mutations and an allowed-origin check.
- Five failed sign-ins lock that account identifier for 15 minutes. Error messages
  do not disclose whether an email exists.
- Ten-minute server idle expiry and eight-hour absolute expiry. Client interaction
  reports activity at most once per 30 seconds; passive session-status polling
  does not extend the server session. A client warning appears after nine minutes.
- Logout, disable, role change and password reset invalidate server-side sessions.
- Patient data and credentials are not persisted to localStorage/sessionStorage.
  Late responses from a prior login are discarded when clearing/changing accounts.

Compose is deliberately bound to loopback HTTP for this fictional-data build.
`COOKIE_SECURE=false` is necessary there. A future HTTPS deployment must set
`COOKIE_SECURE=true`, an explicit trusted `APP_ORIGIN`, and a clinic-approved LAN
certificate before exposing the service. Do not expose the current HTTP build on
the LAN. The secure-cookie default in the backend itself is true.

## Audit enforcement and database roles

New server events include document views, downloads, application print requests,
uploads, edits, verification, version/archive operations, successful/failed login,
logout, timeout, privacy acknowledgement, account changes, password changes/resets,
and authenticated access denials. Print events record a request; browser APIs cannot
prove physical printing or capture every operating-system print action.

Migration version 2 adds users, sessions, login throttling, acknowledgements and
upload ownership without deleting Phase 2 records or encrypted files. A one-shot
`migrate` container uses the database owner account. The running API receives only
the separate `dentdocs_app` database credential. That role is not a superuser and
has no audit UPDATE, DELETE or TRUNCATE privilege. Database triggers also reject
audit changes. Database owners/host administrators remain privileged; their access
must be governed operationally.

No user-account endpoint can edit or delete audit entries. Existing fictional
prototype events remain retained as historical seed records; their persona names
do not imply that those people have active accounts.

## Validation

- TypeScript checking and the production build passed.
- 24 backend tests passed: authorization, cookie/CSRF/origin checks, temporary
  password and notice gates, server timeout, logout, role/reset/disable revocation,
  last-administrator protection, throttling, file ownership, historical file
  isolation, audit immutability and the Phase 2 persistence/file/version contracts.
- Docker images and additive PostgreSQL migration succeeded against the existing
  Phase 2 volumes. The API's non-superuser identity and absent audit modification
  privileges were checked on the running PostgreSQL service, including rejection
  of a direct audit update.
- Browser checks passed against the deployed app: login, forced password change,
  notice acknowledgement, account creation, role assignment, password reset and
  session revocation, disable, Front Desk direct/file denial, refresh, and desktop
  and 390px mobile layouts. The nine-minute warning and explicit session extension
  were checked with the browser clock. No browser exceptions occurred. Verification accounts
  were disabled after testing; their audit history remains.

Run the automated contracts from `backend/`:

```powershell
..\.venv\Scripts\python.exe -m pytest tests -q
```

The Phase 2 deployment verifier now prompts for a real administrator sign-in when
authentication is enabled. Complete first sign-in in the app before using it.

## Remaining scope

Phase 4 adds the dedicated review queue and approved validity rules. Local OCR,
semantic search, summaries, and production recovery/security release checks remain
in their later phases. Clinical/legal checklist definitions, retention/disposal,
notice approval, backup key custody and real-data release require clinic decisions.

Implementation references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
and [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
