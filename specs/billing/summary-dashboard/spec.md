# Billing summary dashboard
**SRS section:** 7.1 · **Requirement IDs:** BI-D1, BI-D2, BI-D3 · **Priority:** Must 3 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/summary-dashboard/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
Totals for billed, paid, pending and overdue, plus the header actions. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-D1 | Four cards for the selected period: Total billed, Paid (green), Pending (amber), Overdue (red). | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-D2 | Large amounts in Indian format with lakh/crore suffix in cards (₹52.30 L) and full comma-grouped amounts in tables (₹25,000.00); other currencies use international grouping. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-D3 | Header: title "Billing — Invoices", global search (⌘K), notification bell, "+ New" dropdown (Invoice, Client, Product, Payment, Credit note), "+ Create Invoice" button. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
