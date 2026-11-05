# Phase 4 — review queue and validity rules

This phase adds persistent human review and verified expiry tracking to the local,
authenticated installation. All records remain fictional. It supplies no clinic
validity periods and does not authorize real patient use or certify compliance.
Phase 5 OCR, classification and draft summaries have not started.

## Review workflow

Open **Review** in the navigation. Documents enter this queue when overall or field
confidence falls below 85%, a patient mismatch or blurry original is flagged, or
staff request review. Existing flagged records are backfilled once without
duplicating items. Staff can refer any document they are permitted to read.

Administrators and dentists assign eligible reviewers and record approval or a
request for corrections. A dentist cannot decide an item assigned to someone else;
an administrator can override the assignment. Approval requires a staff note,
explicit patient-link verification for mismatches and readable-original confirmation
for blurry scans. Patient corrections update the authoritative patient association.

Extraction approval, completeness and validity are independent. Approval never
clears missing signatures or invents an expiry date. Relevant source changes reopen
review; new versions supersede active older reviews. Named decisions, assignments
and changes are recorded in append-only history and the clinic audit log.

## Validity workflow

Expand **Review and validity** in a document viewer. A dentist or administrator can
record an expiry read from the original, apply a matching approved policy, or
explicitly confirm that expiry does not apply. A source note and staff confirmation
are required. Until verified, validity is **unknown**.

Open **Validity policies** in the account menu. An administrator creates a versioned
draft with document type, category, duration, reminder window and clinic reference.
Clinical policies require a dentist's approval; billing and appointment policies
require administrator approval. Drafts cannot determine expiry. Approved values
cannot be amended through the API; create another version. Existing confirmations
remain pinned to their original policy version. Administrators can retire approved
policies, making dependent validity unknown and queuing fresh staff verification.

The clinic must supply and approve its actual references and periods. There is no
built-in 30-day clearance rule. The only durations used during acceptance testing
belong to clearly labeled fictional policies. Approved test policies are retired
after verification; an unused test draft remains inert for history.

## Date and scope rules

- Calendar calculations use `CLINIC_TIMEZONE`, default `Asia/Manila`.
- Expiry is inclusive through its date. An N-day policy expires on issue date +
  N − 1 days. One day therefore expires on the issue date.
- Reminder days are explicit, from 0 to 365; 0 highlights the expiry date itself.
- A future issue date remains unknown until that date.
- Consent requires an active appointment record for the same patient. Changes to
  that appointment require scope verification again.
- Changing patient, type, source date, original file or extracted text invalidates
  existing validity. Every new document version needs fresh confirmation.
- Expiration never deletes, archives or changes completeness. Verified expired and
  expiring records produce separate alerts for staff permitted to read them.

## Deployment and verification

Use the existing `.env` and `docker compose up --build -d`. Migration 3 adds review,
policy and validity tables without replacing existing patients, documents or files.
The restricted runtime database role cannot update, delete or truncate review,
validity or audit history. Front Desk only sees administrative records and their
permitted history; mutation checks run on the server. Stale revisions are rejected.

The automated contract suite passes 38 tests, including consent scope, mismatch and
blur confirmations, assignment conflicts, approval invalidation, policy retirement,
inclusive expiry boundaries, permissions and immutable history. Type checking and
the production build pass. Local browser acceptance checks cover review approval,
clinical policy approval, applying and retiring a policy, original-file retention,
and desktop/mobile layouts. Test documents are archived and verification accounts
disabled afterward. The initial administrator account remains untouched.

This remains a loopback-only mock installation. Clinic-approved rules, real OCR,
summary review, release validation, LAN HTTPS and backup/recovery drills remain
outside this phase. See PHASE3.md for account setup and earlier security decisions.
