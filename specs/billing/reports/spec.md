# Billing reports
**SRS section:** 7.9 · **Requirement IDs:** BI-R1, BI-R2, BI-R3 · **Priority:** Should 2, Could 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/reports/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
Revenue, aging and tax reports. Nothing is built. Used by Accountant, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-R1 | Revenue over time, aging report (0–30, 31–60, 61–90, 90+ days), collection rate (paid ÷ billed), revenue by client, revenue by product, tax summary (GSTR-1-ready), payments received. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-R2 | Export every report to CSV, Excel and PDF. | Should | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |
| BI-R3 | Profit & loss requires expense data, which the briefs do not cover — see open questions. | Could | ❌ | — | No billing page, component, slice or sidebar item. "Invoice" appears only in marketing copy on the landing page. |

## Out-of-SRS behaviour
None found.
