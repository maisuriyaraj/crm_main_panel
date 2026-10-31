# Billing settings and permissions
**SRS section:** 7.10 · **Requirement IDs:** BI-S1, BI-S2, BI-S3, BI-S4 · **Priority:** Must 3, Could 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/settings-permissions/spec.md)
**Overall status in this project:** ❌ (0 of 4 requirements implemented)

## Summary
Billing configuration, permissions and invoice audit. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-S1 | Company details, invoice numbering, default terms, default currency, tax rates, bank details, email templates, payment gateway keys. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-S2 | Permissions: create, edit, approve, send, record payment, void, view only (see 2.2); optional approval step before an invoice can be sent. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-S3 | Every invoice change is audit logged with before/after values. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-S4 | Sync to accounting software (Tally, Zoho Books, QuickBooks). | Could | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
