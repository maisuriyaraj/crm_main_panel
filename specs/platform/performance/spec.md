# Performance and scalability
**SRS section:** 10.1 · **Requirement IDs:** NFR-P1, NFR-P2, NFR-P3, NFR-P4, NFR-P5, NFR-P6, NFR-P7 · **Priority:** Not set in the SRS · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/platform/performance/spec.md), [mst_admin_crm](../../../../mst_admin_crm/specs/platform/performance/spec.md)
**Overall status in this project:** 🟡 (0 of 5 requirements implemented)

## Summary
Speed and scale targets. No load test or measurement exists in any project, so measured targets cannot be confirmed. Heavy work cannot run in the background because no queue exists. Used by engineers and all users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| NFR-P1 | API response time (read and write): p95 < 300 ms | — | ➖ | — | No work in this project. |
| NFR-P2 | Page interactive time (list pages): < 2.5 s on 4G | — | ❓ | `app/[orgnization]/leads/page.tsx` | Not measured. Leads loads up to 1000 records at once, which is a risk on 4G. |
| NFR-P3 | Tenants supported: 100,000+ | — | ➖ | — | No work in this project. |
| NFR-P4 | Leads per tenant without degradation: 1,000,000 (subject to plan limits) | — | ❌ | — | `LEADS_FETCH_LIMIT` in `app/[orgnization]/leads/page.tsx` loads 1000 leads and works in the browser, so later leads cannot be seen. |
| NFR-P5 | Kanban drag-and-drop save: < 500 ms, optimistic UI | — | 🟡 | `components/leads/kanban-board.tsx` (`handleDragEnd`) | Not optimistic: the card returns to its column until the save and reload finish (`handleMoveLead` then `refreshLeads`). Time not measured. |
| NFR-P6 | CSV import: 50,000 rows processed in background, progress shown | — | ❌ | — | No import screen. |
| NFR-P7 | Report and export generation: async above 10,000 rows, with download link by notification | — | ❌ | — | No export flow. |

## Out-of-SRS behaviour
None found.
