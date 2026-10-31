# Lead view modes
**SRS section:** 5.3 · **Requirement IDs:** LD-V1, LD-V2, LD-V3, LD-V4, LD-V5 · **Priority:** Must 3, Should 2 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/view-modes/spec.md)
**Overall status in this project:** 🟡 (0 of 5 requirements implemented)

## Summary
The four ways to view leads. List and Kanban work and share filters, but both miss required parts, such as inline edit, column choice and quick-add. Grid and Calendar do not exist. Used by all roles with lead access.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-V1 | Table/List: row-and-column layout, sortable headers, column chooser, inline edit of status and owner, row actions (edit, delete, call). | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`allColumns`), `components/ui/data-table.tsx` | Sort and Edit/Delete row actions work. No column chooser, inline status or owner edit, or call action. |
| LD-V2 | Kanban/Pipeline: one column per stage with a record-count badge; cards show name, company, mobile, owner, source, tags and call indicator; drag and drop moves a lead between stages and is logged; quick-add (+) at each column's foot creates a lead in that stage; columns load more cards on scroll. | Must | 🟡 | `components/leads/kanban-board.tsx` (`KanbanBoard`, `handleDragEnd`), `components/leads/kanban-card.tsx` (`KanbanCard`) | Drag and drop and count badge work. Cards lack mobile, source and call indicator. No quick-add or load-more. |
| LD-V3 | Grid: card grid with the same card content, for browsing. | Should | ❌ | — | No grid view. `ViewMode` is list, kanban or analytics. |
| LD-V4 | Calendar: day, week and month views of leads by next follow-up date (or created date, selectable); drag to reschedule. | Should | ❌ | — | No calendar view. |
| LD-V5 | Filters, search and sort carry across view modes; the total record count is shown in every view. | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`filteredLeads`) | Filters and search carry between List and Kanban. Sort does not reach Kanban, and no total count is shown in either view. |

## Out-of-SRS behaviour
- An Analytics tab sits beside the views (see `leads/analytics`).
- Kanban columns show a total value per stage.
