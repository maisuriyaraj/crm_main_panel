# Leads analytics
**SRS section:** 5.8 · **Requirement IDs:** LD-R1 · **Priority:** Should 1 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/analytics/spec.md)
**Overall status in this project:** 🟡 (0 of 1 requirements implemented)

## Summary
Widgets on lead performance. An Analytics tab works out a few charts in the browser from the leads it has loaded. Used by Sales Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-R1 | Dashboard widgets: leads by stage, by source, by owner; new leads over time; stage conversion rates; follow-ups due today and overdue. | Should | 🟡 | `components/leads/lead-analytics.tsx` (`LeadAnalytics`) | Has leads by stage and new leads over time. Missing by source, by owner, conversion rates and follow-ups due. Numbers cover only the 1000 leads loaded. |

## Out-of-SRS behaviour
- Pipeline value, win rate, average deal size and leads by temperature are not in the SRS.
