# Advanced invoicing
**SRS section:** 7.6 · **Requirement IDs:** BI-X1, BI-X2, BI-X3, BI-X4, BI-X5, BI-X6 · **Priority:** Should 4, Could 2 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/advanced-invoicing/spec.md)
**Overall status in this project:** ❌ (0 of 6 requirements implemented)

## Summary
Recurring invoices, credit notes, templates, multi-currency and e-invoicing. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-X1 | Recurring invoices (weekly, monthly, quarterly, yearly) with start/end and auto-send. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-X2 | Credit notes linked to an invoice for refunds and adjustments. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-X3 | Multiple invoice templates with tenant branding (logo, colours, company and bank details). | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-X4 | Multi-currency invoices with exchange rate captured on the invoice. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-X5 | Quotes/estimates convertible to invoices. | Could | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-X6 | E-invoicing (IRN and QR code via the Indian GST portal) for tenants above the threshold. | Could | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
