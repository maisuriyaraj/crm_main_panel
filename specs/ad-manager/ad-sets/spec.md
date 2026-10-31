# Ad Sets tab
**SRS section:** 6.6 · **Requirement IDs:** AD-S1, AD-S2, AD-S3, AD-S4 · **Priority:** Must 2, Should 2 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/ad-sets/spec.md)
**Overall status in this project:** ❌ (0 of 4 requirements implemented)

## Summary
Targeting, budget, schedule and auto-optimisation. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-S1 | Audience targeting: locations (multi-select countries, regions, cities), age range slider (18 to 65+), gender, interests (multi-select tags, searched from the platform's interest list), languages. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-S2 | Estimated audience size range fetched from the platform (e.g. 2.4M–3.1M). | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-S3 | Budget and schedule: daily budget (editable) and lifetime budget (calculated as daily × days, or set directly), start and end dates. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-S4 | Auto-optimisation toggle: "Let OrbitOps shift spend toward best performers" — reallocates budget between ad sets in a campaign by ROAS or CPA within limits the user sets; every shift is logged. | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
