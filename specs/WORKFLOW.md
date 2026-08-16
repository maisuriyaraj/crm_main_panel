# Development Workflow

This applies to all work in this repo, both new features
and improvements to existing functionality. No exceptions.

## Status Convention

A spec's Status field must always be exactly one of these three
words, nothing else: Draft, Approved, Implemented.

## Choose the Lane Before You Start

Match the process to the size and risk of the change. There are two lanes.

Use the FAST LANE only if every one of these is true:
- The change touches at most two files
- It does not touch any shared module, model, service, or helper used elsewhere
- No database schema change, no API change, no AI prompt change
- No new dependency added
- A mistake here would be easy to spot and easy to undo

If even one of those is false, use the FULL LANE.
When you are not sure, use the FULL LANE.

## Fast Lane: Small Change

For trivial fixes, copy or text tweaks, and small isolated bug fixes.

1. Run /sdd-audit [module] to confirm it really is small and isolated.
   If the audit shows it touches shared code or carries risk,
   stop and switch to the Full Lane.
2. Run /sdd-implement [module]. Claude makes the change incrementally.
3. Claude appends one or two lines to the existing spec under
   Change Request History: date, what changed, why, who asked.
   No new spec file, no approval gate.
   If no spec exists and the change is truly this small, the git
   commit message is the record. If it feels bigger than a commit
   message can capture, it is not a small change; use the Full Lane.

Everything below this is the FULL LANE and is the default.

## New Feature
1. Share requirements, notes, or client doc with Claude in Claude Code
2. Claude asks clarifying questions and scans codebase for relevant
   existing modules. Answer questions until Claude has full clarity.
3. Run /sdd-spec [feature-name] to generate the spec
4. Review spec, correct anything wrong, set status to Approved
5. If spec touches existing modules, run /sdd-audit [module] first
   and update spec if needed before approving
6. Run /sdd-implement [feature-name] to implement

## Existing Feature: Improvement or Bug Fix
1. Run /sdd-audit [module]
2. If no spec exists, run /sdd-spec [module] to backfill current state
   then add your proposed change and set status to Approved
3. If spec exists, review it and set status to Approved
4. Run /sdd-implement [module]

## Existing Feature: Requirements Change
1. Run /sdd-audit [module]
2. Run /sdd-change [module], describe the new requirement to Claude
3. Claude updates the existing spec, sets status to Draft
4. Review updated spec, set status to Approved
5. Run /sdd-implement [module]

## After Every /sdd-implement
Claude must:
- Run a security check on changed files before marking done
- Update spec status to Implemented and fill Implementation Notes briefly
- Update INDEX.md to reflect the new spec status, keeping the
  description to one line
- Only update rules files or CLAUDE.md if something actually changed,
  and keep any addition to 1-4 lines with a pointer to the spec
- Report in one short paragraph what was done and what files changed
- Silence on rules files means nothing changed, no need to list them
- If any file touched looks bloated (restated history, duplicated
  rules, stale content), say so and suggest /sdd-cleanup. Do not
  attempt a full repo-wide cleanup inside a normal implement run.

## Repo Housekeeping

There is no fixed schedule for this. Run /sdd-cleanup whenever
/sdd-implement flags a file as bloated, or any time you notice
CLAUDE.md, a rules file, or INDEX.md has drifted, become
repetitive, or contains outdated information. It is a repo-wide
read-and-rewrite pass over the constitution files and, where
genuinely needed, over spec history; it does not touch working code.
