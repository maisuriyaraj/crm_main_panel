# Ad account connection
**SRS section:** 6.2 · **Requirement IDs:** AD-C1, AD-C2, AD-C3 · **Priority:** Must 3 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/account-connection/spec.md)
**Overall status in this project:** 🟡 (3 of 3 requirements built since 2026-11-23; nothing proven against Meta or Google, which needs OrbitOps' credentials)

## Summary
Connects Meta, Google and WhatsApp accounts by OAuth and shows what the hourly sync pulled back. Two pages exist under `app/[orgnization]/ads-manager/`: **Ads Manager** (platform connections, the "connect again" banner and the last-synced line) and **Ad campaigns** (campaigns per connected account, a date range, the available metric columns, and Refresh). Used by Marketing Manager and Tenant Admin.

The connection cards themselves are the panel component the setup wizard and Settings > Integrations already used (`components/integrations/ad-integrations-panel.tsx`); it now also carries the sync line, a read-only mode, and a Refresh button. Nothing here has been seen working against a real Meta or Google account, because OrbitOps' own credentials with those platforms are not entered yet: every card then shows "Not configured by OrbitOps yet".

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-C1 | Connect ad accounts through each platform's OAuth (Meta Marketing API, Google Ads API, WhatsApp Business / Click-to-WhatsApp via Meta). Multiple accounts per platform allowed. | Must | 🟡 | `app/[orgnization]/ads-manager/page.tsx`, `components/integrations/ad-integrations-panel.tsx`, `components/ads/whatsapp-card.tsx`, `lib/store/slices/adIntegrationsSlice.ts`, `lib/navigation.ts` | Built: a card per platform with Not connected / Connected / Needs reconnect / Error, the "Not configured by OrbitOps yet" state, Connect (opened only to the platform's own https host), the list of reachable ad accounts with any number tickable, Save accounts, and Disconnect behind a confirmation. WhatsApp is shown as a Meta sub-scope, not a third Connect button, and says whether the permission was granted. **Not proven:** no real OAuth round trip has been made (no credentials). The API keeps one connection per platform at a time, so two separate Meta logins at once are not offered. |
| AD-C2 | Tokens are stored encrypted; expiring or revoked tokens raise a reconnect alert. | Must | 🟡 | `components/ads/reconnect-banner.tsx`, `components/ads/campaigns-view.tsx` (its own notice), `components/layout/notifications-bell.tsx`, `lib/store/slices/adIntegrationsSlice.ts` (`providersNeedingReconnect`) | Built: a banner on the Ads Manager page naming each platform that must be connected again and why, in our own words; the campaigns page shows the same notice from `connection_status` with a link back; the bell now opens Ads Manager for an `integration.reconnect_required` notification. No token ever reaches the browser (the API never sends one). **Not proven:** a real expired or revoked connection has never been seen, so the banner and the bell row have only been reasoned about, not observed. |
| AD-C3 | Metrics sync on a schedule (default every 1 hour) and on demand (Refresh); the last-synced time is shown. | Must | 🟡 | `app/[orgnization]/ads-manager/campaigns/page.tsx`, `components/ads/campaigns-view.tsx`, `components/ads/refresh-button.tsx`, `lib/ads/format.ts` | Built: "Figures last updated 4 minutes ago · Updated automatically every hour" on both pages, a Refresh button that counts down (`Refresh in 4:12`) through the API's five-minute gap and says what each refresh did, and the campaign table with Spend, Impressions, Clicks, CTR, CPC, Leads and Budget/day per account and date range, with totals kept apart per currency. **Not proven:** no real figure has ever arrived. Reach, conversions and ROAS are not shown because the API does not store them yet (SRS 6.3), and Leads is "—" for Google, which reports no lead count. |

## Decisions (2026-11-23)

### Which pages exist
- **Two pages built: Ads Manager (overview and connections) and Ad campaigns.** The SRS's other Ad Manager tabs (Ad Sets, Creatives, Audiences, A/B testing, Analytics) have no page and **no nav entry**, which is this repo's existing rule: an item in `lib/navigation.ts` before its page exists is a link to Next's not-found page and reads as a broken app. Each gets its entry with its own feature. Nothing had to be removed from the nav, because no `/ads-manager/*` link was there yet.
- A new "Advertising" nav group holds the two items, both gated on `ads.view` and the `ads` module.

### Who sees what
- **The campaigns page needs `ads.view` alone**, because that is all the API's campaigns route needs. Sales, marketing, finance and viewer roles can read results.
- **The connections list needs `ads.view` and `organization.settings.manage`** — exactly what the API's overview route needs. A member with only `ads.view` is told that connections are managed by owners and admins and is pointed at the campaigns page; the page fires no request it knows would be refused.
- **Connect, Save accounts, Disconnect and Refresh need `ads.manage` and `organization.settings.manage`.** Without both, the cards are read only and say so, and Refresh is disabled with the reason in a tooltip.

### Money and missing numbers
- Money arrives in the ad account's own currency and smallest unit. Every figure is formatted with that currency beside it (`lib/ads/format.ts`), and **accounts in different currencies are never added together**: the totals row is one card per currency, with a line saying why.
- A null figure is shown as "—", never as zero, so "the platform reports no lead count" cannot be read as "no leads".

### Refresh
- The button counts down through the API's five-minute gap rather than letting the request fail; `SYNC_TOO_SOON` and `SYNC_IN_PROGRESS` also have plain-word messages in `lib/auth/errors.ts` for the case where the clock disagrees.
- A refresh the platform refused is reported as information, not an error: the connection is still there and the hourly sync tries again. `reconnect_required` sends the member to the banner.

### Settled while building
- **The filters on the campaigns page** (ad account, status) are built from the rows on the current page, because the campaigns route returns no separate list of accounts or statuses. An account with no campaigns in the chosen range is therefore not offered as a filter.
- The date range offers Last 7 days, Last 30 days, This month and Custom (SRS 6.1's set), defaulting to the last 30 days, which is what the API defaults to.
- Settings > Integrations keeps working as before (same component, no sync line there), so there are now two ways to reach the connections: Settings for setup, Ads Manager for day-to-day.

## Pending from the backend
Everything this page needs exists. What is still missing sits outside this project:

- **OrbitOps' Meta and Google credentials** (Meta app and App Review, Google OAuth client and developer token). Until they are entered, every card shows "Not configured by OrbitOps yet" and nothing can be connected, so none of these three requirements can be proven.
- **Reach, conversions and conversion value** are not stored by the API, so the KPI cards in SRS 6.3 cannot be built yet.
- **A lead count for Google**: the API sends null until conversion actions are mapped.
- **The bell's own row** depends on the tenant notification being delivered (SH-NT1 is built for usage alerts and now routes this type too), but no real `integration.reconnect_required` row has been seen.

## Out-of-SRS behaviour
- The per-currency totals cards and the CTR / CPC columns on the campaigns list (the SRS puts these on the Ad Manager's KPI cards, 6.3).
- The Refresh countdown and the "nothing is being synced" note when no ad account is ticked.
- The read-only connection cards for a member who may see but not change a connection.

## Change Request History
- 2026-11-23 | Built the Ads Manager and Ad campaigns pages, the connections panel's sync line, read-only mode and Refresh, the reconnect banner and bell routing, and the campaigns table with its date range and per-currency totals | The backend side went code complete, so the panel could be built against it | Raj
