# Lead assignment and limits
**SRS section:** 5.7 · **Requirement IDs:** LD-S1, LD-S2 · **Priority:** Must 1, Should 1 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/assignment-limits/spec.md)
**Overall status in this project:** ❌ (0 of 2 requirements implemented)

## Summary
Auto-assignment rules and the plan's lead limit. Neither is built, so leads can be created without limit. Used by Tenant Admin, Sales Manager.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-S1 | Auto-assignment rules: round-robin or by source/category to a user or team. | Should | ❌ | — | No rules screen. |
| LD-S2 | Lead creation (manual, import or integration) stops at the plan's max-leads limit, with a message to the tenant admin; imports report how many rows were skipped. | Must | ❌ | — | No limit message. |

## Out-of-SRS behaviour
None found.
