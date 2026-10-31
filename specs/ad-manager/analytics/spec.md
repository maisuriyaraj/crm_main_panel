# Ad analytics tab
**SRS section:** 6.10 · **Requirement IDs:** AD-AN1, AD-AN2 · **Priority:** Must 1, Should 1 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/analytics/spec.md)
**Overall status in this project:** ❌ (0 of 2 requirements implemented)

## Summary
Cross-platform comparison and lead attribution. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-AN1 | Cross-platform comparison by campaign, platform and date; breakdowns by age, gender, location, device and placement. | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-AN2 | Leads attributed to campaigns: count, cost per lead, and how many reached each CRM stage (closes the loop with Leads). | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
