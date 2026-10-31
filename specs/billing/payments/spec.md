# Payments
**SRS section:** 7.5 · **Requirement IDs:** BI-P1, BI-P2, BI-P3, BI-P4, BI-P5, BI-P6 · **Priority:** Must 3, Should 2, Could 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/payments/spec.md)
**Overall status in this project:** ❌ (0 of 6 requirements implemented)

## Summary
Recording payments, automatic status, gateways and reminders. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-P1 | Record payment: amount (full or partial), date, method (Cash, Cheque, Bank transfer, Online/UPI, Card), reference, notes. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-P2 | Status updates automatically: partial → Partial, full → Paid, past due date with balance → Overdue (checked daily). | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-P3 | Payment history timeline per invoice. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-P4 | Online payment links via Razorpay, Stripe or PayPal; successful payments recorded automatically through webhooks. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-P5 | Automatic reminders on a schedule (e.g. 3 days before due, on due date, 7 days after) by email and SMS. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-P6 | Late fees calculated automatically on overdue invoices per tenant rules. | Could | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
