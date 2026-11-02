# Phase 7 — local administrative summaries with named approval

Implemented and verified on the local fictional-data installation, November 3, 2026.

## Staff workflow

Open a document and expand **Administrative summary**. **Generate local draft**
creates a separate, unaccepted history record. It lists the source metadata and up
to three complete, short source lines containing administrative cues. Exact source
quotations include character offsets in the stored transcription. Download the
pinned version's original to compare where one is retained.

A dentist or administrator can edit the proposed text, enter a review note, confirm
comparison with the source and select **Approve and save summary**. Only then does
it appear under Accepted summary, with reviewer name, time and source version and
revision. **Reject draft** records a named rejection with a note. A rejection does
not remove a previously accepted summary for the same unchanged source. Generate
a new draft for subsequent corrections; decided drafts cannot be rewritten.

Draft creation is allowed to staff who can read the source; acceptance/rejection is
restricted to dentists and administrators. Front desk access remains limited to
administrative document types. Historical clinical drafts stay hidden after a
source is reclassified as administrative. Server permissions enforce these rules.

## Source integrity and persistence

- Additive migration 7 adds `summary_drafts` and `summary_decisions`. Drafts pin the
  source version, revision, complete metadata/text fingerprint, type and file ID.
- Summaries never replace original files, extracted text, completeness, validity or
  document versions. They are not included as separate semantic search sources.
- Any source revision invalidates acceptance, including metadata changes, new
  versions, restores and archiving. History remains retained as outdated source.
  Fresh review and a new draft are needed after changes; restoring an older source
  does not revive its prior approval.
- Pending/in-progress/changes-requested extraction review blocks summary approval.
- Expected revisions, document row locks and a unique decision per draft reject
  stale or duplicate decisions. Confirmation is a strict boolean; blank notes or
  blank accepted text are rejected. Archived sources cannot generate or decide.
- Database triggers protect drafts and decisions against update/delete (and
  PostgreSQL truncate). The runtime role also lacks history mutation privileges.
- Summary view, draft, approval and rejection have separate audit actions. Audit
  details contain draft references, rather than copying the full summary text.

## Local method and limitations

The engine is `local-extractive-administrative-v1`, a deterministic local extractor
running in the API. No new model weights, cloud service or training is needed.
It selects up to three complete lines, 8–280 characters long, matching English
administrative cues; longer lines are omitted. Overview metadata and up to ten
checklist items accompany them. Source text is bounded to 200,000 characters and
accepted text to 6,000. History displays the latest 50 drafts while retaining all.

This is a working conservative administrative overview, not an abstractive language
model, clinical assessment or complete transcription. It preserves source negation
in quoted lines, but cannot establish whether OCR itself is correct. The selected
lines may omit important context or be irrelevant; staff must compare the original
and edit the draft. Dental abbreviations are not expanded, amounts are not computed
and diagnoses are not inferred. Clinic-supplied draft labels remain unconfirmed and
unused for training. Handwriting reliability remains a separate evaluation task.

## Verification

- 79 backend regression tests passed, including eight summary tests covering exact
  quotation offsets/negation, metadata-only drafts, strict confirmation, reviewer
  identity, immutable histories, duplicate/stale decisions, source edits, versions,
  restore, archives, pending extraction review, roles, historical type filtering,
  anonymous requests, CSRF and source bounds.
- Type checking, production build and whitespace checks passed.
- Deployed PostgreSQL/Edge verification passed: generate, review/edit, explicit
  named approval, persistence after reload, original byte equality, invalidation
  after a source change, rejection history, desktop and 390px mobile layouts, and
  no browser page exceptions. Screenshots inspected locally under ignored `work/`.
- Migration 7 and PostgreSQL runtime history privileges verified. All retained
  original hashes and the original twelve patients remain intact. Fictional browser
  records archived; temporary account disabled and sessions revoked; existing
  clinic administrator unchanged.

Known advisories: upstream Starlette/httpx deprecation in tests and Vite's bundle
size advisory. Phase 8 backup/restore and release/security work remain pending.
No PR, merge, production deployment or real-patient release was performed.
