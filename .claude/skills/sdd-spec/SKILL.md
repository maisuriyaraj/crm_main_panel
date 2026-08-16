---
name: sdd-spec
description: SDD workflow. Create a draft spec for a brand new feature.
argument-hint: [feature-name]
user-invocable: true
disable-model-invocation: true
---
Read CLAUDE.md, specs/WORKFLOW.md, specs/TEMPLATE.md, and specs/INDEX.md.

Check INDEX.md to see if a spec already exists for: $ARGUMENTS
If a spec already exists, stop and tell the developer.
For changes to existing features, use /sdd-change instead.

If no spec exists, before writing anything, scan the codebase
for any existing modules, models, services, or helpers that
this feature will touch or need to integrate with.
Note these findings as they will inform the spec.

Decide which group this feature belongs to based on its purpose.
Examples: auth, payments, notifications, dashboard, settings.
If a matching group folder already exists in specs/, use it.
If not, create a new subfolder with a short, clear name.

Then create a new spec at specs/[group]/$ARGUMENTS.md using
the template in specs/TEMPLATE.md as the structure.

When filling the spec, only include sections that are actually
relevant to this feature. Skip any section that does not apply:
- Skip Design section if this feature has no UI changes
- Skip AI Prompts section if this feature does not involve AI calls
- Skip API Changes section if no endpoints are added or changed
- Skip Database Changes section if no schema changes are involved

Fill all included sections based on:
- The requirements or notes the developer has shared
- The product overview in CLAUDE.md
- The existing modules found in the codebase scan
- The design or theming rules file referenced in CLAUDE.md's Rules
  section, if UI is involved. Check that section for the exact
  filename in this repo; do not assume a fixed name like
  design-system.md, since Phase 4 may have named or renamed it
  differently (for example theming.md).

Include all relevant existing files in the Affected Files
and Current State sections, even if they are not being
created from scratch.

Mark status as Draft.
Do not implement anything yet. Wait for approval.

While status is Draft, any revision to the Proposed Change section
is a normal edit. Replace content directly.
Do not add a Change Request History entry while status is Draft.
Change Request History is only for changes made after a spec has
been set to Approved or Implemented.

After saving the spec, update specs/INDEX.md by adding a new entry:
- Group name
- Spec file path
- One line description of what the spec covers. Keep it to one
  line even later, when status changes. Do not append history
  into this description; history belongs only in the spec's own
  Change Request History.
- Current status

Use plain, simple English in the spec. Avoid technical jargon where possible.
