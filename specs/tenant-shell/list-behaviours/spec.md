# Common list behaviours
**SRS section:** 4.3 · **Requirement IDs:** SH-L1, SH-L2, SH-L3, SH-L4, SH-L5, SH-L6, SH-L7, SH-L8 · **Priority:** Must 7, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/list-behaviours/spec.md)
**Overall status in this project:** 🟡 (0 of 8 requirements implemented)

## Summary
Sorting, paging, columns, saved views, selection and export that every list should share. A shared data table covers sorting and basic paging. Column choice, saved views and export do not exist. Used by all tenant users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-L1 | Sortable column headers with direction arrows. | Must | 🟡 | `components/ui/data-table.tsx` (`toggleSort`), `app/[orgnization]/leads/page.tsx` | Arrows work. Leads sorts in the browser over at most 1000 loaded rows. |
| SH-L2 | Pagination with page numbers, records-per-page selector (10 / 25 / 50 / 100, default 10) and count display ("1–10 of 46 items"). | Must | 🟡 | `components/ui/data-table.tsx` (`setPage`), `app/[orgnization]/contacts/page.tsx` | Page numbers only. No per-page selector or "1–10 of 46" count. Contacts uses a different Prev/Next pager. |
| SH-L3 | Column chooser (show, hide, reorder) remembered per user. | Must | ❌ | — | Columns are fixed in code. |
| SH-L4 | Saved views ("VIEW FILTER"): a named combination of filters, sort, columns and view mode, private or shared with the team. | Must | ❌ | — | No saved views UI. |
| SH-L5 | Checkbox multi-select with select-all on page and select-all matching. | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`select` column), `app/[orgnization]/contacts/page.tsx` | Leads selects all filtered rows; Contacts selects the page only. No separate choice between the two, and Leads cannot reach rows past the 1000 loaded. |
| SH-L6 | Empty states with a message ("No Leads found.") and the primary create action. | Must | 🟡 | `components/ui/data-table.tsx` (`emptyState`), `components/team/members-tab.tsx`, `components/team/invitations-tab.tsx` | Team tabs use rich empty states. Leads shows "No leads match your filters." with no create action. |
| SH-L7 | Export the current filtered list to CSV and Excel, subject to the export permission. | Must | ❌ | — | No CSV or Excel export on any tenant list. |
| SH-L8 | Hover tooltips for truncated values and ⓘ info icons for field help. | Should | 🟡 | `components/team/invitations-tab.tsx` | Tooltips are used in very few places. No tooltip on truncated lead values and no info icons. |

## Out-of-SRS behaviour
None found.
