# Invoice actions
**SRS section:** 7.4 · **Requirement IDs:** BI-A1, BI-A2, BI-A3 · **Priority:** Must 2, Should 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/invoice-actions/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
PDF, email, status changes and bulk actions. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-A1 | Download PDF, print, send by email (with PDF attached and a pay-online link), mark as sent, mark as paid, duplicate, void/cancel (with reason), convert to receipt. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-A2 | Track "Viewed" when the client opens the online invoice link. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-A3 | Bulk actions: email, print, export (ZIP of PDFs or CSV), status update, delete drafts. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
