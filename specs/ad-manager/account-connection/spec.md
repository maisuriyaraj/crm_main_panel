# Ad account connection
**SRS section:** 6.2 · **Requirement IDs:** AD-C1, AD-C2, AD-C3 · **Priority:** Must 3 · **Feature flag:** ads_enabled + ads_meta / ads_google / ads_whatsapp
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/ad-manager/account-connection/spec.md)
**Overall status in this project:** ❌ (0 of 3 requirements implemented)

## Summary
Connects Meta, Google and WhatsApp accounts by OAuth and syncs metrics. Nothing is built. Used by Marketing Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| AD-C1 | Connect ad accounts through each platform's OAuth (Meta Marketing API, Google Ads API, WhatsApp Business / Click-to-WhatsApp via Meta). Multiple accounts per platform allowed. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-C2 | Tokens are stored encrypted; expiring or revoked tokens raise a reconnect alert. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |
| AD-C3 | Metrics sync on a schedule (default every 1 hour) and on demand (Refresh); the last-synced time is shown. | Must | ❌ | — | No page exists. The sidebar links in `lib/navigation.ts` point to `/ads-manager/*` routes that have no folder under `app/[orgnization]/`. |

## Out-of-SRS behaviour
None found.
