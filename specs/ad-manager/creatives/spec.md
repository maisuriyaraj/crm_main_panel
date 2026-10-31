# Creatives tab
**SRS section:** 6.7 · **Requirement IDs:** AD-CR1, AD-CR2, AD-CR3, AD-CR4 · **Priority:** Must 3, Should 1 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/creatives/spec.md)
**Overall status in this project:** ❌ (0 of 4 requirements implemented)

## Summary
The creative library and upload validation. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-CR1 | Creative library with Upload media; types: Image, Video, Carousel. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-CR2 | Each card shows preview, name, format badge and CTR. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-CR3 | Validate files against each platform's size, ratio and duration specs before upload; uploads count toward storage. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-CR4 | Creative fields: primary text, headline, description, call-to-action, destination URL or WhatsApp number. | Should | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
