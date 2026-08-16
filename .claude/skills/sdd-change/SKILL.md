---
name: sdd-change
description: SDD workflow. Update an existing spec due to a change in requirements.
argument-hint: [feature-name]
user-invocable: true
disable-model-invocation: true
---
Read CLAUDE.md, specs/WORKFLOW.md, and specs/INDEX.md first.

Use INDEX.md to find the spec for: $ARGUMENTS
If no spec exists, stop and tell the developer.
A spec must exist before a change request can be written.
Ask them to run /sdd-audit first.

Then ask the developer to describe the change:
- What is the new requirement, business rule, or product decision?
- What behaviour is changing and why?
- Is there anything that should no longer work after this change?

Once the developer has described the change, update the spec:
- Update the Goal section to reflect the new intent
- Update the Proposed Change section with the new requirement
- Update the Affected Files section if new files will be involved
- Add a new Change Request entry at the bottom of the spec with:
  - Date
  - What changed and why
  - Who requested it
- Set status back to Draft

Then update specs/INDEX.md to reflect the new status.
Keep the description column to one line. Do not append change
history into INDEX.md; it belongs only in the spec's own
Change Request History.

Do not touch any code. Wait for the developer to review
the updated spec and set status to Approved.

Use plain, simple English. Avoid technical jargon where possible.
