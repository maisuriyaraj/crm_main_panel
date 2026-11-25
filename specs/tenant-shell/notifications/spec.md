# In-app notifications
**SRS section:** 4.5 · **Requirement IDs:** SH-NT1, SH-NT2 · **Priority:** Must 1, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/notifications/spec.md)
**Overall status in this project:** 🟡 (2 of 2 requirements code complete since 2026-11-25; two of the six events have never produced a row to show)

## Summary
The bell in the top bar: an unread count, the latest notices with an icon for each kind
of event, a headline and the time, "Mark all as read", and opening one marks it read and
goes to the record it is about.

Since 2026-11-25 the bell reads the API's `link` field instead of deciding where to go
from the notification's type, so a notice the API gains later lands in the right place
with no change here. Used by all tenant users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

**No tests were written or run for this work, by Raj's instruction (2026-11-25), and
`npm run lint` and `tsc` were not run either (also asked for).**

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-NT1 | Bell shows events relevant to the user: lead assigned, follow-up due, invoice paid or overdue, campaign paused or budget exhausted, usage limit reached. | Must | 🟡 | `components/layout/notifications-bell.tsx`, `lib/notifications/presentation.ts` (`lookOf`), `lib/store/slices/notificationsSlice.ts`, `lib/usage/mappers.ts`, `lib/usage/types.ts` | The panel shows every one of the six events, each with its own icon and tone, plus the usage, subscription, team, integration and security notices that existed before. **Two cannot be seen yet**, for backend reasons: *follow-up due* has no data (`lead_followups` has no routes — LD-D2 is not built), and the two *campaign* notices need live Meta or Google data, which needs OrbitOps' ad credentials. Lead assigned and the two invoice notices work against data that exists today. |
| SH-NT2 | Mark one or all as read; click opens the related record. | Should | 🟡 | `components/layout/notifications-bell.tsx`, `lib/notifications/presentation.ts` (`hrefForLink`), `app/[orgnization]/leads/page.tsx` (`?lead=` deep link) | Mark one, mark all, and the empty state are done. Opening one marks it read and navigates by the API's `link`. 🟡 only because **an invoice and a campaign land on their list, not on the one record**: neither the Billing page nor the Ad campaigns page has a detail view to open yet (see Decisions). A lead does open: the list reads `?lead=<id>` and opens its sheet. |

## Decisions (2026-11-25)

### The link decides where to go, not the type
- The bell no longer has a `switch` over notification types. It asks
  `hrefForLink(item.link, orgSlug)` in `lib/notifications/presentation.ts`, which turns
  the API's `{ kind, id }` into one of this panel's own routes.
- **The API never sends a panel URL**, so the routing table stays here, beside
  `pageRoutes`. A notice the API adds later needs no change in this repo as long as its
  kind is one already mapped.
- **An absolute URL is never followed.** A `{ url }` link is used only when it starts
  with `/`, so a value coming back from the API can never send a member off the site.
- Kinds mapped: `lead` → the lead list with `?lead=<id>`; `invoice` → Settings ▸ Billing;
  `campaign` → Ad campaigns; `usage` and `subscription` → Plan & usage; `integrations` →
  the Ads Manager overview (where ad platforms are connected); `team` → Settings ▸ Team;
  `profile` → Settings ▸ Security.
- **`client` is deliberately not mapped:** the tenant's own Billing & Invoices module has
  no screen in this panel yet. An unmapped kind, a missing link, and an older row with no
  link all behave the same: the entry is **marked read and the bell stays open**, rather
  than navigating somewhere that does not exist.

### Only the lead carries an id
- A lead, an invoice and a campaign each live on a list, not on a page of their own. A
  query parameter is only sent where the list can really open the one record: **today
  just `?lead=<id>`**, which the lead list's detail sheet understands.
- The lead list opens the sheet once that lead is in the loaded page, and **clears the
  parameter either way**, so a reload does not reopen it and a lead that is not on this
  page simply leaves the person on the list.
- Invoice and campaign notices therefore land on the right list, and the notice's own
  words name which invoice or campaign it is about. **What would make SH-NT2 ✅:** a
  detail view on the Billing page and on Ad campaigns, then the same `?invoice=` /
  `?campaign=` parameter added to `KIND_ROUTES`.

### The icon
- One icon and one tone per type in `lookOf`, with a family fallback by prefix
  (`lead.`, `usage.`, `billing.`, `subscription.`, `ads.`, `security.`, `integration.`),
  so a type the API gains later gets a fitting icon rather than a gap.
- **The icon never carries meaning on its own.** Every entry also has its words, and the
  tone is only a semantic token (`text-primary`, `text-destructive`,
  `text-muted-foreground`) — no raw colour, and nothing is lost to a screen reader
  (the icons are `aria-hidden`).

### What an entry shows
- The payload's `title` is the headline, in bold while unread, with the `message` under
  it when it says something more. An older notice has only a message, which becomes the
  headline — so nothing is blank.
- The time uses the shared `useDateFormat` hook, so it follows the tenant's own date
  format.
- The unread dot moved to the right of the row, so the icon has the left edge. "unread"
  and "nothing to open" are also said in `sr-only` text, since neither a dot nor a
  missing link is readable aloud.
- The popover is a little wider (`w-96`) and taller (`max-h-96`) to fit a headline, a
  detail line and the time.

### Mark all as read
- `POST /app/notifications/read-all` through the existing
  `reqToMarkAllNotificationsRead` thunk. The list in hand is stamped rather than
  refetched, so the bell does not flicker. Shown only while something is unread.
- A failed mark-all is said above the list and leaves it readable, rather than replacing
  everything with an error.

### Empty state
- "You're all caught up", with a tick and one line naming what will appear here. The
  header's subtitle says the same thing whenever nothing is unread.

## Pending from the backend
Nothing. Every field and route this panel needs is built (`link` on every notification,
`POST /app/notifications/read-all`, and all six notice types). Two of the six have no
data to send yet, which is a gap in other features, not in the API:
- **Follow-ups due** need LD-D2's follow-up routes, so a `lead_followups` row can exist.
- **Campaign paused / budget exhausted** need OrbitOps' Meta and Google credentials, so
  the ad metrics sync can run at all.

## Out-of-SRS behaviour
- `lib/notifications/presentation.ts` as a separate module: the SRS does not ask for the
  icon set or the kind-to-route table to live apart from the bell.
- Refusing an absolute `url` link.
- Marking a notice read even when there is nowhere to go.
- Clearing `?lead=` after opening the sheet.
- The one-minute poll (already there before this work).

## Change Request History
- 2026-11-25: the bell rewritten to navigate by the API's `link` rather than by
  notification type, with an icon and tone per type, a headline plus detail line, the
  "You're all caught up" empty state, and `?lead=<id>` honoured by the lead list. `link`
  and `title` added to `AppNotification` and its mapper. No tests, lint or tsc run, by
  Raj's instruction. Asked by Raj.
- 2026-11-09: the bell (unread count, list, mark one read) built with usage limits (MA-P8). Asked by Raj.
