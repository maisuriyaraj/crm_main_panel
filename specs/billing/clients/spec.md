# Clients tab
**SRS section:** 7.7 · **Requirement IDs:** BI-CL1, BI-CL2, BI-CL3 · **Priority:** Must 2, Should 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/clients/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
Client records and balances. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-CL1 | Client fields: company name, contact person, email, phone, GSTIN/TIN, billing address, shipping address, payment terms (Net 30/60/90), credit limit, tax-exempt flag, notes, status (Active/Inactive). | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-CL2 | Client detail shows all invoices, payments, outstanding balance and a link to the originating CRM lead. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-CL3 | Warn when a new invoice takes the client over its credit limit. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
