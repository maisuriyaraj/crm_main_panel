# Ad Manager header and navigation
**SRS section:** 6.1 · **Requirement IDs:** AD-H1, AD-H2, AD-H3, AD-H4 · **Priority:** Must 4 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/header-navigation/spec.md)
**Overall status in this project:** 🟡 (4 of 4 requirements built since 2026-11-27; AD-H3 complete, the other three partial — AD-H1 and AD-H4 wait on features that do not exist yet, and AD-H1, AD-H2 and AD-H4 on OrbitOps' Meta and Google credentials, so no figure or connection state has ever been seen for real)

## Summary
The top of the Ad Manager: one shared header over every tab, with the breadcrumb, title, tagline, the two header actions, a campaign search, the platform switcher, the date range and the tab strip. Built on top of what [account-connection](../account-connection/spec.md) already made: the Connections page and the Campaigns table are that feature's work and are now tabs inside this shell rather than two separate screens. Used by Marketing Manager, Tenant Admin.

The header is `components/ads/manager-shell.tsx`, rendered once by `app/[orgnization]/ads-manager/layout.tsx`, so moving between tabs never rebuilds it. The platform, date range, search term and page live in the URL (`hooks/useAdManagerQuery.ts`), which is what lets the header own the controls while each tab reads them.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-H1 | Header: breadcrumb (Home › Ad Manager), title, tagline "Plan, launch, and optimize campaigns across every channel", Pixel & tracking button, primary "+ Create campaign" button, search campaigns. | Must | 🟡 | `components/ads/manager-shell.tsx`, `app/[orgnization]/ads-manager/layout.tsx`, `hooks/useAdManagerQuery.ts`, `components/ads/coming-soon.tsx` | Built: the breadcrumb (Home links to the dashboard), the title, the tagline word for word, both buttons, and the campaign search box — typed with a 400 ms pause, kept in the URL as `?q=` and sent to the API's new `search` parameter, so the match is over every campaign the sync stored rather than only the page on screen. **Partly:** "Pixel & tracking" and "+ Create campaign" are real buttons that open a "coming soon" dialog naming what the feature will do, because neither feature exists on either side (see Blocked). They are deliberately not hidden: the product has them, and a member should see what is coming rather than a smaller product. |
| AD-H2 | Platform switcher: All, Meta Ads (Facebook/Instagram), Google Ads, WhatsApp Ads. Only connected platforms are selectable; others show "Connect". | Must | 🟡 | `components/ads/platform-switcher.tsx`, `lib/ads/platforms.ts`, `lib/store/slices/adIntegrationsSlice.ts` (`reqToGetAdPlatformStates`, `platformStates`), `components/ads/campaigns-view.tsx` | Built: all four options, the choice kept in the URL as `?platform=`. **All** uses the API's new combined route, with the totals kept apart per currency and each row labelled with the platform it came from. A platform that is not connected, not configured by OrbitOps, or not part of the plan is shown but not selectable, with the reason in a tooltip and a **Connect** link to the Connections tab where that is what would fix it. A platform whose connection has broken stays selectable, because its last figures are still worth reading. WhatsApp is not a connection of its own: it reads the Meta figures and says so. **Not proven:** no platform has ever actually been connected, because OrbitOps’ credentials are not entered, so every state but "not configured" has only been reasoned about. |
| AD-H3 | Tabs: Campaigns, Ad Sets, Creatives, Audiences, A/B testing, Analytics. | Must | ✅ | `lib/ads/manager-tabs.ts`, `components/ads/manager-shell.tsx`, `components/ads/tab-placeholder.tsx`, `app/[orgnization]/ads-manager/{ad-sets,creatives,audiences,ab-testing,analytics}/page.tsx`, `components/ads/coming-soon.tsx` | All six tabs, in the SRS's order, each a real page that opens: the strip is what AD-H3 asks for and it is complete. **Campaigns** is the table built in account-connection. The other five open a page that checks the member's `ads.view` and the organization's plan first — exactly as the two built tabs do — and then says "This is part of an upcoming Ad Manager feature", says in one line what the tab will show, and notes that the connected platforms keep syncing meanwhile. Never a not-found page, never a tab that quietly disappears, and never "coming soon" when the real reason is the member's role or the plan. Each unbuilt tab is marked "· soon" in the strip. A seventh tab, **Connections**, is added for the page the switcher's Connect links point at (see Out-of-SRS). **What is behind five of the tabs is not this requirement:** the SRS gives each its own section and IDs (6.6 AD-S1–S4, 6.7 AD-CR1–CR4, 6.8 AD-AU1–AU3, 6.9 AD-AB1–AB3, 6.10 AD-AN1–AN2), all ❌ in their own specs. *This row read 🟡 until 2026-11-27, when it was counting those five features against a navigation requirement.* No automated test renders these pages, but the suite, `tsc` and the linter are all green on them. |
| AD-H4 | Date range selector (last 7 days, last 30 days, this month, custom) applies to all metrics on the page. | Must | 🟡 | `components/ads/manager-shell.tsx`, `hooks/useAdManagerQuery.ts`, `lib/ads/format.ts` (`RANGE_LABELS`, `rangeForPreset`) | Built: all four choices in the header, kept in the URL as `?range=` plus `?from=&to=` for a custom one, and applied to the Campaigns tab and to the combined "All" view alike. A preset is worked out from today rather than trusted from the URL, so a shared or bookmarked "last 7 days" link still means the last seven days. **Partly:** "all metrics on the page" is every metric there is today — the campaign figures and their per-currency totals. The KPI cards and charts (SRS 6.3–6.4) do not exist on either side, so there is nothing else for it to reach yet. |

## Decisions (2026-11-27)
Asked by Raj before the work. Change them only through `/sdd-change`.

### Where the header lives
- **One layout, not a component each page repeats.** `app/[orgnization]/ads-manager/layout.tsx` renders the shell above `children`, so the header survives a tab change and the breadcrumb, title and tagline exist in one place.
- **The controls live in the URL**, not in the layout's state: a Next layout cannot hand state to the page below it, and the URL also means a reload, a shared link or the browser's Back button lands on the same view. `hooks/useAdManagerQuery.ts` is the only reader and writer of `platform`, `range`, `from`, `to`, `q` and `page`.
- **A default is left out of the URL** (platform `all`, range `30d`, page 1), so the plain `/ads-manager/campaigns` URL is the default view and the address bar stays short.
- **Anything that changes what is being listed resets the page**, because page 4 of the old result is rarely page 4 of the new one.

### The two unbuilt header actions
- **Shown, not hidden**, and both open a dialog saying the feature is still to come and what it will do. Hiding them would make the product look smaller than it is; disabling them silently would leave a member guessing. The dialog is one shared component (`components/ads/coming-soon.tsx`) with one wording, so all eight unbuilt things in the Ad Manager say the same thing the same way.

### Tabs
- **All six tabs exist as pages.** The product asks for six, so five placeholder pages were added rather than five tabs that lead to Next's not-found page. This is the one place where this repo's usual rule — never link to a page that does not exist — is met by building the page instead of dropping the link.
- **An unbuilt tab still answers access and plan first** (`components/ads/tab-placeholder.tsx`): `ads.view`, then whether the plan has `ads_enabled`, then "coming soon". Telling a member a feature is coming when the real reason they cannot use it is their role or their plan would be a wrong answer, and the two built tabs already answer in that order.
- **AD-H3 is the strip, not the five features.** The SRS gives Ad Sets, Creatives, Audiences, A/B testing and Analytics their own sections and IDs, so their emptiness is tracked there. Holding AD-H3 open for them would have made one navigation requirement stand for five whole features.
- **The sidebar is unchanged.** `lib/navigation.ts` still lists only Ads Manager and Ad campaigns: a sidebar full of "coming soon" entries would promise more than the product does, while the tab strip is where the product's own shape belongs. The comment there now says so.
- **Connections is a seventh tab.** The switcher's "Connect" links, the reconnect banner and the bell all already point at `/ads-manager`, so that page belongs in the same strip instead of being reachable only from the sidebar. It is pushed to the right of the six.

### The platform switcher
- **Status comes from the campaigns route, not the overview.** `GET /app/integrations/ads` needs `organization.settings.manage`, which the campaigns screens do not ask for, so a member with only `ads.view` would have an unusable switcher. The combined campaigns answer carries every platform's state, and `reqToGetAdPlatformStates` asks it for a single row when only one platform's list is being shown (which carries no such state). The overview, a disconnect and a refresh all update the same `platformStates`, so the switcher is never stale after a change.
- **Nothing is claimed before the first answer.** A platform whose state has not arrived stays selectable, so a slow network never looks like "not connected".
- **A broken connection stays selectable.** Expired, revoked and error still have stored figures behind them; the tab itself explains that no new ones are arriving.
- **"All" is always open while the plan sells a platform**, even with nothing connected: it is where a member lands, and an empty list with "Connect one in Ads Manager" is an answer, not a dead end.
- **WhatsApp reads the Meta figures** and says in a notice that Click-to-WhatsApp ads are Meta ads and that OrbitOps cannot yet tell which Meta campaigns are the WhatsApp ones. It is offered only when the plan has `ads_whatsapp`, and is unavailable when Meta is not part of the plan or needs attention.

### The date range and the search
- **Both are shown only on the Campaigns tab**, because that is the only tab with figures to filter. A control that visibly does nothing is worse than no control; the choice is still kept in the URL, so coming back to Campaigns from another tab lands on the same range.
- **Custom opens on whatever the previous preset was showing**, rather than two empty date boxes.
- **The search is server-side**, over every stored campaign name, not a filter of the page on screen — the API added the parameter for exactly this. The term is shown back under the filters and in the empty message, so a search with no results cannot be mistaken for "no campaigns".

### Filters belong to a platform
- **The ad account and status filters are remembered with the platform they were chosen for**, and read as "any" once the platform has changed. Clearing them afterwards, in an effect, left one render asking the new platform for the old platform's filter: an account id the API refuses, or a status word only the other platform uses, which would have shown an empty table for no visible reason. The linter's `react-hooks/set-state-in-effect` rule is what surfaced it.

### What was moved, not rebuilt
- The platform tabs and the date range **moved out of** `components/ads/campaigns-view.tsx` into the header, and that component now reads them from the URL. Its ad account and status filters stayed with the table, because they belong to one platform's list rather than to the Ad Manager as a whole. The ad account filter is dropped in the "All" view, since an account id only means something within one platform.
- The Connections page and the Campaigns page kept everything else they had; they lost only their own title, tagline and the button that linked to the other one, all of which the shell now provides.

## Blocked on another feature
Every one of these is named by SRS 6.1 but belongs to a feature that is not specified or built in either project. Nothing was faked for any of them.

The five tab features do **not** hold AD-H3 open: the SRS tracks each under its own IDs, and AD-H3 asks only for the strip, which is complete. They are listed because 6.1 names their tabs, and because this is where someone will come looking for why a tab is empty.

| Blocked | Shown as | Tracked under · needs first |
|---|---|---|
| "+ Create campaign" | A button that opens the "coming soon" dialog | Campaign creation (`specs/ad-manager/campaigns/spec.md`, ❌ in both projects): a campaign form per platform, and an API that writes a campaign to Meta and Google. |
| "Pixel & tracking" | A button that opens the "coming soon" dialog | Pixel and conversion tracking (`specs/ad-manager/audiences-tracking/spec.md`, ❌): the pixel and conversion model, Meta's Conversions API, Google's conversion actions, and how a conversion ties back to a CRM lead. |
| Ad Sets tab | A page saying the feature is upcoming | **6.6 AD-S1–S4** · `specs/ad-manager/ad-sets/spec.md` (❌): ad sets stored by the sync, with their targeting and figures. |
| Creatives tab | A page saying the feature is upcoming | **6.7 AD-CR1–CR4** · `specs/ad-manager/creatives/spec.md` (❌): creatives, their images and videos, and per-creative figures. |
| Audiences tab | A page saying the feature is upcoming | **6.8 AD-AU1–AU3** · `specs/ad-manager/audiences-tracking/spec.md` (❌): audience definitions and custom-audience upload. |
| A/B testing tab | A page saying the feature is upcoming | **6.9 AD-AB1–AB3** · `specs/ad-manager/ab-testing/spec.md` (❌): experiments, variants and a result comparison. |
| Analytics tab | A page saying the feature is upcoming | **6.10 AD-AN1–AN2** · `specs/ad-manager/analytics/spec.md` and `specs/ad-manager/kpis-charts/spec.md` (both ❌): reach, conversions and conversion value, which the sync does not store yet. This is also what AD-H4's "all metrics on the page" is waiting for. |
| Telling WhatsApp campaigns apart from other Meta campaigns | A notice on the WhatsApp option | The sync does not record which Meta campaigns are Click-to-WhatsApp, so there is nothing to filter on. |

## Pending from the backend
- **OrbitOps' Meta and Google credentials.** Until they are entered every platform answers "not configured", so the switcher offers nothing and no figure has ever been seen. This is the same wait [account-connection](../account-connection/spec.md) records.
- **Reach, conversions and conversion value**, for the KPI cards and the Analytics tab.

## API
No new call of this project's own. What this feature uses:

| Call | Used for |
|---|---|
| `GET /app/integrations/ads/campaigns?from&to&status&search&page&limit` | The "All" option, and the platform states the switcher reads. New on the backend side for this feature. |
| `GET /app/integrations/ads/{meta,google}/campaigns?...&search=` | One platform's tab. The `search` parameter is new. |
| `GET /app/integrations/ads` | Unchanged; the Connections tab only. |
| `POST /app/integrations/ads/{meta,google}/sync` | Unchanged; the Refresh button, now one per connected platform in the "All" view. |

## Testing
**No test was written for this work; the suite, the type-checker and the linter were all run** (2026-11-27).
- `npm test` — **92 tests, 92 pass, 0 fail.** `tests/permission-ui.test.mjs` is green, which was the one at risk: the sidebar's entries were deliberately not changed.
- `npx tsc --noEmit` — **no error in any file this feature touched.** Seven errors remain repo-wide, all pre-existing and all in the leads and org-settings files.
- `npm run lint` — **clean on every file this feature touched.** It found one real fault in `components/ads/campaigns-view.tsx` (`react-hooks/set-state-in-effect`) which was fixed rather than suppressed; see below. The 284 remaining errors are pre-existing, mostly `no-explicit-any` in the team and leads files.

**The fault the linter caught was a bug, not a style point.** The ad account and status filters were being cleared in an effect when the platform changed, so for one render the new platform was asked for the old platform's filter — an ad account id the API would refuse with 400 `UNKNOWN_ACCOUNT`, or a status word only the other platform uses, which would silently show nothing. The filters are now remembered together with the platform they were chosen for and read back as "any" once the platform has moved on, so the wrong pair cannot exist even for one render.

What no automated test covers, because nothing in `tests/` renders React: the shell itself, the switcher's states and its Connect links, the five placeholder tabs and their access and plan checks, both "coming soon" dialogs, the search box's pause and its URL round trip, every date-range choice including custom, the combined "All" list with two platforms connected, its per-currency totals and its per-platform Refresh buttons, and the WhatsApp notice. None of it has been opened in a browser either — there is no connected ad platform to open it against.

## Out-of-SRS behaviour
- A seventh **Connections** tab, for the page the switcher's Connect links and every reconnect notice point at.
- The "· soon" marker on the five unbuilt tabs, and the "coming soon" dialog behind the two header actions.
- Keeping the platform, range, search and page in the URL, so an Ad Manager view can be shared or bookmarked.
- A tooltip giving the reason a platform cannot be chosen, and leaving a broken connection selectable so its last figures can still be read.
- One Refresh button per connected platform in the "All" view.

## Change Request History
- 2026-11-27 | Finished AD-H3: the five unbuilt tabs now check the member's access and the organization's plan before saying the feature is upcoming, through one shared placeholder instead of five copies. AD-H3 scoped to the tab strip it asks for, since the five features behind the tabs are tracked under their own SRS IDs | Raj asked for AD-H3 to be completed | Raj
- 2026-11-27 | Built the shared Ad Manager header (breadcrumb, title, tagline, both header actions, campaign search), the platform switcher with its connection states and Connect links, all six tabs plus Connections with five placeholder pages, and the date range — all kept in the URL. Moved the platform tabs and the date range out of the campaigns table into the header, and wired the API's new `search` parameter and combined campaigns route | The backend added the search parameter and the combined campaigns route, so the header the SRS asks for could be built | Raj
