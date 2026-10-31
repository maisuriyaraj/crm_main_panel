# Lead search, filter and sort
**SRS section:** 5.4 · **Requirement IDs:** LD-F1, LD-F2, LD-F3, LD-F4 · **Priority:** Must 4 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/search-filter-sort/spec.md)
**Overall status in this project:** 🟡 (0 of 4 requirements implemented)

## Summary
Finding the right leads. Simple search and dropdown filters work over up to 1000 leads loaded in the browser. The advanced builder and saved filters do not exist. Used by all roles with lead access.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-F1 | Search records by name, company, email, mobile and tags (partial match). | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`filteredLeads`) | Searches name, company and email in the browser. Mobile and tags are not searched. |
| LD-F2 | Quick filters: lifecycle status (Active, Closed, Dead), ownership (Self, My team, All — limited by role), pipeline, channel (CHL). | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`ownerFilter`, `stageFilter`) | Owner and stage dropdowns only. |
| LD-F3 | Advanced filter builder: any field, operators (is, is not, contains, before, after, between, empty), AND/OR groups. | Must | ❌ | — | No filter builder. |
| LD-F4 | Save filters as named views (see SH-L4). | Must | ❌ | — | No save action. |

## Out-of-SRS behaviour
- Priority and temperature filters are not in the SRS.
