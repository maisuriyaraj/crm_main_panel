# Authentication and onboarding
**SRS section:** 4.1 · **Requirement IDs:** SH-A1, SH-A2, SH-A3 · **Priority:** Must 2, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/auth-onboarding/spec.md)
**Overall status in this project:** 🟡 (2 of 3 requirements implemented; SH-A3 partly)

## Summary
Gets tenant users signed in safely and set up. Login, password reset, invite acceptance, sessions and silent refresh work. Since 2026-11-09 the panel also has multi-factor sign-in (the code step, set-up with a QR code, recovery codes), MFA on the Security page, the "Require MFA for everyone" switch and "Reset MFA" for team admins, a "subscription has ended" screen, the organization logo in the sidebar, and the first-login setup wizard for Owners and Admins. No token is kept anywhere JavaScript can read. Connecting ad accounts waits for the Meta and Google integrations, and a real email has not been delivered end to end (backend). Used by all tenant users; the wizard only by Owner and Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

Checks, 2026-11-09 (this work). By decision, no new test files were written.
- `npm test`: 92 of 92 pass (91 before). One case was added to `tests/auth-refresh.test.mjs` (the first request after a reload, with no access cookie, refreshes once and succeeds), with a `missing` state in `tests/fake-backend.mjs` that answers 401 `TOKEN_MISSING`. No test was changed, deleted or skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 217 problems, exactly the 217 that were there before this work, all in files this work did not add (for example `lib/team/types.ts`, `components/ui/*`). Nothing new. Lint already failed before this work, so "lint passes" is not true for the repo.
- `npm run build`: passes; the new `/[orgnization]/setup` route builds with the rest.
- 2026-11-09 (ad account connections): `npm test` 92 of 92, `tsc` clean, `npm run lint` the same 217 problems as before (none in new files), `npm run build` passes with `/[orgnization]/settings/integrations`.
- **Manual check pending:** none of the screens has been tried in a browser against a running backend. See "Not covered by tests".

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-A1 | Email + password login, forgot/reset password, invite acceptance, optional MFA (enforceable by tenant admin). | Must | ✅ | `app/auth/signin/page.tsx`, `app/auth/forgot-password/page.tsx`, `app/auth/forgot-password/reset/page.tsx`, `app/auth/accept-invite/page.tsx`, `app/auth/reset-password/page.tsx`; MFA: `components/auth/mfa/` (`mfa-sign-in.tsx`, `enroll-step.tsx`, `code-form.tsx`, `recovery-codes.tsx`, `mfa-settings-card.tsx`), `lib/auth/mfa.ts`, `app/[orgnization]/settings/security/page.tsx`, `components/team/mfa-policy-card.tsx`, `components/team/member-action-dialogs.tsx` (`ResetMfaDialog`), `components/team/members-tab.tsx` (MFA column, Reset MFA); messages: `lib/auth/errors.ts` (`API_ERROR_MESSAGES`) | Built in this project; manual check pending. The MFA screens are not covered by tests. A real email delivered end to end is a backend item (see its spec). |
| SH-A2 | Sessions use short-lived JWT access tokens with refresh tokens; logout revokes the refresh token. | Must | ✅ | `lib/axios/index.ts` (refresh and retry, no refresh on the MFA steps), `lib/auth/session.ts` (`clearLegacyStorage`, `holdForMfaStep`), `lib/store/slices/authSlice.ts` (`reqToLogout`, `withoutTokens`), `tests/auth-refresh.test.mjs` | Hardened 2026-11-09: see Decisions, Tokens. |
| SH-A3 | First-login setup wizard: company details, logo, currency, time zone, invite team, connect ad accounts. | Should | 🟡 | `app/[orgnization]/setup/page.tsx`, `components/onboarding/` (`setup-wizard.tsx`, `company-step.tsx`, `other-steps.tsx`, `step-actions.tsx`), `lib/store/slices/onboardingSlice.ts`, `lib/onboarding.ts`, `components/layout/workspace-gate.tsx`, `components/layout/org-logo.tsx`, `components/layout/app-sidebar.tsx` | Company details, logo, currency and time zone, invite team, skip, resume, finish and the "Finish setup" banner are built; manual check pending. **Connect ad accounts** is built since 2026-11-09 (wizard step and Settings > Integrations: `components/integrations/ad-integrations-panel.tsx`, `app/[orgnization]/settings/integrations/page.tsx`, `lib/store/slices/adIntegrationsSlice.ts`). It shows "Not configured by OrbitOps yet" until OrbitOps enters its Meta and Google credentials; a real connect per platform after that would make this ✅. Not covered by tests; needs credentials. |

## Decisions (2026-11-09)
Asked by Raj with the work; points marked *settled while building* can be changed through `/sdd-change`.

### Tokens and the API address
- **The API address** is `NEXT_PUBLIC_API_URL` (`lib/constants.ts`, documented in `env.example`). It was already read from that variable; when it is unset the app falls back to `http://localhost:5000/api/`, so every deployed build must set it. The example file is `env.example`, not `.env.example`, because `.gitignore` ignores `.env*`.
- **No token in JavaScript.** The access token was already only in the backend's HttpOnly `token` cookie; nothing in this repo copied it to localStorage any more. So "in memory only" became stricter: not even memory. The auth thunks now return answers with `accessToken`, `mfa_token` and `recovery_codes` removed, because a thunk's result goes into every Redux action (and the devtools log).
- **Old copies are removed on every page load**: `accessToken`, `token` and `user` in localStorage (older builds wrote them). The profile is no longer written to localStorage at sign-in; only the routing-hint `user` cookie (organization id, forced-reset flag, email) is kept.
- **After a reload** the short-lived access cookie may be gone while the refresh cookie remains: the API answers 401 `TOKEN_MISSING`, the interceptor refreshes once (shared by every request in flight) and replays the request.

### Multi-factor sign-in
- **The MFA token, the secret and the recovery codes never enter Redux or storage.** The MFA calls are plain functions on the shared Axios client (`lib/auth/mfa.ts`), not thunks, and the values live in the component that shows them; they are dropped when it unmounts. Nothing is logged.
- **Sign-in:** a password answer with `mfa_required` shows the code step (with "Use a recovery code") or, when `enrollment_required`, the set-up: the QR code is drawn in the browser (`qrcode` 1.5.4, the version the Master Admin panel uses), the key is shown in groups of four, then a code. Recovery codes are shown once, with Copy, Download (a text file made in the browser) and "I've saved these codes" before Continue.
- **The same step after an accepted invitation, after the forced password reset, and after a password change** on the Security page, when the backend answers with it. During the last one the tab has no session on purpose, so a failing background refresh does not sign the member out (`holdForMfaStep`) *(settled while building)*.
- **A start request shared across remounts** (as in the Master Admin panel), so the key shown is always the server's latest.
- **The MFA sign-in steps are never refreshed** by the interceptor; an expired step (401 `MFA_TOKEN_INVALID`) sends the user back to the password with "Your sign-in step expired".
- **Security page:** status (on since, recovery codes left, shown in red at two or fewer), Turn on (a dialog; stays signed in), Turn off (a current code; disabled and explained while the organization requires MFA), New recovery codes (a current code; old ones stop working).
- **Team page:** "Require MFA for everyone" for anyone with `team.view`, switchable with `team.manage`, with a confirmation saying members already signed in stay signed in until their next sign-in, and how many members have no MFA. The members list has an MFA column; **Reset MFA** is offered for a member with MFA on whom you may sign out (`revoke_sessions` in `allowed_actions`), never yourself, with a confirmation that it signs them out everywhere *(settled while building: the API has no separate flag for it)*.

### Subscription ended
- `GET /features` now also feeds `subscription` into the features slice, and any 403 `SUBSCRIPTION_INACTIVE` marks it at once (`setSubscriptionInactiveListener`).
- Then every workspace page except `/settings/*` and the setup wizard shows "Your subscription has ended" (expired or cancelled wording, "your data is kept"), with Team settings and Company settings for those who may use them, and Security settings for everyone. The sidebar stays.

### Setup wizard
- **Who:** shown only when `/auth/me` says `onboardingPending` (true only with `organization.settings.manage`, until finished). The route also checks the permission and shows "no access" otherwise; others never see it or call it.
- **When:** after sign-in, inside the workspace, so after the forced password reset and any MFA set-up. The member is taken to `/{org}/setup` once; **Set up later** leaves it for this tab's session (a flag in sessionStorage, cleared at sign-out) and a small "Finish setup" banner appears on every page until it is finished *(settled while building)*.
- **Steps:** Company details (validated like the API; API field errors land on the same fields; the country is a two-letter code with its name shown), Logo (choose, local preview, upload; shown afterwards through the logo route), Currency and time zone (business currency from the allowed list, the browser's zone suggested; says it does not change the OrbitOps subscription and which currency that stays billed in), Invite team (seats used and limit, the existing invite dialog; done once an invitation is sent), Connect ad accounts (since 2026-11-09 the same Meta and Google cards as Settings > Integrations; skip still works; done once a platform is connected; "not part of your plan" without the Ads flags).

### Ad account connections (2026-11-09)
- **Where:** the wizard's last step, and **Settings > Integrations** (`/{org}/settings/integrations`), linked in the sidebar for members with `organization.settings.manage` when the plan has `ads_enabled` and `ads_meta` or `ads_google`. Without the flags the page and link are hidden ("not part of your plan"); without the permission the page shows "no access".
- **Cards per platform** (only platforms in the plan): status *Not configured by OrbitOps yet* / *Not connected* / *Connected* / *Expired* / *Error*. **Connect** asks the API for the provider's sign-in URL and opens it in the same tab; the panel only follows `https://www.facebook.com` (Meta) or `https://accounts.google.com` (Google) *(settled while building)*. When connected: who connected and when, Meta's end date, and the ad accounts as checkboxes (manager accounts cannot be chosen) with **Save accounts**. **Disconnect** asks for confirmation and says whether access was also removed at the platform.
- **Coming back:** the API sends the browser to the page the connect started from with `?provider=…&result=connected` or `&error=<CODE>`, shown once in plain words (the wizard reopens its ad accounts step). Every code has a sentence in `API_ERROR_MESSAGES`: `PROVIDER_NOT_CONFIGURED`, `PROVIDER_CONFIG_UNREADABLE`, `PROVIDER_NOT_FOUND`, `FEATURE_DISABLED`, `NOT_CONNECTED`, `UNKNOWN_ACCOUNT`, `MANAGER_ACCOUNT`, `STATE_INVALID`, `STATE_EXPIRED`, `BROWSER_MISMATCH`, `ACCESS_DENIED`, `NOT_ALLOWED`, `CODE_REJECTED`, `PERMISSION_MISSING`, `NO_REFRESH_TOKEN`, `PROVIDER_UNAVAILABLE`, `PROVIDER_ERROR`.
- **No token reaches the browser:** the API answers only status, names and accounts; the connect also sets an HttpOnly cookie the panel never reads.
- **Progress is the server's:** each save answers the state; any step can be skipped and opened again from the step list; "Finish setup now" or the last step finishes (open steps are recorded as skipped), then the profile is re-read so the wizard stops.
- **After finishing**, admins can reopen it as "Company setup" in the sidebar to change details *(settled while building)*.

### Logo in the shell
- The sidebar shows the organization logo and name. The image points at `GET /api/v1/app/organization/logo`, which redirects to a fresh short-lived link; no link is stored. If it fails once (an access token that just expired), one signed-in call refreshes the session and it is tried again; otherwise the old rocket icon shows. A new upload changes the image's version, so it reloads.
- The cookie reaches the API with the image request because the panel and API are on the same site (the cookies are `SameSite=Strict`). A deployment on different sites would show the fallback icon.

### Error messages
Every code the sign-in, MFA, team security, subscription and setup screens can get has a plain sentence in `API_ERROR_MESSAGES` (`lib/auth/errors.ts`): `INVALID_CODE`, `TOO_MANY_ATTEMPTS`, `MFA_TOKEN_INVALID`, `MFA_TOKEN_MISSING`, `MFA_WRONG_STEP`, `MFA_ALREADY_ENABLED`, `MFA_NOT_ENABLED`, `ENROLLMENT_NOT_STARTED`, `MFA_REQUIRED_BY_ORGANIZATION`, `ACCOUNT_DISABLED`, `CANNOT_RESET`, `SELF_ACTION_NOT_ALLOWED`, `TARGET_NOT_MANAGEABLE`, `PERMISSION_DENIED`, `FORBIDDEN`, `SEAT_LIMIT_REACHED`, `SESSION_REVOKED`, `TOKEN_INVALID`, `SUBSCRIPTION_INACTIVE`, `VALIDATION_FAILED`, `FILE_REQUIRED`, `FILE_EMPTY`, `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TYPE_MISMATCH`, `LOGO_NOT_IMAGE`, `LOGO_NOT_FOUND`, `STORAGE_NOT_CONFIGURED`, `STEP_NOT_FOUND`, `STEP_NOT_AVAILABLE`, `STEP_ALREADY_DONE`, `ONBOARDING_ALREADY_COMPLETED`, `ORGANIZATION_NOT_FOUND`. Unknown codes fall back to the screen's own sentence, never the server's text. The sign-in form keeps `authErrorMessage` as before.

## Not covered by tests
Ad account connections (2026-11-09): the cards, the Integrations page, the wizard step, the callback messages and the sidebar link. Not covered by tests; needs credentials for a real connect. **Manual check pending.**

Everything new except the reload refresh: the MFA code step and recovery-code sign-in, set-up with the QR code and the shared start request, recovery codes (copy, download, the checkbox), MFA after an invitation, after the forced reset and after a password change (and `holdForMfaStep`), the Security page MFA card, the "Require MFA" switch, the MFA column and Reset MFA, the subscription-ended screen and its listener, the setup wizard (every step, skip, resume, finish, "Set up later" and the banner, the redirect after sign-in, the no-access screen), the logo in the sidebar and its retry, `withoutTokens`, `clearLegacyStorage`, and the error messages. **Manual check pending** for all of them in a browser against the backend.

## Out-of-SRS behaviour
- `app/[orgnization]/settings/security/page.tsx` offers change password and a session list; the SRS does not ask for a sessions screen.
- `app/auth/signup/page.tsx` is a Book a Demo form (`components/booking/`), not registration. Demo booking is not in the SRS.
- The public marketing site (`components/home/LandingPage.tsx`) is not in the SRS.
- Resetting a member's MFA, and the "Company setup" entry that reopens the wizard after it is finished.

## Change Request History
- 2026-11-09: summary corrected (access tokens last 15 minutes, not 7 days); Pending from the backend added for the MFA API. Asked by Raj.
- 2026-11-09: Pending from the backend gained the setup wizard API (SH-A3, backend Part B). No panel code changed. Asked by Raj.
- 2026-11-09: Tenant auth and onboarding UI built: token hardening, MFA sign-in, MFA on the Security page, the "Require MFA" switch and Reset MFA, the subscription-ended screen, the setup wizard and banner, the logo in the sidebar, plain-words error messages. "Pending from the backend" is done and removed. Dependency added: `qrcode` 1.5.4 (and `@types/qrcode` 1.5.5). Asked by Raj.
- 2026-11-09: SH-A3's ad accounts step built: Meta and Google cards in the wizard and in Settings > Integrations, account choice, disconnect, callback results in plain words. Waits only on OrbitOps' credentials. Asked by Raj.
