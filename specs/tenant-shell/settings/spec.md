# Tenant settings
**SRS section:** 4.4 · **Requirement IDs:** SH-S1, SH-S2, SH-S3, SH-S4 · **Priority:** Must 3, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/settings/spec.md)
**Overall status in this project:** 🟡 (3 of 4 ✅; SH-S1 has a date-format follow-up, SH-S3 waits on the backend's sales email address)

## Summary
Company profile, users and roles, subscription view and notification preferences.

Since 2026-11-25 all four screens exist: Settings > Company (details, logo, currency, time zone and date format), Plan & usage with a link to Billing and a "Request an upgrade" dialog, Billing with the invoices OrbitOps has issued, and Notifications, where every member chooses what reaches their bell and their email. Used by Owner and Admin (company), anyone with `billing.view` (invoices and plan requests), and every member (their own notices).

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-S1 | Company profile: name, address, logo, GSTIN/tax ID, default currency, time zone, date format (default DD-MM-YYYY). | Must | 🟡 | `app/[orgnization]/settings/company/page.tsx`, `lib/store/slices/orgSettingsSlice.ts`, `components/onboarding/company-step.tsx` (GST state and GSTIN), `components/onboarding/other-steps.tsx` (`LocaleStep` date format), `lib/dates.ts`, `hooks/useDateFormat.ts`, `lib/gst.ts`, sidebar and settings-menu entries | Three tabs — Details, Logo, Currency & dates — built from the setup wizard's own step components, so the wizard and Settings are one form against one API. The date format feeds `useDateFormat`, used by every call site this work touched. **🟡 for two reasons:** the Leads, Contacts, Ads and shared-list date displays still format their own way (listed under "Date formatting" below), and a member without `organization.settings.manage` cannot read the setting, so they see the default order until the API carries `date_format` on `/auth/me`. **Not covered by tests; nothing was run** (see Testing). |
| SH-S2 | Users and roles: invite, deactivate, assign role and team (see 2.2). | Must | ✅ | `app/[orgnization]/settings/team/page.tsx`, `components/team/teams-tab.tsx`, `components/team/team-select-items.tsx`, `lib/store/slices/teamsSlice.ts`, `components/team/members-tab.tsx` (team column and filter), `components/team/invite-member-dialog.tsx` (team), `components/team/member-action-dialogs.tsx` ("Change role or team"), `components/team/invite-link-view.tsx` | Invite, suspend, role and team change, and removal. A Teams tab lists teams with lead and members, and creates, renames, sets the lead and deletes (a team with members shows why it can't be deleted). The invite dialog shows the link only when the email was not sent. **Not covered by tests:** the Teams tab, the team filter and column, and the team pickers. Manual check pending. |
| SH-S3 | Subscription view: current plan, usage against limits, invoices from OrbitOps, upgrade request. | Must | ✅ | `app/[orgnization]/settings/usage/page.tsx` (plan, limits, upgrade button, link or note), `app/[orgnization]/settings/billing/page.tsx` (plan card, status filter, invoice table, PDF), `components/billing/upgrade-request-dialog.tsx`, `lib/store/slices/billingSlice.ts` (filters, `reqToRequestUpgrade`) | Plan name and limits (since 2026-11-09), the invoice list with issue date, amount, status badge and Download PDF, a status filter served by the API, and the "Request an upgrade" dialog answering "Our team will be in touch." Invoices and plan requests are gated on `billing.view`; without it Plan & usage says who to ask. **The upgrade email only leaves OrbitOps once `billing.sales_email` is set on the backend** — the screen already says so, from the API's own sentence. **Not covered by tests; nothing was run.** |
| SH-S4 | Notification preferences per user (in-app, email) per event type. | Should | ✅ | `app/[orgnization]/settings/notifications/page.tsx`, `components/notifications/preference-row.tsx`, `lib/store/slices/notificationPreferencesSlice.ts`, `components/layout/notifications-bell.tsx` (settings link, new notice routes) | Grouped Usage, Team, Subscription, Integrations and Security, each notice with In-app and Email switches. The list comes from the API, so a member only ever sees the notices their role may receive. A locked channel is shown on and not switchable, with the reason. **Not covered by tests; nothing was run.** |

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

## Pending from the backend (2026-11-24) — built on 2026-11-25

**Done.** Everything listed below was built on 2026-11-25; the section is kept because it is
the API contract these screens were written against. Two items are still open and are
listed at the end of the next section.

The backend built SH-S1, SH-S3 and SH-S4. Note that two of this spec's rows were out of date before this:
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

## Built from the backend list (SH-S1, SH-S3, SH-S4; 2026-11-25)

**No tests were written or run for this work**, and neither `tsc` nor eslint was used as a
verification step, by Raj's instruction. The files were checked only by parsing them.

### Decisions

**One form, two ways in (SH-S1).** Settings > Company does not have forms of its own: it
renders the setup wizard's own `CompanyStep`, `LogoStep` and `LocaleStep` against the
matching `/app/settings/*` routes. The wizard and Settings therefore share one validation
schema, one set of fields and one API-field-error mapping; the only difference is that
Settings passes no `onSkip`/`onBack` and a `submitLabel` of "Save changes". `StepActions`
returns nothing when it has no buttons, so Settings does not draw the wizard's empty
divider.

Three things were added to those shared components, which means the setup wizard gained
them too — deliberately, because they are the same fields:
- **GST state and GSTIN**, shown only when the country is `IN` (they are Indian tax
  identifiers and the API refuses them otherwise). The form checks what the API checks: a
  GSTIN's 15-character shape, and that it starts with the chosen state's code.
- **Date format**, in the currency and time zone step.
- The company save always sends `gstin` and `gst_state_code`, mapping an empty box to
  `null`. On this form an empty box means the member cleared it, and `null` is how the API
  is told so. (The API leaves them alone when they are *absent*, which is what protects a
  panel that does not ask for them — this one does.)

**The date format is the panel's job.** The API sends ISO 8601 everywhere. `lib/dates.ts`
holds the three orders and the two formatters; `useDateFormat()` binds them to the
organization's choice. A date-only value (`"2026-03-09"`) is taken apart as written rather
than through a `Date`, because reading it in the viewer's time zone can land on the day
before.

**Where the choice comes from, and its one limit.** `GET /app/settings` needs
`organization.settings.manage`, so only an Owner or Admin can read it. The workspace shell
loads it once for those members; **everyone else keeps the default DD-MM-YYYY.** Making it
right for every member needs `date_format` on `/auth/me` — see the backend follow-up below.

**Invoices and plan requests are gated on `billing.view`** (the key the API checks, held by
Owner, Admin and Accountant), never on `isAdmin`. Plan & usage, which every member may
open, shows a link to Billing to those who have it and a short note naming who to ask to
those who do not. Billing itself renders `NoAccess` and fires no request.

**The PDF route is called with `?format=json`.** It now redirects to a signed storage link
by default, and a browser request would follow that redirect without our cookie; asking
for the link and opening it in a new tab keeps the download working.

**The upgrade dialog sends, then stays.** One request an hour per workspace is allowed, so
after a send the dialog shows "Our team will be in touch." plus the API's own sentence
(which says whether the email actually went) and offers only Close. A 429 is explained in
plain words rather than retried.

**Notification preferences are rendered from the API.** The screen holds no list of notice
types: `GET /app/notification-preferences` answers only what this member's role may
receive, so an admin-only notice is simply absent for anyone else. The categories are
grouped in a fixed order (Usage, Team, Subscription, Integrations, Security) and a category
the panel does not know about falls into "Other" rather than disappearing. Each switch
saves on its own — the switch *is* the save, so there is no Save button to forget — and the
answer carries the whole list back, so the screen cannot drift from the server.

A **locked** channel (from the API's `locked` list) is shown on, disabled, and explained:
both channels for the two `security.*` notices ("This is about your own account, so it is
always sent"), and the email for `subscription.invoice_issued` ("an invoice is a document
your organization has to receive"). The API also refuses turning one off, so the screen and
the server agree.

### Screens

- **Settings > Company** (`/settings/company`, `organization.settings.manage`): tabs
  Details, Logo, Currency & dates. Replaced the sidebar's old "Company setup" entry, which
  pointed at the first-login wizard; the wizard keeps its own route for first login.
- **Settings > Plan & usage** (`/settings/usage`, every member): unchanged plan and usage
  cards, plus "Request an upgrade" and either a link to Billing or the note for members
  without `billing.view`.
- **Settings > Billing** (`/settings/billing`, `billing.view`): a plan card linking to Plan
  & usage, outstanding and credit cards, and the invoice table (Invoice, Issued, Due,
  Status, Amount, Outstanding, PDF) with an API-served status filter (All, Due, Paid,
  Overdue, Cancelled). Now reachable: it had no nav entry before.
- **Settings > Notifications** (`/settings/notifications`, every member): the grouped
  preference list. Linked from the bell's footer.

### Date formatting: what was changed, and what was not

Changed to `useDateFormat` as part of this work:
- `settings/billing/page.tsx` — issue and due dates;
- `settings/usage/page.tsx` — "Counted …";
- `components/usage/held-leads-notice.tsx` — "oldest since …";
- `components/layout/notifications-bell.tsx` — each notice's time.

**Not touched, as a follow-up.** These still format dates their own way, and will read
`DD-MM-YYYY`-ish regardless of the setting until each is moved over:
`components/contacts/contact-detail-sheet.tsx`, `components/leads/lead-detail-sheet.tsx`,
`components/leads/kanban-board.tsx`, `components/leads/kanban-card.tsx`,
`components/leads/lead-analytics.tsx`, `components/shared/server-list.tsx`,
`app/[orgnization]/leads/page.tsx`, `app/[orgnization]/contacts/page.tsx`, and
`lib/ads/format.ts`. Moving them is mechanical but touches Leads, Contacts and Ads, which
this work was not asked to change.

### Error codes in plain words

Added to `API_ERROR_MESSAGES`: `GSTIN_INVALID`, `INVOICE_NOT_FOUND`, `PDF_NOT_READY`,
`UNKNOWN_ALERT_TYPE`, `ALERT_TYPE_LOCKED`. `VALIDATION_FAILED`, `PERMISSION_DENIED`,
`TOO_MANY_ATTEMPTS` (the upgrade request's 429), `FILE_*`, `LOGO_*` and
`STORAGE_NOT_CONFIGURED` were already there and cover the rest of these screens.

### State

Two new slices, both following the repo's thunk contract:
- `orgSettingsSlice` — `reqToGetOrgSettings`, `reqToSaveCompanySettings`,
  `reqToSaveLocaleSettings`, `reqToUploadOrgLogo`. The save routes answer the wizard's whole
  state and the read answers the three sections, so the slice takes `body.values ?? body`
  and maps an unknown `date_format` back to the default.
- `notificationPreferencesSlice` — `reqToGetNoticePreferences`,
  `reqToSaveNoticePreferences`.

`billingSlice` gained the invoice filters and `reqToRequestUpgrade` (with its own
`isRequestingUpgrade`, so the dialog's button has state without touching the list).
`onboardingSlice`'s company type gained `gstin`/`gst_state_code` and its locale type became
`OnboardingLocale` with `date_format` and `allowed_date_formats`.

The sidebar's logo version now reads `orgSettings` first and the wizard's state second, so
a logo changed from Settings refreshes it.

### Testing

**None.** No test file was written or changed, and nothing was run — not `npm test`, not
`npm run lint`, not `tsc` — by Raj's instruction. Every new and changed file was parsed with
the TypeScript parser to catch syntax errors, which is not a type check. What is therefore
unproven:
- that the API's answers map onto the types assumed here, in particular
  `GET /app/settings`'s three sections and the save routes' `values` wrapper;
- the GSTIN and GST-state rules, and that clearing them sends `null`;
- the date format reaching every changed call site, and the shell's one-time load;
- the invoice status filter, the `?format=json` PDF link, and the upgrade dialog's send,
  429 and "no sales email set" paths;
- every notification preference switch, the locked channels, and the grouping of a category
  the panel does not know.

### Pending from the backend (follow-up)

- **`date_format` is not on `/auth/me`.** Until it is, only members with
  `organization.settings.manage` see the organization's chosen order; everyone else gets
  `DD-MM-YYYY`. Adding it to `/auth/me` (and reading it in `useDateFormat`) would finish
  SH-S1 for every member.
- **`billing.sales_email` is not set**, so an upgrade request is recorded and alerts
  OrbitOps staff but sends no email. The dialog already says so.
- The backend's own test inventories have no entries for its ten new routes, so its
  `npm test` fails until someone adds them. Nothing in this panel depends on that, but the
  API behind these screens has not been exercised by any test.
