# Authentication and onboarding
**SRS section:** 4.1 · **Requirement IDs:** SH-A1, SH-A2, SH-A3 · **Priority:** Must 2, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/auth-onboarding/spec.md)
**Overall status in this project:** 🟡 (1 of 3 requirements implemented)

## Summary
Gets tenant users signed in safely and set up. Login, password reset, invite acceptance, sessions and refresh work. MFA, the setup wizard and real email delivery are missing, and access tokens last 7 days by default. Used by all tenant users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-A1 | Email + password login, forgot/reset password, invite acceptance, optional MFA (enforceable by tenant admin). | Must | 🟡 | `app/auth/signin/page.tsx`, `app/auth/forgot-password/page.tsx`, `app/auth/forgot-password/reset/page.tsx`, `app/auth/accept-invite/page.tsx` | No MFA screens. `components/ui/input-otp.tsx` is an unused generic component. |
| SH-A2 | Sessions use short-lived JWT access tokens with refresh tokens; logout revokes the refresh token. | Must | ✅ | `lib/axios/index.ts` (refresh and retry), `lib/auth/session.ts`, `lib/store/slices/authSlice.ts` (`reqToLogout`) | — |
| SH-A3 | First-login setup wizard: company details, logo, currency, time zone, invite team, connect ad accounts. | Should | ❌ | — | No wizard. First login only forces a password reset (`app/auth/reset-password/page.tsx`). |

## Out-of-SRS behaviour
- `app/[orgnization]/settings/security/page.tsx` offers change password and a session list; the SRS does not ask for a sessions screen.
- `app/auth/signup/page.tsx` is a Book a Demo form (`components/booking/`), not registration. Demo booking is not in the SRS.
- The public marketing site (`components/home/LandingPage.tsx`) is not in the SRS.
