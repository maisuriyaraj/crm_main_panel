# Ad Manager header and navigation
**SRS section:** 6.1 · **Requirement IDs:** AD-H1, AD-H2, AD-H3, AD-H4 · **Priority:** Must 4 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/header-navigation/spec.md)
**Overall status in this project:** ❌ (0 of 4 requirements implemented)

## Summary
The top of the Ad Manager: header, platform switcher, tabs and date range. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-H1 | Header: breadcrumb (Home › Ad Manager), title, tagline "Plan, launch, and optimize campaigns across every channel", Pixel & tracking button, primary "+ Create campaign" button, search campaigns. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-H2 | Platform switcher: All, Meta Ads (Facebook/Instagram), Google Ads, WhatsApp Ads. Only connected platforms are selectable; others show "Connect". | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-H3 | Tabs: Campaigns, Ad Sets, Creatives, Audiences, A/B testing, Analytics. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-H4 | Date range selector (last 7 days, last 30 days, this month, custom) applies to all metrics on the page. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
