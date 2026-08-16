---
name: sdd-audit
description: SDD workflow. Audit an existing module before making any changes.
argument-hint: [module-name or file-path]
user-invocable: true
disable-model-invocation: true
context: fork
---
Read CLAUDE.md and specs/WORKFLOW.md first.
Then read specs/INDEX.md to check if a spec exists for: $ARGUMENTS
If a spec exists, read it before auditing so you understand
what was previously planned or built.

Then audit this module: $ARGUMENTS

Read all relevant files. Then report:
1. What it currently does and how
2. What files are involved
3. Problems, inconsistencies, or improvement opportunities
4. How the current code compares to the existing spec, if one exists
5. What a spec for improving or changing this would need to cover

Do not change any code or any spec file. Wait for direction.

Keep the report short and clear.
Use plain, simple English. Avoid technical jargon where possible.
Return only this report, not the raw contents of the files you read.
