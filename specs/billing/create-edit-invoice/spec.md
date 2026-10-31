# Create and edit invoice
**SRS section:** 7.3 · **Requirement IDs:** BI-C1, BI-C2, BI-C3, BI-C4, BI-C5, BI-C6, BI-C7, BI-C8 · **Priority:** Must 7, Should 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/create-edit-invoice/spec.md)
**Overall status in this project:** ❌ (0 of 8 requirements implemented)

## Summary
The invoice form, numbering, line items and GST maths. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-C1 | Client: searchable dropdown ("Arjun Mehta — Tata Digital"), with "+ New client" inline. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C2 | Invoice #: auto-generated as INV-YYYY-NNN (e.g. INV-2026-011), editable; unique within the tenant; prefix, sequence and yearly reset configurable in settings. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C3 | Issue date (default today) and due date (default issue date + client payment terms, else 30 days); format DD-MM-YYYY. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C4 | Line items: item (product/service dropdown or free text), HSN/SAC code, quantity, unit, rate, discount, tax %, amount; "+ Add item" and delete per line. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C5 | Totals: subtotal, discounts, tax breakdown, round-off, total. Example: 1 × ₹25,000 at 18% GST = subtotal ₹25,000, tax ₹4,500, total ₹29,500. | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C6 | GST split: CGST + SGST when supplier and client are in the same state; IGST when in different states (derived from GSTINs or place of supply). | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C7 | Invoice-level discount, shipping charges, notes, terms, and attachments (PO, contract, delivery note). | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-C8 | Save as Draft or Save & Send. Draft invoices can be edited freely; sent invoices are edited only with a version history entry; paid invoices are locked (use a credit note). | Must | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
