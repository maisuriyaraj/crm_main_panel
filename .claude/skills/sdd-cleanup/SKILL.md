---
name: sdd-cleanup
description: SDD workflow. Repo-wide housekeeping pass over CLAUDE.md, rules files, INDEX.md, and specs. Trims bloat, fixes drift, removes or rewrites content that no longer earns its place.
argument-hint: (no argument, always runs across the whole repo)
user-invocable: true
disable-model-invocation: true
---
This is a repo-wide maintenance pass. It always runs across the
whole repo, not a single module or group.

Read CLAUDE.md, specs/WORKFLOW.md, specs/TEMPLATE.md, and
specs/INDEX.md first. Then read every file in .claude/rules/,
and skim every spec under specs/**.

You are being trusted to edit and delete content directly in this
skill, including spec history. That trust comes with a
responsibility to be careful, not fast. Before changing or
removing anything, actually read it and understand what it is
protecting against or explaining, not just how long it is. Length
alone is never sufficient reason to delete something; something
short can still be load-bearing, and something long can still be
genuinely necessary (a subtle bug's root cause, a security
decision, a non-obvious constraint). When you are not confident
whether a piece of content still matters, preserve it or move it
to the spec's Implementation Notes rather than deleting it, and
say so in your report.

Go through these checks in order:

CHECK 1: CLAUDE.md bloat
- Read CLAUDE.md in full. For every section, ask: does this
  actually need to be read before touching unrelated code? Or is
  this detail specific to one feature or module that already has
  its own spec?
- Trim any bullet that restates history, benchmarks, or CR-level
  detail already captured in a spec. Replace it with a 1-4 line
  invariant plus a pointer to the spec.
- If a fact is now stale, contradicted by the current codebase, or
  no longer true, remove it. Do not leave outdated instructions in
  place out of caution; outdated and wrong is worse than absent.
- There is no fixed line or word cap. The test is effectiveness:
  every line should earn its place by being something a developer
  or Claude genuinely needs before working in an unrelated part of
  the codebase. If a section could be cut without anyone losing
  something they needed, cut it.

CHECK 2: Rules files
- For each file in .claude/rules/, look for narrative bloat
  (restated CR history, long justifications, benchmark walk-throughs)
  and compress to the invariant plus a pointer to the relevant spec.
- Look for the same rule stated in more than one rules file. Keep
  it in the most specific file, replace the others with a one-line
  cross-reference.
- Look for any cross-reference (to a CLAUDE.md heading, another
  rules file, or a spec) that no longer resolves, and either fix it
  or remove it.
- If a rule is clearly outdated (describes a pattern the codebase
  no longer uses, references a removed feature or file), remove it.

CHECK 3: INDEX.md accuracy
- Confirm every .md file under specs/** (excluding WORKFLOW.md,
  TEMPLATE.md, INDEX.md) has exactly one row in INDEX.md. Add any
  missing row. Flag any row pointing at a file that no longer exists.
- Confirm every description is one line. If a description has
  grown to include change history, trim it to one line and move
  anything worth keeping into that spec's own Change Request History.

CHECK 4: Spec file health
- Specs are normally left alone during regular work. During this
  pass only, you may edit a spec's own content if it has grown
  unwieldy over many revisions: for example, an early Change
  Request History entry that no longer makes sense given 20+
  revisions since, duplicated Implementation Notes, or sections
  that contradict the current Approved/Implemented state.
- Do not rewrite a spec's Goal, Proposed Change, or Current State
  sections to match your own judgement of what they should say;
  those reflect real decisions made by the team. Only clean up
  history, duplication, and internal contradictions.
- If a Change Request History entry is genuinely obsolete (fully
  superseded by a later entry, describing a decision that was
  reversed and re-reversed with no remaining relevance), you may
  remove it, but only if removing it does not lose the reason
  behind the current behaviour. When in doubt, condense instead of
  deleting: keep one line noting what happened and when, drop the
  rest.

CHECK 5: TEMPLATE.md and WORKFLOW.md sync
- Confirm TEMPLATE.md's Status field matches WORKFLOW.md's allowed
  status values exactly. If WORKFLOW.md's conventions have changed
  and TEMPLATE.md hasn't been updated to match, fix TEMPLATE.md.
- Prefer TEMPLATE.md referencing WORKFLOW.md's status list instead
  of restating the options directly, so the two cannot drift apart
  again.

CHECK 6: Skill file assumptions
- Confirm the four other skill files (sdd-audit, sdd-spec,
  sdd-change, sdd-implement) still reference the real specs/
  folder layout, not a flat or outdated structure. If the layout
  has changed (grouped, split by team, renamed), update the
  hardcoded assumptions in those skill files in the same pass.
- Confirm each skill file's step count and steps still match this
  repo's actual working practice. If a step (such as the security
  check in sdd-implement) is missing compared to what the team
  expects, flag it clearly rather than silently adding steps back
  in, since removing a step may have been deliberate.

After completing all checks, report clearly:
1. What you changed in CLAUDE.md and why
2. What you changed in each rules file and why
3. Any INDEX.md rows added, fixed, or corrected
4. Any spec file content condensed or removed, and why you judged
   it safe to do so
5. Any TEMPLATE.md / WORKFLOW.md sync fixes
6. Any skill file assumptions that were updated
7. Anything you found questionable but chose to leave alone,
   and why, so the developer can double check your judgement

Use plain, simple English in the report. Avoid technical jargon
where possible.
