# In-app notifications
**SRS section:** 4.5 · **Requirement IDs:** SH-NT1, SH-NT2 · **Priority:** Must 1, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/notifications/spec.md)
**Overall status in this project:** ❌ (0 of 2 requirements implemented)

## Summary
The bell that tells users about leads, invoices, campaigns and limits. Nothing is built. Used by all tenant users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-NT1 | Bell shows events relevant to the user: lead assigned, follow-up due, invoice paid or overdue, campaign paused or budget exhausted, usage limit reached. | Must | ❌ | — | No bell or notification list. |
| SH-NT2 | Mark one or all as read; click opens the related record. | Should | ❌ | — | No bell or notification list. |

## Out-of-SRS behaviour
None found.
