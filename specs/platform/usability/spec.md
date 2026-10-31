# Usability and compatibility
**SRS section:** 10.5 · **Requirement IDs:** NFR-U1, NFR-U2, NFR-U3, NFR-U4 · **Priority:** Not set in the SRS · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/platform/usability/spec.md), [mst_admin_crm](../../../../mst_admin_crm/specs/platform/usability/spec.md)
**Overall status in this project:** 🟡 (0 of 4 requirements implemented)

## Summary
Browser support, accessibility and local formats. No browser or accessibility testing is on record. Dates and currency are not driven by tenant settings. Used by all users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| NFR-U1 | Supports latest two versions of Chrome, Edge, Safari and Firefox; responsive from 360 px. | — | ❓ | `components/layout/app-sidebar.tsx` | Has responsive layout. No browser test or 360 px check on record. |
| NFR-U2 | WCAG 2.1 AA for contrast, keyboard navigation and labels; status colours always paired with text or icons. | — | ❓ | `components/ui/data-table.tsx` | Uses accessible primitives, but no WCAG audit exists. Kanban temperature dots rely on colour. |
| NFR-U3 | Dates in the tenant's format (default DD-MM-YYYY), stored in UTC, displayed in the user's time zone. | — | 🟡 | `components/leads/lead-detail-sheet.tsx` (`formatDistanceToNow`) | Relative times. Not the tenant format or time zone. |
| NFR-U4 | Currency formatting per tenant locale (Indian lakh grouping for INR). | — | 🟡 | `app/[orgnization]/leads/page.tsx` (`toLocaleString("en-IN")`) | Rupee and Indian grouping are hardcoded, not read from the tenant. |

## Out-of-SRS behaviour
None found.
