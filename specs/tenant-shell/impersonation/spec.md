# Tenant impersonation (banner and sign-in screen)
**SRS section:** 3.8 · **Requirement IDs:** MA-I1, MA-I2, MA-I3, MA-I4 · **Priority:** Must 1, Should 3 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/master-admin/impersonation/spec.md) · [mst_admin_crm](../../../../mst_admin_crm/specs/master-admin/impersonation/spec.md)
**Overall status in this project:** ✅ (2 of 2 requirements this project owns implemented; manual check pending)

## Summary
When OrbitOps support signs in to a workspace, it lands here. `/impersonate` redeems the
single-use code from the link's fragment, and an amber banner then sits above every page
saying support is acting as this member, with a live countdown and an End session button.
The restricted actions are hidden or locked, the Security page turns read-only, and the
session ending shows a plain notice instead of bouncing to sign-in. Built 2026-11-23.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

Checks, 2026-11-23 (this work). By decision, no test file was written and no suite was run.
- `npx tsc --noEmit`: no errors.
- `npx eslint` on the new files: no problems. The repo-wide lint was already failing before this work and was not re-run.
- **Manual check pending:** nothing here has been tried in a browser against a running backend.

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| MA-I1 | SUPER_ADMIN and SUPPORT_ADMIN can log in as a tenant's admin (or a chosen tenant user) from the tenant detail page, after entering a reason. | Should | ✅ | `app/impersonate/page.tsx`, `lib/auth/impersonation.ts` (`exchangeImpersonationCode`), `proxy.ts` (public route), `lib/constants.ts` (`pageRoutes.impersonate`, `apiRoutes.impersonationExchange`) | This project's half — the screen that redeems the code — is built. Starting the session is [mst_admin_crm](../../../../mst_admin_crm/specs/master-admin/impersonation/spec.md), also built. Manual check pending. |
| MA-I2 | Every impersonated session and every action in it is logged with both the platform user and the impersonated user. | Must | ➖ | — | Nothing to build here: the backend logs every request and every change. The workspace's own audit screen already shows the rows, labelled "OrbitOps support (acting as &lt;user&gt;)" by the API. |
| MA-I3 | A persistent banner shows "Impersonating &lt;user&gt; at &lt;tenant&gt;" with an End session button; sessions expire after 30 minutes. | Should | ✅ | `components/layout/impersonation-banner.tsx`, `components/layout/impersonation-frame.tsx`, `components/layout/impersonation-ended-notice.tsx`, `app/[orgnization]/layout.tsx`, `app/layout.tsx`, `lib/auth/session.ts` (`setImpersonating`, `endImpersonatedSession`, `registerImpersonationEndedNotice`), `components/layout/auth-guard.tsx` | Banner, live countdown, 5-minute warning, End session button and the ended notice are built. Manual check pending. |
| MA-I4 | Impersonation cannot change the tenant user's password, MFA or email. | Should | ➖ | `app/[orgnization]/settings/security/page.tsx`, `components/team/members-tab.tsx`, `components/team/member-detail-sheet.tsx`, `components/team/mfa-policy-card.tsx`, `components/team/role-select-items.tsx`, `lib/axios/index.ts` | Enforced on the server for 16 routes; nothing here is load-bearing. The screens hide or lock those actions so nobody hits a pointless 403, and anything that slips through gets a plain-words toast. |

## Design

### The sign-in screen — `/impersonate`
- Public in `proxy.ts`: OrbitOps support arrives with no session at all, and the single-use code is the only credential.
- The code is read from the URL **fragment** (`#code=…`), which browsers never send to any server. It is taken once, `history.replaceState` drops it from the address bar and the back stack immediately, it is used once, and it is never stored, logged or put in Redux. A `useRef` guard stops React's development double-mount from spending it twice.
- `POST /auth/impersonation/exchange` → the API sets the access cookie itself and issues no refresh token. The page then reads `/auth/me`, writes the `user` routing cookie (the org id only, no token) and goes to that workspace's dashboard.
- Every refusal answers the same generic 400, so there is one message: **"This link is no longer valid. Start again from the Master Admin panel."**, plus a line saying a link works once and for 60 seconds.
- Two notices are shown before and during the exchange: that this is a customer's workspace and what a support session may not do, and that **signing in here replaces any OrbitOps sign-in in this browser — a private window keeps the two apart.**

### The banner
Driven by `/auth/me`'s `impersonation` object alone, never by anything decoded from a
token, so a session ended elsewhere is picked up on the next load.

- Sticky at the top of the workspace layout, above the sidebar shell, not dismissible, and it wraps to two rows at phone width.
- "Impersonating &lt;member name&gt; at &lt;workspace&gt;", then "OrbitOps support · every action is recorded". `admin_display` is always the literal "OrbitOps support": the API never sends a staff name and the panel never invents one.
- A live `MM:SS` countdown to `expires_at`, ticking once a second. Under 5 minutes it turns red and a second line says the session ends on its own and cannot be extended.
- **End session** calls `POST /auth/impersonation/end`, then stops this tab the same way an expiry does.
- `ImpersonationFrame` adds an amber border down both sides of the workspace, so the screen is visibly different even when the banner has scrolled behind something.

### Ending
- `lib/auth/session.ts` gains `endImpersonatedSession(reason)`: it marks the session ended (so the request interceptor cancels and rejects everything after it), aborts what is in flight, wipes Redux, clears this origin's storage and the `user` cookie — and then shows a notice instead of redirecting. It never calls logout and never tells other tabs: a support session belongs to this browser alone.
- `ImpersonationEndedNotice` (mounted once in the root layout) is a full-screen panel: "The support session has ended", the reason in plain words, and "Session ended. You can close this tab." It offers no action, because there is nothing here to sign back in to.
- Reasons in plain words: `ended_by_admin`, `expired`, `admin_deactivated`, `admin_signed_out`, `target_removed`, `organization_inactive`, `replaced`, `invalid` (`END_REASONS` in `lib/auth/impersonation.ts`).

### Axios
- `401 IMPERSONATION_ENDED` → `endImpersonatedSession(reason)` and reject. No refresh.
- Any other `401` while `isImpersonating()` → the same. A support session is issued **without** a refresh token on purpose, and the browser may still hold the member's own one; refreshing would quietly turn a 30-minute audited session into their real one.
- `403 IMPERSONATION_RESTRICTED` → a registered listener (the banner) shows the server's message as an error toast.
- `isImpersonating()` lives in `lib/auth/session.ts`, which `lib/axios` already imports, so there is no import cycle. The `AuthGuard` sets it from `/auth/me` on every load, since a reload loses the flag the exchange set.

### Restricted actions hidden or locked
Server enforcement is the real check; these only save a pointless 403.

| Where | What |
|---|---|
| `settings/security` | The whole page is replaced by a read-only notice: no password change, no MFA set-up or disable, no recovery codes, no device list, no "sign out everywhere". |
| Team > Members (row menu) | "Change role or team", "Sign out everywhere", "Make owner" and "Reset MFA" are hidden. |
| Team > member detail sheet | "Change role" and "Make owner" are hidden; the profile edit (name, mobile) is off. |
| Team > MFA policy card | The "Require MFA for everyone" switch is locked, with "Support sessions can't change this." |
| Role pickers (invite, change role) | Admin-tier roles stay visible but disabled, with "Support sessions can't give admin access". |

API keys have no screen in this panel, so there is nothing to hide for them.

## Decisions
- The code lives in the URL fragment, not a query string, so it never reaches a server log or a `Referer` header. The backend builds the link that way (`${APP_URL}/impersonate#code=…`); the panel must keep it that way.
- The panel never refreshes during a support session, and the access cookie expires exactly when the session row does.
- The banner is driven by `/auth/me` alone.
- No staff identity is ever shown to the tenant. See decision 6 in the [backend spec](../../../../crm_backend/specs/master-admin/impersonation/spec.md).
- Ending a support session does not call `/auth/logout` and does not broadcast to other tabs, so it never touches the member's own sign-in elsewhere.

## Not covered by tests
By decision, no test file was written for any of this and no suite was run. Specifically not covered: the exchange (success and refusal), the banner and its countdown, the 5-minute warning, the ended notice, the axios rules for `IMPERSONATION_ENDED` / `IMPERSONATION_RESTRICTED`, and every hidden or locked action. **Manual check pending** for all of it.

## Out-of-SRS behaviour
- The amber side border (`ImpersonationFrame`) and the 5-minute warning are not in the SRS; they exist so a support session is never mistaken for an ordinary one.
- Hiding the restricted actions is not in the SRS either: MA-I4 is a server rule, and this only keeps the buttons honest.
