# A/B testing tab
**SRS section:** 6.9 · **Requirement IDs:** AD-AB1, AD-AB2, AD-AB3 · **Priority:** Should 2, Could 1 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/ab-testing/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
One-variable tests with a winner. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-AB1 | Create a test on one variable (headline, creative, CTA, audience) with 2 or more variants, a success metric (CTR, CPC, conversions) and a duration. | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-AB2 | Test card shows variants with progress bars and metric values, and a Winner badge once the result is statistically significant (or at test end). | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-AB3 | Option to auto-apply the winner. | Could | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
