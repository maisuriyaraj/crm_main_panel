# Budget management
**SRS section:** 6.11 · **Requirement IDs:** AD-B1, AD-B2 · **Priority:** Must 1, Should 1 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/budget/spec.md)
**Overall status in this project:** ❌ (0 of 2 requirements implemented)

## Summary
Budgets and spend alerts. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-B1 | Daily and lifetime budget per campaign; spend vs budget bar. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-B2 | Alerts when a campaign spends 80% and 100% of its budget, or when daily spend runs ahead of pace. | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
