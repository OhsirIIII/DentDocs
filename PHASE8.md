# Phase 8 — encrypted recovery and release review

Current runtime changes and independent scan dispositions are in
[SECURITY_FOLLOWUP.md](SECURITY_FOLLOWUP.md). Python pip is removed from app images;
use host-side audit tools and importlib metadata for runtime inventories.

Implemented for the local fictional-data installation. Recovery tools and local
restore evidence are available; **real-patient release remains blocked** by the
outstanding items in SECURITY_REVIEW.md. This phase does not certify compliance.
Database schema remains version 7; Phase 8 adds operational tools, not a schema change.

## Backup and key custody

`scripts/recovery.py` creates a full encrypted bundle containing a PostgreSQL custom
format dump, encrypted originals volume, `.env` (including required private keys),
source snapshot, both offline models and the exact four runtime Docker images.
Runtime grants are recreated by the restored migration job. Accounts/password hashes,
history, versions, extraction provenance, policies and summary decisions are in the dump.

Each component uses AES-256-GCM with a fresh random 96-bit nonce and authenticated
component name. An encrypted manifest records component sizes and SHA-256 hashes.
The stream is bounded below GCM's per-message limit. Incomplete backups never get
the final destination name. The recovery key is a separate random 32-byte file;
**losing it makes the backup unrecoverable**. It is different from the original-file
key, which is inside the encrypted `.env` component. Keys and bundle must not travel
together. Recovery folders/key files are restricted to the current OS account.

The tool briefly stops web/API writers, dumps the database and streams the files
volume, then restarts those services in a `finally` block, including snapshot failure.
No volume is deleted. Run in a maintenance window with no other SQL/maintenance
writers and no source/model/config edits. The offline reader remains running.
Image identities are checked before stopping writers. Source is selected from Git
tracked and nonignored files; `work/`, local credentials and data are excluded from
that source component. The full encrypted bundle deliberately includes `.env`,
models and originals as their separate protected components.

Prerequisites: Docker Desktop/Compose supporting `!reset` and `!override`, Git,
Python 3.12 with cryptography 50.x, enough space and a working complete semantic
profile. Windows examples below use the existing `.venv`; provision the same Python
requirements first on a recovery workstation. Docker images/models are exported,
so restoring the prepared bundle does not download application dependencies.

```powershell
# Once per separately custodied recovery key; existing keys are never overwritten.
.venv/Scripts/python.exe scripts/recovery.py keygen --key work/recovery-keys/recovery.key

# New destination for every backup; do not overwrite prior successful snapshots.
.venv/Scripts/python.exe scripts/recovery.py backup --key work/recovery-keys/recovery.key --bundle work/backups/snapshot-001
```

`work/` is ignored by Git. A same-disk test copy is **not** disaster-recovery custody.
The clinic must approve a backup frequency/retention policy, name a backup operator
and alternate key custodian, keep an encrypted off-device copy and a separate key
copy, and log backup time, verification and subsequent restore drills. Do not put
keys, passwords or `.env` into a ticket, chat, Git or an unencrypted shared drive.
No recurring task or automatic deletion schedule is installed by this change.

## Restore drill and verification

```powershell
.venv/Scripts/python.exe scripts/recovery.py drill --key work/recovery-keys/recovery.key --bundle work/backups/snapshot-001 --target work/recovery-drills/drill-001 --port 18080
.venv/Scripts/python.exe scripts/verify-recovery.py --target work/recovery-drills/drill-001
```

Use a new target. All six components authenticate and hash-check **before** extraction
or Docker execution. No unauthenticated plaintext is published as a usable component.
Archives reject traversal, Windows drive/UNC paths, symlinks, hardlinks and special
files. The drill imports exact image IDs with no pulls/builds, creates a randomly
named `dentdocs-drill-*` Compose project and new database/files volumes, restores
originals and runs the existing migration/grant job. It changes only the isolated
API origin to the selected loopback port and revokes every restored login session.
Existing passwords/accounts remain preserved; sign in afresh after recovery.

Resource validation rejects external or live volume/network names, fixed container
names, binds outside the isolated source and any published port except the chosen
loopback web port. The original port 8080 cannot be used for a drill. No command
restores over the live installation. `stage` can authenticate/extract to a new folder
without starting services. Protect that folder: staged plaintext includes secrets.

The comparison script must run **before** interacting with the restored app and
while live source data remains unchanged. It compares hashes/counts for 19 persisted
tables, decrypts/hashes every original, verifies the restricted runtime DB role and
history permissions, and checks that restored sessions are revoked. Sessions and
login-throttle rows are deliberately excluded from equality. If source changes after
backup, compare to the recorded snapshot instead; a live mismatch is not evidence
that restoring a different point in time is corrupt.

Before cleanup, copy its nonsensitive `verification.json` to the evidence location.
Then remove only the completed isolated drill:

```powershell
.venv/Scripts/python.exe scripts/recovery.py cleanup --target work/recovery-drills/drill-001
```

Automatic cleanup is restricted to a named directory under this workspace's
`work/recovery-drills`, revalidates its isolated resources, removes that project's
test volumes/containers and its decrypted files. It preserves encrypted bundles,
separate keys and the live project. Never use a blanket Docker prune or remove the
live database/files volumes. Failed incomplete encrypted bundles may be retained
for diagnosis; they are not successful recovery points.

## Evidence and limitations

- 81 backend tests and 22 recovery tests passed. Recovery coverage includes large
  streaming round trips, wrong keys, altered/truncated/swapped components, manifest
  mismatch, archive traversal/links, overwrite refusal, incomplete bundles, failed
  snapshot restart, live-resource attachment refusal and protected cleanup paths.
- Four reader image-validation tests passed on the patched runtime; dependency
  consistency checks passed for both Python services.
- Type checking and production build passed; Docker images built and ran with
  existing volumes. Source malformed/oversized text/list/boolean inputs now return
  422; interactive schema endpoints are disabled.
- Full encrypted snapshot restored to fresh volumes and containers on port 18080.
  All 19 persisted tables and all 28 originals matched in the initial drill;
  passwords, policies, summary history, pgvector cache and audit records survived.
  Copied sessions were revoked and append-only runtime protections checked.
  The final patched snapshot matched all 19 tables and all 32 retained originals.
- Restored browser approval/edit/history, reload persistence, original bytes and
  source invalidation passed. Both actual offline models ran from restored artifacts.
  Desktop/mobile, final live headers, local-only browser requests, actual PDF preview
  and printed OCR were checked with fictional inputs.
- This is a cold application restore on the **same Docker host**, not a completed
  physical clean-machine/disaster drill. An independent workstation/operator drill,
  off-device copy, key-custody exercise and approved recovery targets remain release
  requirements. The tool does not perform in-place production promotion.
- Final scan results and unresolved findings are in SECURITY_REVIEW.md. No real
  dental photos were imported or draft clinic labels used for training. Existing
  clinic administrator password and data keys were not changed.

The design follows PostgreSQL's [custom-format dump/restore documentation](https://www.postgresql.org/docs/17/app-pgdump.html)
and the cryptography library's [GCM authentication requirements](https://cryptography.io/en/stable/hazmat/primitives/symmetric-encryption/).
