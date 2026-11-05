# DentDocs interface conventions

This is a staff-operated clinic tool. New screens inherit the existing San Nicolas
navy and warm-gold palette, tooth emblem, Plus Jakarta Sans/system fallback stack,
white work surfaces and slate page background. No visual rebranding was introduced.

- Preserve the top navigation and its horizontally scrollable mobile form.
- Use explicit form labels, visible keyboard focus and native controls. Indicate
  errors beside the task and await server success before showing completion.
- The sign-in/password gates use a focused, narrow form. The Staff screen uses a
  two-column desktop creation form followed by a staff list; both stack on mobile.
- Password-reset, disable and role-change confirmations explain session revocation.
  Temporary passwords have a deliberate one-time display and dismissal action.
- Roles determine available actions. Restricted screens explain whom to contact;
  they never offer an unauthenticated role-switch shortcut.
- Keep fictional-data and draft-notice labels accurate. Do not claim production
  compliance or physical print completion.

The Phase 3 login and staff screens were visually inspected at desktop and 390px
mobile widths, with functional browser checks for their principal states.

Phase 4 uses a queue beside a source/decision inspector, stacking on mobile. Review
and validity live in a disclosure in the document viewer. Policy drafts and explicit
approval/retirement confirmations use labeled native forms. Keep extraction,
completeness and validity labels distinct. Policy duration fields start blank.

Phase 5 keeps the existing upload layout and adds actual-original PDF/image preview,
editable OCR text, conservative confidence labels, explicit extraction warnings and
manual entry after OCR failure. No simulated file buttons or fabricated completeness
claims remain in this flow. Treat classification, extraction, completeness and
validity as separate staff tasks. Desktop and 390px mobile layouts were inspected.

The Phase 5 handwriting extension uses an inline disclosure under an image upload.
It provides rotation, pointer selection and labeled percentage inputs as a keyboard
alternative. Model drafts are editable and explicitly unscored; metadata and named
review remain separate. Retained draft provenance is disclosed in the document text
tab and review inspector. Desktop and 390px mobile acceptance checks passed.

Phase 6 preserves the search layout and adds an explicit search-method selector,
retry button, visible keyword-fallback notices, matched source snippets and
version/revision attribution. It clears prior results during a new request and
never presents semantic similarity as clinical truth or OCR accuracy. Desktop and
390px mobile views were inspected against the deployed app.


Phase 7 places Administrative summary in a document-viewer disclosure. Keep the
accepted summary separate from editable drafts, with named approver and source
version/revision. Show exact quotations with offsets, original download, source
review blockers, and outdated-source states. Approval needs a note and explicit
comparison checkbox; rejection needs a note. Never style a generated draft as an
accepted result. Native labeled controls stack at 390px; errors and saves are visible.
