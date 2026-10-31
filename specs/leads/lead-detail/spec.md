# Lead detail
**SRS section:** 5.6 · **Requirement IDs:** LD-D1, LD-D2, LD-D3 · **Priority:** Must 2, Should 1 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/lead-detail/spec.md)
**Overall status in this project:** 🟡 (0 of 3 requirements implemented)

## Summary
The full record of one lead. A slide-over sheet shows key fields, activity and notes. It is not a page, is not editable inline, and follow-up tasks and attachments have no API. Used by all roles with lead access.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-D1 | Shows all fields, editable inline, plus a timeline of activity: stage changes, owner changes, calls, notes, emails, tasks, and linked invoices. | Must | 🟡 | `components/leads/lead-detail-sheet.tsx` (`LeadDetailSheet`) | A side sheet, not a page. Shows some fields, with no inline edit. |
| LD-D2 | Add notes and follow-up tasks with due date and reminder. | Must | 🟡 | `components/leads/lead-detail-sheet.tsx` (`handleAddNote`) | Notes work. No follow-up task form. |
| LD-D3 | Attach files (subject to plan storage limit). | Should | ❌ | — | No attachment UI. |

## Out-of-SRS behaviour
None found.
