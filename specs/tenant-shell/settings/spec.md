# Tenant settings
**SRS section:** 4.4 · **Requirement IDs:** SH-S1, SH-S2, SH-S3, SH-S4 · **Priority:** Must 3, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/settings/spec.md)
**Overall status in this project:** 🟡 (0 of 4 requirements implemented)

## Summary
Company profile, users and roles, subscription view and notification preferences. Users and roles are well built. The company profile and subscription views are not. Used by Tenant Admin (preferences: every user).

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-S1 | Company profile: name, address, logo, GSTIN/tax ID, default currency, time zone, date format (default DD-MM-YYYY). | Must | ❌ | — | No company settings page. `app/[orgnization]/settings/` has only `security` and `team`. |
| SH-S2 | Users and roles: invite, deactivate, assign role and team (see 2.2). | Must | 🟡 | `app/[orgnization]/settings/team/page.tsx`, `components/team/members-tab.tsx`, `components/team/invite-member-dialog.tsx`, `components/team/invite-link-view.tsx`, `components/team/member-action-dialogs.tsx` | No team assignment. The admin copies and shares the invite link. |
| SH-S3 | Subscription view: current plan, usage against limits, invoices from OrbitOps, upgrade request. | Must | 🟡 | `app/[orgnization]/settings/team/page.tsx` (`seatsUsed`, `seatsLimit`) | A seat bar on the Team page only. No plan view, invoices or upgrade request. |
| SH-S4 | Notification preferences per user (in-app, email) per event type. | Should | ❌ | — | No preferences screen. |

## Out-of-SRS behaviour
- Ownership transfer and the Activity tab (`components/team/activity-tab.tsx`) are not separately listed in the SRS.
