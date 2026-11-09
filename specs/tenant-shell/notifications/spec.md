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
| SH-NT1 | Bell shows events relevant to the user: lead assigned, follow-up due, invoice paid or overdue, campaign paused or budget exhausted, usage limit reached. | Must | 🟡 | `components/layout/notifications-bell.tsx`, `lib/store/slices/notificationsSlice.ts` | Since 2026-11-09 the bell shows the member's notifications with an unread count; only usage alerts are written by the backend today. Lead assigned, follow-up due, invoices and campaigns have no events. Not covered by tests. |
| SH-NT2 | Mark one or all as read; click opens the related record. | Should | 🟡 | `components/layout/notifications-bell.tsx` | Opening one marks it read and, for a usage alert, goes to Plan & usage. No mark-all (no backend route). Not covered by tests. |

## Out-of-SRS behaviour
None found.

## Change Request History
- 2026-11-09: the bell (unread count, list, mark one read) built with usage limits (MA-P8). Asked by Raj.
