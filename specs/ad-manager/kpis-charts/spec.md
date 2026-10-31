# KPI cards and charts
**SRS section:** 6.3 + 6.4 · **Requirement IDs:** AD-K1, AD-K2, AD-K3, AD-K4, AD-G1, AD-G2 · **Priority:** Must 6 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/kpis-charts/spec.md)
**Overall status in this project:** ❌ (0 of 6 requirements implemented)

## Summary
Campaign performance numbers and the spend and channel charts. Merged because they share the same metrics and date range. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-K1 | Cards: Reach, Impressions, Clicks, CTR, CPC, CPM, ROAS, Total spend, Average ROAS — each with a coloured icon, the value, and % change vs the previous equal period with an up/down arrow. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-K2 | Change colour reflects whether the change is good, not its sign: lower CPC or CPM is green, lower ROAS is red. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-K3 | Formulas: CTR = clicks ÷ impressions; CPC = spend ÷ clicks; CPM = spend ÷ impressions × 1000; ROAS = conversion value ÷ spend. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-K4 | Currency shown in the ad account's currency; when accounts use different currencies, totals convert to the tenant's default currency at the daily rate and say so. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-G1 | Performance chart: spend vs conversions over the selected range (daily points, dual axis, hover tooltips). | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-G2 | Channel mix chart: share of spend by platform (Meta, Google, WhatsApp, plus TikTok, LinkedIn and others when connected). | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
