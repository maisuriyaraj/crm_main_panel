---
name: sdd-implement
description: SDD workflow. Implement an approved spec or change request.
argument-hint: [feature-name]
user-invocable: true
disable-model-invocation: true
---
Read CLAUDE.md and specs/INDEX.md first.
Use INDEX.md to find and read the spec for: $ARGUMENTS

Confirm the spec status is Approved before doing anything.
If status is not Approved, stop and tell the developer.

If Approved, implement exactly what the spec says.
Flag any deviation before making it and wait for confirmation.
Make changes one step at a time, not all at once.

After implementation is complete, run these steps in order.

STEP 1: Security check.
Review only the files you just changed. Look for:
- Any exposed secrets, tokens, or credentials
- Missing input validation on any data coming from outside
- Any place where user input touches a database query, file path,
  or system command without proper checks
- Any new endpoint or function that is missing authentication
  or permission checks
- Any unsafe pattern that does not match how the rest of the
  codebase handles the same concern
If you find anything, fix it before moving to Step 2.
If nothing found, say "Security check passed" and move on.

STEP 2: Update the spec file.
- Set status to Implemented
- Fill Implementation Notes with:
  - What was done (keep it brief, one or two lines for small fixes)
  - Any deviations from the plan and why
  - Any follow-up tasks or known limitations that affect future work
  - Skip sections that have nothing meaningful to say
- Never write implementation notes to CLAUDE.md. They belong
  only in the spec file under Implementation Notes.
- Change Request History is only for changes made after a spec
  was Approved or Implemented. If the developer refined the
  Proposed Change while status was still Draft, that is not a
  change request. Do not record it as one.
- Update specs/INDEX.md to reflect the new status. Keep the
  description to one line, even now. Do not append change
  history into INDEX.md.

STEP 3: Review every file in .claude/rules/ that this task touched.
- Only update a rules file if something actually changed that affects it
- If nothing changed, say nothing. Do not list files that were checked
  and had no changes. Silence means nothing changed.
- When you do add or edit a rule, state the invariant and the
  file/flag names involved in 1-4 lines only. Do not restate CR
  history, benchmarks, or a blow-by-blow of what was tried; that
  belongs in the spec's own Change Request History or
  Implementation Notes. If the full story matters, add a one-line
  pointer to the relevant spec instead of inlining it.
- Every line in a rules file is read again on every future task
  that touches that area. Treat each added line as a standing
  cost, not a one-time note.
- Each rule has exactly one home file. If a rule is genuinely
  relevant to more than one rules file, state it in full in the
  most specific file only, and leave a one-line cross-reference
  in the others. Never copy the full rule text into a second file.
- This is a byproduct check, not a separate audit: do not open or
  re-read a rules file just to check for bloat. Only going off what
  you already saw while reading a file for this task, if the section
  you were editing (or right next to it) is clearly a long restated
  narrative rather than a short rule, mention it in your Step 5
  report and recommend /sdd-cleanup. Skip this entirely for any
  rules file this task did not need to open.

STEP 4: Review CLAUDE.md.
- Default to NOT editing CLAUDE.md. Only add a line if the change
  is a genuinely cross-cutting fact that someone would need to
  know before touching unrelated parts of the codebase, and it has
  no natural home in a spec. A new invariant that only matters
  within the module just touched is NOT one of those; it belongs
  in that module's own spec.
- "Important" is not the bar. "Needed before touching unrelated
  code" is the bar.
- If you do add a bullet, keep it to 1-4 lines, ending in a
  pointer to the spec that holds the full explanation. Never
  restate the full story here.
- Never add implementation notes here.
- If you are about to write more than about 4 lines into CLAUDE.md
  about one feature, stop. That detail belongs in the spec you
  already updated in Step 2. CLAUDE.md gets a pointer, not a
  restatement.
- If you edit or remove a named section or heading in CLAUDE.md
  or a rules file, check the other constitution files and specs
  for references to that heading and fix any that now point at
  nothing.
- This is a byproduct check, not a separate audit: you already read
  CLAUDE.md once this session for Session Startup, so no extra read
  is needed. Only from what you already noticed in that read, if a
  section was clearly long restated narrative rather than a short
  invariant, mention it in your Step 5 report and recommend
  /sdd-cleanup. Do not re-open or re-scan CLAUDE.md specifically to
  check for this.

STEP 5: Report to the developer.
- One short paragraph summary only
- Only mention files that were actually changed
- If the context window has grown large during this session due to
  many files read or long discussion, add this note at the end:
  "Context is getting large. Consider running /compact or starting
  a fresh session with /clear before the next task for cleaner results."

---

IMPLICIT BEHAVIOUR (applies even without the /sdd-implement command):
If you are writing or changing code as part of a Full Lane task,
apply Steps 1 through 5 above where they make sense.
Skip any step that genuinely does not apply to the change made.
Do not apply this to Fast Lane tasks. Fast Lane has its own
lighter flow defined in specs/WORKFLOW.md.
Do not apply this to read-only tasks, audits, or questions.
