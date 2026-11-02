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
