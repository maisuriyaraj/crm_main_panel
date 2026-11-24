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
| SH-S3 | Subscription view: current plan, usage against limits, invoices from OrbitOps, upgrade request. | Must | 🟡 | `app/[orgnization]/settings/usage/page.tsx`, `app/[orgnization]/settings/team/page.tsx` (seat bar) | Since 2026-11-09 Settings > Plan & usage shows the plan name and usage against every limit (see [leads/assignment-limits](../../leads/assignment-limits/spec.md)). No invoices from OrbitOps and no upgrade request screen yet. The backend has both since 2026-11-24 (and the invoice read routes existed before that); see "Pending from the backend" below. Not covered by tests. |
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

## Pending from the backend (2026-11-24)

The backend built SH-S1, SH-S3 and SH-S4. Nothing in this panel uses them yet, so all
three stay ❌ / 🟡 here. Note that two of this spec's rows were out of date before this:
the tenant's own invoice routes and `GET /app/usage` already existed. **No tests were run
on the backend side**, so treat every shape below as unproven and check it against the
real API before building on it.

### Settings > Company (SH-S1)
`GET /api/v1/app/settings` → `{ company, logo, locale }`; `organization.settings.manage`
(Owner and Admin), so the screen is hidden from everyone else.
- `company`: `{ legal_name, display_name, address: { line1, line2, city, state,
  postal_code, country }, phone, website, industry, gstin, gst_state_code }`.
- `logo`: `{ has_logo, path, mime, bytes, updated_at }`; `path` is
  `/api/v1/app/organization/logo`, which 302s to a fresh link — point an `<img>` at it and
  never store the link.
- `locale`: `{ currency, timezone, date_format, allowed_currencies, allowed_date_formats,
  billing_currency }`. `billing_currency` is read only: it is what OrbitOps bills in, and
  only OrbitOps changes it.

Saves, all the same validation as the setup wizard:
- `PUT /app/settings/company` — the whole section is replaced, so send every field;
  a field left out is cleared. **Except `gstin` and `gst_state_code`**: leave them out to
  keep them, send `null` to clear one. Both are India only (country `IN`), and a GSTIN must
  start with its state code. Errors come back as 400 `VALIDATION_FAILED` with
  `errors: [{ field, message }]`.
- `PUT /app/settings/locale` — `{ currency, timezone, date_format? }`.
- `POST /app/settings/logo` — multipart, one image (JPG, PNG, GIF, WebP; no SVG), 20
  uploads an hour.

**`date_format` is this panel's job.** The API keeps sending ISO 8601 everywhere; read the
tenant's `date_format` once and format with it. Nothing on the backend changed.

### Settings > Plan and billing (SH-S3)
The plan and usage screen already exists. What is new to build:
- `GET /app/billing/invoices` — needs `billing.view` (Owner, Admin, Accountant). Takes
  `page`, `limit`, `status` (PENDING, PAID, OVERDUE, VOID), `issue_from`, `issue_to`,
  `due_from`, `due_to` (YYYY-MM-DD) and `overdue_only`. Answers the rows plus `pagination`,
  `totals` per currency (`outstanding_minor`, `overdue_minor`) and `credit`. Amounts are
  **minor units** (paise), so divide by 100 to show them.
- `GET /app/billing/invoices/:id` — the invoice with `lines`, `taxes` and `payments`.
- `GET /app/billing/invoices/:id/pdf` — **302 to a signed link**, so a plain link or
  `window.open` is enough; `?format=json` gives `{ url, expires_at, variant }` instead.
  409 `PDF_NOT_READY` while the worker has not drawn it, 503 `STORAGE_NOT_CONFIGURED`.
- `POST /app/billing/upgrade-request` — `{ message? }` (3 to 1000 characters). Answers
  `{ queued, message, plan_name }`; show the `message` as it is. **429** means one request
  an hour per workspace has already been used — say so rather than retrying.
- A tenant can never change its own plan, so the screen asks OrbitOps; keep the existing
  "Contact the OrbitOps team" wording consistent with it.

### Settings > Notifications (SH-S4)
- `GET /app/notification-preferences` — any active member. Answers `{ preferences:
  [{ alert_type, category, label, description, audience, self_only, in_app, email,
  locked }] }`. Only the types this member may set are listed, so render the list the API
  gives and do not hardcode the nine types.
- `locked` is a list of channel names (`in_app`, `email`). Show a locked channel as on and
  not switchable, with a line saying it is always sent — for the two `security.*` types
  that is both channels, and for `subscription.invoice_issued` it is the email.
- `PUT /app/notification-preferences` — `{ items: [{ alert_type, in_app?, email? }] }`,
  only what changed. 400 `UNKNOWN_ALERT_TYPE` (a type this member may not set), 409
  `ALERT_TYPE_LOCKED` (tried to turn a locked channel off).
- `label`, `description` and `category` come from the API, for grouping and labels.
