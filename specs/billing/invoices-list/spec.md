# Invoices list
**SRS section:** 7.2 · **Requirement IDs:** BI-L1, BI-L2, BI-L3 · **Priority:** Must 3 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/invoices-list/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
The list of invoices with filters and status badges. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-L1 | Columns: Invoice #, Client, Issue date, Due date, Amount, Status badge, Actions menu. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-L2 | Filters: date range, status, client, amount range; global search across all fields. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-L3 | Status badges: Draft (grey), Sent (blue), Viewed (purple), Partial (light green), Paid (green), Pending (amber), Overdue (red), Cancelled/Void (dark grey). | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
