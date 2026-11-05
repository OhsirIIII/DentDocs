# Encrypted recovery checkpoint — November 6, 2026

Task 3 is complete for the local installation: a new encrypted runtime backup was
restored into fresh isolated volumes and verified before cleanup. The saved
installation is stopped. This same-host drill does not complete physical
off-device recovery or authorize release.

## Captured checkpoint

- Source: `4292d8855e6ac171d14adb2a2b2c7b79430eb53f`, with no tracked changes at capture.
- Private bundle: `work/backups/project-checkpoint-2026-11-06`, about 1.91 GiB.
- Seven encrypted artifacts: database dump, originals volume, tracked source,
  private configuration, offline models, runtime images and encrypted manifest.
- The existing separate recovery key was reused; configuration, passwords and
  encryption keys were preserved. No key or plaintext configuration is published.
- All five runtime image identities matched the encrypted manifest. Migration
  during recovery uses the recovered API image, as implemented by the recovery
  tool; there is no separately exported sixth migration image in this bundle.

The source component matched all **524 Git-tracked files** byte for byte. This
includes approved tracked documentation and appendix images. Untracked files,
including unrelated generated `output/` and `tmp/` content, were excluded. `.env`
was excluded from the source component and retained separately under encryption.
All **16 runtime model artifacts** and the private configuration matched the saved
installation. Research datasets, experimental environments and private labeling
packets are outside this runtime backup's scope.

This report and its documentation updates were written after the capture; they
are not part of the source checkpoint inside this bundle. Older backups remain
preserved.

## Restore verification

The backup tool briefly stopped writers while capturing the database and files.
Browser access was then stopped during comparison. Restore authenticated and
hash-checked all six components before extraction or execution, imported the
captured images and used a new `dentdocs-drill-*` project, fresh database/files
volumes and loopback port 18080. No original volume was overwritten.

| Check | Result |
| --- | --- |
| Persisted database tables | All 19 matched counts and content hashes |
| Registered original files | All 40 decrypted and matched their saved SHA-256 hashes |
| Source and models | 524 source files and 16 runtime model artifacts matched |
| Private configuration | Byte-for-byte match, without printing its contents |
| Runtime images | All five recovered identities matched the manifest |
| Sessions and history | Restored sessions revoked; restricted role/history privileges passed |
| Runtime boundaries | Process restrictions, private service exposure, browser headers and actual OCR-worker-to-database denial passed |
| Printed OCR | Actual restored worker read a generated fictional one-page PDF |
| Handwriting | Actual restored reader returned a nonempty research draft with the expected model hash |
| Local embeddings | Restored model returned the expected 384-dimensional embedding |

Database equality deliberately excludes operational sessions and login-throttle
rows. Equality checks ran before model/OCR smoke requests. Smoke requests saved
no records and created no staff accounts. The handwriting smoke confirms that the
recovered model runs; it is not an accuracy assessment or candidate promotion.

## Cleanup and retained evidence

The drill's containers, networks, volumes and decrypted target directory were
removed through the scoped recovery cleanup command. The original database/files
volumes, existing key/configuration and encrypted backup remain. No DentDocs
services remain running. All seven retained encrypted artifacts were hashed after
cleanup.

Sanitized checkpoint evidence is in
[deployment/recovery-checkpoint-2026-11-06.json](deployment/recovery-checkpoint-2026-11-06.json).
Detailed local verification records remain under ignored
`work/recovery-2026-11-06/`; neither the encrypted bundle nor private operational
artifacts are committed. Follow [PHASE8.md](PHASE8.md) for operator commands.

## Remaining work

Next available task is **task 4: branch/PR review and resolving findings**, followed
by seeking approval to merge. Task 5, validating the proposed HTTPS staging setup,
is also pending. The existing draft [PR #1](https://github.com/OhsirIIII/DentDocs/pull/1)
remains unmerged.

Physical off-device/second-machine restoration, separate key custody, approved
backup frequency/retention and recovery targets remain operator tasks. Independent
security review, clinic-confirmed transcriptions and acceptance, policies,
licensing and release sign-off remain open. This drill restores the captured
security posture; it does not resolve the findings in
[SECURITY_REFRESH_2026-11-06.md](SECURITY_REFRESH_2026-11-06.md).
