# Tenant settings
**SRS section:** 4.4 · **Requirement IDs:** SH-S1, SH-S2, SH-S3, SH-S4 · **Priority:** Must 3, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/settings/spec.md)
**Overall status in this project:** 🟡 (1 of 4 requirements implemented)

## Summary
Company profile, users and roles, subscription view and notification preferences. Users and roles are well built. The company profile and subscription views are not. Used by Tenant Admin (preferences: every user).

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-S1 | Company profile: name, address, logo, GSTIN/tax ID, default currency, time zone, date format (default DD-MM-YYYY). | Must | ❌ | — | No company settings page. `app/[orgnization]/settings/` has only `security` and `team`. |
| SH-S2 | Users and roles: invite, deactivate, assign role and team (see 2.2). | Must | ✅ | `app/[orgnization]/settings/team/page.tsx`, `components/team/teams-tab.tsx`, `components/team/team-select-items.tsx`, `lib/store/slices/teamsSlice.ts`, `components/team/members-tab.tsx` (team column and filter), `components/team/invite-member-dialog.tsx` (team), `components/team/member-action-dialogs.tsx` ("Change role or team"), `components/team/invite-link-view.tsx` | Invite, suspend, role and team change, and removal. A Teams tab lists teams with lead and members, and creates, renames, sets the lead and deletes (a team with members shows why it can't be deleted). The invite dialog shows the link only when the email was not sent. **Not covered by tests:** the Teams tab, the team filter and column, and the team pickers. Manual check pending. |
| SH-S3 | Subscription view: current plan, usage against limits, invoices from OrbitOps, upgrade request. | Must | 🟡 | `app/[orgnization]/settings/usage/page.tsx`, `app/[orgnization]/settings/team/page.tsx` (seat bar) | Since 2026-11-09 Settings > Plan & usage shows the plan name and usage against every limit (see [leads/assignment-limits](../../leads/assignment-limits/spec.md)). No invoices from OrbitOps and no upgrade request: the backend has neither (platform billing). Not covered by tests. |
| SH-S4 | Notification preferences per user (in-app, email) per event type. | Should | ❌ | — | No preferences screen. |

## Built from the backend list (usage, 2026-11-09)
Built on 2026-11-09 as Settings > Plan & usage.
`GET /app/usage` now gives users, leads, storage and API against the plan's limits for every member, with `is_admin` and `upgrade_message` (SH-S3's "usage against limits"). The screen details are listed in [leads/assignment-limits](../../leads/assignment-limits/spec.md), "Pending from the backend". Invoices from OrbitOps and an upgrade request still have no backend.

## Out-of-SRS behaviour
- Ownership transfer and the Activity tab (`components/team/activity-tab.tsx`) are not separately listed in the SRS.

## Roles and teams (2026-11-10)
- **Done:** the invite and change-role pickers list all nine system roles from `GET /app/roles` (`components/team/role-select-items.tsx`, grouped Built-in / Custom; roles the caller can't assign stay visible and disabled). No change was needed. Not covered by tests; manual check pending.
- **Done:** the role form refuses the five SRS role names (`lib/roles/schema.ts`).

## Teams (Part B, 2026-11-10)
- **Teams tab** (Team settings, `?tab=teams`), for everyone with `team.view`: one card per team with its lead, member count and members (suspended ones marked). With `team.manage`: Create team, Rename, Set team lead (active members of that team only) and Delete. Delete on a team with members explains "Move its N members to another team, or to no team, from the Members tab first" and offers no delete button; the API's `TEAM_NOT_EMPTY` message covers pending invitations and assignment rules too. Names follow the API's rules (2 to 100 characters, unique without case: `TEAM_NAME_TAKEN` shows on the field).
- **Members tab:** a Team column (from md width) and a team filter (All teams, No team, each team), sent as `team_id`.
- **Invite dialog:** an optional Team, shown once the workspace has teams; the member joins it on accepting.
- **"Change role or team"** (was "Change role"): role and team in one dialog; only what changed is sent.
- Teams load with the Team settings page and reload after every change, so counts in the pickers stay current.
- Error codes in plain words: `TEAM_NAME_TAKEN`, `TEAM_NOT_EMPTY`, `TEAM_LIMIT_REACHED`, `LEAD_NOT_IN_TEAM`, `INVALID_TEAM`.
