# Campaigns tab
**SRS section:** 6.5 · **Requirement IDs:** AD-T1, AD-T2, AD-T3, AD-T4, AD-T5 · **Priority:** Must 4, Should 1 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/campaigns/spec.md)
**Overall status in this project:** ❌ (0 of 5 requirements implemented)

## Summary
The campaign table, on/off toggle and create wizard. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-T1 | Table titled "Campaigns – All accounts – <range>" with columns: On/Off toggle, Campaign (name + objective, e.g. Conversions, Awareness, Lead Gen), Platform, Status badge (Active / Paused / Ended / Draft / Error), Budget per day, Spent, Reach, Impressions, Clicks, CTR, CPC, ROAS. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-T2 | The On/Off toggle pauses or resumes the campaign on the ad platform; the change is confirmed by the platform before the UI updates, and failures are shown. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-T3 | Columns customisable; export to CSV/Excel. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-T4 | Create campaign wizard: platform → account → objective → name → budget (daily or lifetime) → schedule → audience → creatives → review → publish (or save draft). | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-T5 | Edit, duplicate and archive campaigns. | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
