# Spec: Auth Flow (Login, Sessions, Team Management)

## Status
Implemented

## Type
New Feature

## Goal
Give Organization Admins and Organization Users one shared login page that gets them into the app, keeps them signed in via silent token refresh, forces a password reset when the backend requires it, and lets Org Admins manage their team's user accounts. This is the entry point for the rest of the CRM — no CRM feature screens (leads, deals, pipelines) are built here.

## Current State
- `app/auth/signin/page.tsx` exists but is a static visual mock: plain `<input>` fields, no form library, no validation, no submit handler, no state. It does not call any API today.
- `app/auth/signup/page.tsx` is **not** a registration form — per the naming rule in `CLAUDE.md`, it implements `BookDemo`, a Formik + Yup lead-capture form for booking a sales demo. It is unrelated to this feature and is not touched by this spec.
- `lib/constants.ts` (`pageRoutes`, `apiRoutes`) has no entries for dashboard, settings, reset-password, or any of the auth/app-user API endpoints. Only marketing-site routes exist today (`home`, `signin`, `signup`, `forgotPassword`).
- `lib/axios/index.ts` is a bare Axios instance (`withCredentials: true`, hardcoded `baseURL: "http://localhost:5000"`) with no interceptors — nothing attaches an `Authorization` header or reacts to `401`s today. Per `.claude/rules/api-conventions.md`, this hardcoded `baseURL` is a known issue (the `.env` `API_URL` is unused); this spec does not fix it, just flags it again since this feature adds logic to this same file.
- `lib/store/index.ts` registers two slices (`pricing`, `publicData`). No `auth` or user-management slice exists.
- Two async-thunk slices already establish the required pattern (`lib/store/slices/pricingPlansSlice.ts`, `lib/store/slices/publicAPisSlice.ts`): one argument object `{ data, onSuccess, onFailure }`, calls to the shared `Axios` instance, and matching `isLoading`/`error` reducer cases. New slices in this spec must match this shape exactly.
- No project-level `middleware.ts`/`proxy.ts` file exists yet.
- **Breaking change vs. general Next.js knowledge**: this repo is pinned to `next@16.2.6`, where `middleware.ts` is deprecated and renamed to `proxy.ts` (function name `proxy`, not `middleware`; same capability). Confirmed from the vendored docs at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Any route-gating file this spec adds must use this new convention.
- Next's own authentication guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) is explicit that Proxy should only ever do **optimistic** checks (cookie presence, not decoding/verifying) and should never be the sole authorization gate — real enforcement stays server-side, matching this feature's own guardrail that the client-side guard is "a UX convenience only."
- `components/ui/` already has the primitives this feature needs but nothing wired together: `table.tsx` (bare shadcn table), `pagination.tsx`, `input.tsx`, `sidebar.tsx` (a full `SidebarProvider`/`Sidebar` primitive added in a recent commit but not yet used anywhere in the app), `dialog.tsx`, `form.tsx` (the react-hook-form + zod primitive), `select.tsx`, `switch.tsx`, `badge.tsx`.
- **There is no existing `OrbitOpsDataTable` component anywhere in the codebase.** A repo-wide search found nothing by that name — only the bare `components/ui/table.tsx` primitive. This spec builds one from scratch (see Proposed Change / Design).
- No file in the repo currently references `accessToken`, `refreshToken`, `mustResetPassword`, or `organizationId` — this is new ground, no naming collisions to worry about.

## Proposed Change

### Token handling
- Add response/request interceptors to the **existing single Axios instance** (`lib/axios/index.ts`) rather than creating a second client, per `.claude/rules/api-conventions.md`:
  - Request interceptor attaches `Authorization: Bearer <accessToken>` from an in-memory token holder.
  - Response interceptor catches `401`s, calls `POST /api/auth/refresh` once, retries the original request once with the new token, and only propagates the error (triggering redirect-to-login) if refresh itself fails. Concurrent `401`s must share one in-flight refresh call instead of each firing their own `/refresh` request.
- New `lib/axios/tokenStore.ts`: a small module holding the current access token in memory, with `getAccessToken()` / `setAccessToken()` / `clearAccessToken()`. This is what the Axios interceptors read, and what the new `auth` Redux slice writes to on login/refresh/logout. Keeping it in a plain module (not the Redux store) avoids a circular import between `lib/axios` and `lib/store`. `setAccessToken` also mirrors the token into `localStorage` (per your instruction — never logged, cleared on logout, short 15-minute backend expiry limits exposure); on app boot this module rehydrates its in-memory value from `localStorage` before the first render.
- The refresh token is never read, stored, or referenced anywhere in frontend code — it only exists as a browser-managed httpOnly cookie.

### State management
- New `lib/store/slices/authSlice.ts` — thunks `reqToLogin`, `reqToFetchMe`, `reqToRefreshToken`, `reqToLogout`, `reqToLogoutAll`, `reqToResetPassword`, all following the exact thunk/reducer contract in `.claude/rules/state-management.md`. State shape: `{ isLoading, error, accessToken, user, isAuthChecked }` (`user` holds `{ id, email, role, organizationId, fullName, mustResetPassword }` from `/me`; `isAuthChecked` marks whether the initial `/me` fetch has resolved, so the guard below only fetches it once).
- New `lib/store/slices/orgUsersSlice.ts` — thunks `reqToGetOrgUsers`, `reqToCreateOrgUser`, `reqToUpdateOrgUser`, `reqToDeleteOrgUser`, same contract. State: `{ isLoading, error, users }`.
- Both registered in `lib/store/index.ts` under keys `auth` and `orgUsers`.
- New `hooks/useAuth.ts` — a thin hook wrapping `useAppSelector`/`useAppDispatch` that exposes `{ user, role, isAuthenticated, isAuthChecked, isLoading }` plus a `logout()` helper. This satisfies the "auth state flows through one shared hook" guardrail **using Redux**, which is already this repo's established client-state pattern, instead of adding a second, parallel React Context system just for auth. Every screen that needs auth state uses this hook, never a raw `useAppSelector` on `state.auth`.

### Route protection
Two layers, matching Next's own recommendation that Proxy is optimistic-only:
1. **`proxy.ts`** (project root, new — not `middleware.ts`, see Current State). Reads only whether the `accessToken` cookie is present (no decoding — this frontend has no shared secret to verify it, and Proxy must stay fast). If a protected route (`/dashboard`, `/settings/:path*`) is hit with no cookie, redirect to `/auth/signin`. If `/auth/signin` is hit with the cookie present, redirect to `/dashboard`. Matcher excludes `/api`, `_next/static`, `_next/image`, and static assets.
2. **`app/(app)/layout.tsx`** (new route group, wraps every protected screen) is the real guard: on mount, calls `reqToFetchMe` exactly once (guarded by `isAuthChecked`) via `useAuth()`, shows a loading state until it resolves, then:
   - If the fetch itself fails after the Axios refresh-retry (i.e. truly logged out), redirect to `/auth/signin`.
   - If `user.mustResetPassword` is `true` and the current path isn't `/auth/reset-password`, redirect there and block rendering of everything else.
   - Renders the shared shell (sidebar nav using the existing `components/ui/sidebar.tsx` primitive) with nav items filtered by `role` — hides "Team" for `org_user`.
   - This is UX-only, as the guardrail states; the backend remains the real enforcement.

### Screens
1. **Login** — reuses the existing route/page `app/auth/signin/page.tsx` (`pageRoutes.signin`, `/auth/signin`) instead of introducing a new `/login` path, since that's already this repo's convention for the login screen and it's currently just an unwired mock. Replaces the static form with `react-hook-form` + `zod` (see "Form pattern" below), dispatching `reqToLogin`. On success: if `mustResetPassword` is true, `router.replace(pageRoutes.resetPassword)`; otherwise `router.replace(pageRoutes.dashboard)`. Same destination regardless of role — the shell adapts afterward.
2. **Forced password reset** — new `app/auth/reset-password/page.tsx` at new route `pageRoutes.resetPassword` (`/auth/reset-password`). Distinct from the existing, unrelated `pageRoutes.forgotPassword` (`/auth/forgot-password`, pre-login recovery request — not touched here). Form (RHF + zod) collects new password, dispatches `reqToResetPassword`; on success, refetches `/me` and continues into the app. The `app/(app)/layout.tsx` guard blocks navigation away from this screen while `mustResetPassword` is still true.
3. **`/settings/team`** (Org Admin only) — new `app/(app)/settings/team/page.tsx`. Lists `reqToGetOrgUsers` results in the new data table (below), with actions to open an invite/create dialog (`reqToCreateOrgUser`), edit role/status (`reqToUpdateOrgUser`), and disable a user (`reqToDeleteOrgUser` — confirmed via `components/ui/alert-dialog.tsx`). Route-level protection: if an `org_user` reaches this URL directly, the guard hides the nav entry but the page itself should also check `role` and redirect, since a hidden nav item alone doesn't stop direct navigation.
4. **`/dashboard`** — new `app/(app)/dashboard/page.tsx`. Minimal placeholder landing screen (welcome message, role display) since actual CRM dashboard widgets are out of scope for this spec; it exists only as the shared post-login destination the guard and login screen redirect to.

### Data table
No `OrbitOpsDataTable` exists to reuse (see Current State). Building a new, generic `components/ui/data-table.tsx`: client-side sort/paginate/search over an array of rows, composed from the existing `Table`, `Pagination`, and `Input` primitives (no new dependency like `@tanstack/react-table` — the org-user list is small, and hand-rolled `useState` for sort key/direction, page, and search term keeps this in line with "don't add abstraction beyond what the task requires"). This makes it reusable by future CRM list screens too, not just team management.

### Form pattern
The requirement notes call for "Formik + Zod," but that mixes two different form libraries in a way `.claude/rules/component-structure.md` doesn't define (the repo's two established patterns are Formik+Yup, or react-hook-form+Zod). Since `app/auth/signin/page.tsx` isn't currently a real form in either pattern, this is "a brand-new form," where that rule says to prefer react-hook-form + zod — the pattern `components/ui/form.tsx` is already built for. This spec uses react-hook-form + zod for the login form, the reset-password form, and the invite/edit-user dialog form. Flagging this as a deviation from the literal requirement wording for review.

## Affected Files

**Modified**
- `lib/constants.ts` — add `pageRoutes.dashboard`, `pageRoutes.resetPassword`, `pageRoutes.settingsTeam`; add `apiRoutes.login`, `.refreshToken`, `.logout`, `.logoutAll`, `.me`, `.resetPassword`, `.appUsers`.
- `lib/axios/index.ts` — add request/response interceptors described above.
- `lib/store/index.ts` — register `auth` and `orgUsers` reducers.
- `app/auth/signin/page.tsx` — replace static form with wired RHF+zod login form.

**New**
- `lib/axios/tokenStore.ts`
- `lib/store/slices/authSlice.ts`
- `lib/store/slices/orgUsersSlice.ts`
- `hooks/useAuth.ts`
- `proxy.ts` (project root)
- `app/(app)/layout.tsx` — auth guard + shell
- `app/(app)/dashboard/page.tsx`
- `app/(app)/settings/team/page.tsx`
- `app/auth/reset-password/page.tsx`
- `components/ui/data-table.tsx`
- `components/team/user-form-dialog.tsx` (shared invite/edit dialog form)

## Design
- **Screens affected**: `/auth/signin` (rebuilt, not new), `/auth/reset-password` (new), `/dashboard` (new, minimal), `/settings/team` (new).
- **Existing components reused**: `components/ui/form.tsx` (RHF+zod primitive), `input.tsx`, `button.tsx` (`buttonVariants`), `table.tsx`, `pagination.tsx`, `dialog.tsx`, `alert-dialog.tsx` (disable confirmation), `select.tsx` (role/status pickers), `sidebar.tsx` (first real usage of this primitive, for the protected app shell nav), `badge.tsx` (role/status pills), `skeleton.tsx` (loading state while `/me` resolves).
- **New components**: `data-table.tsx`, `user-form-dialog.tsx` — both per `.claude/rules/component-structure.md` (CVA/`cn()` conventions, extend rather than hand-roll where a primitive already exists).
- **Design tokens**: standard semantic tokens only (`background`, `card`, `border`, `primary`, `muted-foreground`, etc.) per `.claude/rules/theming.md` — no new raw colors. The login screen keeps its existing `bg-glass`/`panel-shadow`/`ambient-glow` treatment; `/dashboard` and `/settings/team` are plain app-shell screens (sidebar + content), not marketing panels, so they don't need the glow/gradient utilities.
- **Reference screens**: `app/auth/signin/page.tsx`'s current visual layout is the reference for keeping the login screen's look while replacing its internals; `app/auth/signup/page.tsx` is the reference for this repo's Formik-form structure (not used here, but is the file component-structure.md points to for the "existing form" pattern).
- **Platform differences**: none — web only, no separate mobile app in this repo. `sidebar.tsx` already has mobile/sheet handling built in.

## API Changes
All consumed from the fixed backend contract (not designed here):
- `POST /api/auth/login` — body `{ email, password }` → sets httpOnly `accessToken`+`refreshToken` cookies, body returns `{ accessToken, ... }`.
- `POST /api/auth/refresh` — cookie-based, no body.
- `POST /api/auth/logout` — clears session for this device.
- `POST /api/auth/logout-all` — clears session for all devices (surfaced nowhere in v1 UI yet — see Open Questions).
- `GET /api/auth/me` → `{ id, email, role, organizationId, fullName, mustResetPassword }`.
- `POST /api/auth/reset-password`.
- `POST /api/app/users` — org admin creates a user.
- `GET /api/app/users` — list own org's users.
- `PATCH /api/app/users/:id`.
- `DELETE /api/app/users/:id`.

## Risks
- `lib/axios/index.ts`'s hardcoded `baseURL: "http://localhost:5000"` remains untouched by this spec but now carries meaningfully more traffic (every authenticated screen) — flagging again per `.claude/rules/api-conventions.md` rather than silently working around it.
- Concurrent `401`s across multiple in-flight requests must share a single `/refresh` call — if implemented naively (one refresh per failed request), it could hammer the refresh endpoint or race and log the user out incorrectly. Needs manual testing with multiple simultaneous API calls on an expired token.
- Access token in `localStorage` is readable by any script on the page (XSS surface), accepted per your instruction and mitigated by the short 15-minute backend expiry — worth a second look if this app ever adds third-party scripts.
- Role-based nav hiding and the `/settings/team` route are UX-only; both `proxy.ts` and the `app/(app)/layout.tsx` guard can be bypassed by a determined client, so every `org_user`-restricted action must also be enforced by the backend (already true per the API contract, just noting it's load-bearing).
- `proxy.ts` can only check cookie *presence*, not decode role or expiry (no shared secret) — an expired-but-present cookie still passes the optimistic check and falls through to the real guard/refresh flow, which is expected but worth confirming in testing.

## Open Questions
- Should `org_user` accounts see a simplified nav vs. `org_admin`'s full nav, or is it identical minus the `/settings/team` entry for v1? *(carried over from requirements — unresolved; implemented as identical minus `/settings/team` for now)*
- Is react-hook-form + zod an acceptable substitute for the requirement doc's literal "Formik + Zod" wording, given `.claude/rules/component-structure.md`'s guidance for brand-new forms? *(implemented as RHF+zod, approved with the spec)*
- OK to reuse `/auth/signin` as the login page instead of introducing a separate `/login` route? *(implemented this way, approved with the spec)*
- OK to build a new lightweight `components/ui/data-table.tsx` from scratch, since no `OrbitOpsDataTable` exists in the codebase today? *(implemented this way, approved with the spec)*
- Where, if anywhere, should "log out of all devices" (`/api/auth/logout-all`) surface in v1? The `reqToLogoutAll` thunk exists in `authSlice.ts` but no UI calls it yet — still open for a future spec/change.

## Implementation Notes
- Built exactly as proposed: token interceptors + in-memory/localStorage token holder (`lib/axios/tokenStore.ts`), `authSlice`/`orgUsersSlice` (Redux, matching the existing thunk contract), `useAuth()` hook, `proxy.ts` (Next 16's `proxy` convention, optimistic cookie-presence check only), the `app/(app)` route group guard + sidebar shell, `/auth/reset-password`, the rebuilt `/auth/signin`, `components/ui/data-table.tsx`, `components/team/user-form-dialog.tsx`, and `/settings/team`.
- One bug caught and fixed during implementation, not in the original plan: the Axios response interceptor's refresh-on-401 logic could deadlock if the `/refresh` call itself ever returned a 401 (it would recurse back through the same interceptor and await its own in-flight promise). Fixed by excluding the refresh endpoint's own request from retry handling.
- One rule violation caught and fixed during implementation: the interceptor's failed-refresh redirect originally hardcoded `"/auth/signin"` instead of using `pageRoutes.signin`. Fixed to use the constant.
- The edit-user dialog only lets an Org Admin change role and status (not name/email), matching the requirement text's "edit role/status" wording literally.
- Verification performed: `npx tsc --noEmit` and `npm run lint` both show zero issues in any new file — all reported errors are pre-existing and in files this spec never touches (`app/page.tsx`, `components/ui/chart.tsx`, `components/ui/calendar.tsx`, `lib/commonFunctions.ts`, `pricingPlansSlice.ts`, `publicAPisSlice.ts`, `sidebar.tsx`, `use-mobile.tsx`, `StoreProvider.tsx`). `next build`'s Turbopack compile step succeeded; its later type-check step fails only on that same pre-existing `pricingPlansSlice.ts` issue, unrelated to this work.
- **Not verified**: full interactive browser testing of the login → dashboard → team-management flow. There's no live backend at the hardcoded `localhost:5000` `baseURL` to log in against, and this machine already had other `next dev` instances running for this project that this session correctly avoided touching. Manual testing against a real backend is a follow-up before this ships.
- Follow-up/known limitations: `logout-all` has no UI entry point (see Open Questions); the `/settings/team` page and nav-hiding are UX-only, real enforcement is the backend per the API contract; `lib/axios/index.ts`'s hardcoded `baseURL` was flagged again but intentionally left untouched, per `.claude/rules/api-conventions.md`.
