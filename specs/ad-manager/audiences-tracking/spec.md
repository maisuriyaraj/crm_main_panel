# Audiences and tracking
**SRS section:** 6.8 · **Requirement IDs:** AD-AU1, AD-AU2, AD-AU3 · **Priority:** Must 1, Should 2 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/audiences-tracking/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
Saved audiences and pixel or conversion tracking sources. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-AU1 | Saved audiences (reusable segments) with name, size and quality badge (High / Med / Low). | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-AU2 | Audience types: saved targeting, custom (from CRM leads or customer list upload, hashed), lookalike (from a source audience), retargeting (e.g. cart abandoners 30 days). | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-AU3 | Pixel & conversion tracking: list of connected sources (Meta Pixel, Google Ads tag, TikTok Pixel) with ID, events tracked and status (Active / Warning / Inactive); "+ Add tracking source". | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
