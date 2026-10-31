# Products and services tab
**SRS section:** 7.8 · **Requirement IDs:** BI-PR1, BI-PR2 · **Priority:** Must 2 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/products-services/spec.md)
**Overall status in this project:** ❌ (0 of 2 requirements implemented)

## Summary
The product and service catalogue. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-PR1 | Catalogue fields: name, SKU/item code, description, unit price, unit (Pieces, Hours, Days, Months), tax rate, HSN/SAC code, Active/Inactive. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-PR2 | Inactive items are hidden from new invoices but stay on old ones. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
