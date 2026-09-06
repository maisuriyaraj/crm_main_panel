# Functional Bugs

All line numbers verified against the working tree on 2026-09-06. `npx tsc --noEmit` and `npx eslint .` were both run; results are cited where they confirm a finding.

**Status: all 8 bugs below (B1–B8) are fixed as of 2026-09-06.** `npx tsc --noEmit` no longer reports the two errors cited in B4/B5, and `npx eslint .` reports no new issues in any file touched by these fixes.

---

### [CRITICAL] B1 — Protected app shell has no auth guard at all — ✅ FIXED
- Location: [app/[orgnization]/layout.tsx](app/[orgnization]/layout.tsx)
- Flow affected: Every logged-in screen (Dashboard, Leads, Team, and all future org-scoped pages)
- Description: The layout that wraps every screen under `app/[orgnization]/` renders `SidebarProvider → AppSidebar → SidebarInset → {children}` and nothing else. It never calls `reqToFetchMe`, never checks `isAuthenticated`/`isAuthChecked`, never redirects an unauthenticated visitor, and never blocks rendering when `needResetPassword` is true. `specs/auth/auth-flow.md` originally built exactly this guard into `app/(app)/layout.tsx`, but that file was deleted during the routing restructure documented in `specs/navigation/sidebar-nav.md`, and its own Risks section explicitly flags that the guard was never rebuilt. It still hasn't been.
- How to reproduce: With no cookies/tokens set, directly open `/{anyOrgId}/leads` (see B2 — this route isn't even covered by `proxy.ts`). The full Leads page shell renders — sidebar, "New Lead" button, table — with no redirect to sign-in. `/{orgId}/dashboard` is slightly better protected because `proxy.ts` covers it (cookie-presence check only), but still renders client-side with no `/me` verification and no forced-password-reset block.
- Impact: The single most important guardrail in the app (per the auth spec's own goal statement) is currently a no-op for every screen except the two `proxy.ts` explicitly lists. A user whose access token just expired, or who never had one, can sit on a fully rendered app shell.
- Suggested fix: Reintroduce the guard logic from the original `app/(app)/layout.tsx` (call `reqToFetchMe` once via `useAuth()`, show a loading state until `isAuthChecked`, redirect to `pageRoutes.signin` on failure, redirect to `pageRoutes.resetPassword` when `needResetPassword` is true) inside `app/[orgnization]/layout.tsx`, since that's now the actual shell-mounting file.
- Effort estimate: M
- Resolution: Added `components/layout/auth-guard.tsx` (client component implementing exactly this guard logic) and wrapped `{children}` in it inside `app/[orgnization]/layout.tsx`.

---

### [CRITICAL] B2 — Leads (and every other module route) is not covered by `proxy.ts` at all — ✅ FIXED
- Location: [proxy.ts:10-13](proxy.ts#L10-L13), [proxy.ts:100-107](proxy.ts#L100-L107)
- Flow affected: Leads module; also Contacts/Companies/Deals/Tasks/Growth/Ads Manager once those pages exist
- Description: `protectedRoutes` only contains `pageRoutes.dashboard` and `pageRoutes.settingsTeam`. `pageRoutes.leads` (`/leads`) is never added, even though `app/[orgnization]/leads/page.tsx` is a fully built, real-API-backed screen. Worse, the `config.matcher` array (`/:organization_id/dashboard/:path*`, `/:organization_id/settings/:path*`) doesn't even include a `/leads` pattern, so the proxy function never runs for that path at all — not even to fall through unauthenticated.
- How to reproduce: Without any cookies, navigate directly to `/{orgId}/leads`. No redirect happens (confirmed: neither `isProtectedRoute` nor the matcher would catch it). Combined with B1, the full Leads UI shell renders for an anonymous visitor; only the underlying `GET /api/leads` network call would fail against the backend (401), leaving an empty-but-visible CRM screen.
- Impact: The one CRM feature module that's actually wired to real customer data (leads, contacts, activities, notes) currently has zero route-level access control on the frontend. This is a real gap for a pre-release security pass, even though the backend is presumably the final word.
- Suggested fix: Add `pageRoutes.leads` (and the rest of the nav's module routes as they ship) to `protectedRoutes`, and add matching patterns to `config.matcher`. Better: protect everything under `/:organization_id/*` by default and explicitly allow-list public paths, so a newly added module page can't silently ship unprotected again.
- Effort estimate: S
- Resolution: Took the "better" option — `isProtectedRoute` in `proxy.ts` now treats every `/{organizationId}/*` path as protected by default (no more explicit per-route allow-list). Follow-up: the first `config.matcher` broadening (`/:organization_id/:path*`) accidentally caught `/_next/static/*` asset requests too, which briefly broke CSS loading for unauthenticated visitors; fixed by switching to the standard Next.js negative-lookahead matcher that excludes `_next/static`, `_next/image`, and metadata files.

---

### [CRITICAL] B3 — Post-login and post-password-reset redirect produces a broken double-slash URL — ✅ FIXED
- Location: [app/auth/signin/page.tsx:49](app/auth/signin/page.tsx#L49), [app/auth/reset-password/page.tsx:75](app/auth/reset-password/page.tsx#L75)
- Flow affected: Login > redirect to Dashboard; Forced Password Reset > redirect to Dashboard
- Description: Both files build the destination manually as `` `/${me?.data?.organizationId}/${pageRoutes.dashboard}` ``. Since `pageRoutes.dashboard` is `"/dashboard"` (leading slash already included, see [lib/constants.ts:9](lib/constants.ts#L9)), this produces `/{orgId}//dashboard` — a double slash. `lib/constants.ts:26` already ships a `buildOrgRoute(orgSlug, route)` helper written specifically to avoid this bug (used correctly by `components/layout/app-sidebar.tsx`), but neither auth screen uses it.
- How to reproduce: `node -e "console.log(new URL('/123//dashboard','http://x').pathname)"` → prints `/123//dashboard` (verified in this session) — browsers/the WHATWG URL parser do **not** collapse the extra slash. Next's App Router matches routes by exact path segments, so `/123//dashboard` has segments `["123", "", "dashboard"]`, which does not match `app/[orgnization]/dashboard/page.tsx`'s `["orgnization", "dashboard"]` shape.
- Impact: Every successful login, and every completed forced-password-reset, redirects the user to a URL that 404s instead of landing on the dashboard. This breaks the primary success path of the entire authentication flow.
- Suggested fix: Replace both call sites with `buildOrgRoute(String(me.data.organizationId), pageRoutes.dashboard)`.
- Effort estimate: S
- Resolution: Both call sites now use `buildOrgRoute(String(me?.data?.organizationId), pageRoutes.dashboard)`.

---

### [HIGH] B4 — Fallback owner's `id` is a number, breaking string-keyed owner lookup — ✅ FIXED
- Location: [lib/leads/fallback-data.ts:24](lib/leads/fallback-data.ts#L24)
- Flow affected: Leads > New/Edit Lead form, List/Kanban "Owner" display, when the org-users list is empty/403s and the fallback data kicks in
- Description: `FALLBACK_OWNERS: LeadOwner[] = [{ id: 1, fullName: "Unassigned Pool" }]` — `LeadOwner.id` is typed `string` ([lib/leads/types.ts:11](lib/leads/types.ts#L11)), but this entry uses the number `1`. Confirmed as a real compiler error: `npx tsc --noEmit` reports `lib/leads/fallback-data.ts(24,5): error TS2322: Type 'number' is not assignable to type 'string'.`
- How to reproduce: As an org whose `GET /api/app/users` 403s (non-admin) or whose `lead_statuses`/owners aren't seeded yet — exactly the scenario this file's own comment describes as its reason for existing — assign a lead to the fallback "Unassigned Pool" owner, then look at how the Owner column/Kanban avatar renders that lead. `resolveOwnerName` ([lib/leads/types.ts:64-67](lib/leads/types.ts#L64-L67)) does `owners.find((owner) => owner.id === id)` — comparing the numeric `1` against a string id from `lead.assignedTo` with `===` never matches, so it always falls through to `"Unknown"` instead of "Unassigned Pool".
- Impact: The one fallback owner this stopgap data was built to provide never actually resolves by name anywhere it's displayed. Low blast radius (only affects orgs currently relying on the fallback), but it's a currently-failing type check, which risks blocking CI/build pipelines that run `tsc --noEmit` as a gate.
- Suggested fix: Change `id: 1` to `id: "1"` (or `id: "fallback-owner"`, matching the `fallback-*` id convention already used by `FALLBACK_LEAD_STATUSES`).
- Effort estimate: S
- Resolution: Changed to `id: "fallback-owner"`, matching the `fallback-*` convention already used by `FALLBACK_LEAD_STATUSES`. `npx tsc --noEmit` no longer reports the TS2322 error on this line.

---

### [HIGH] B5 — `notify()`'s `type` option is silently dropped by sonner, so every toast looks identical — ✅ FIXED
- Location: [lib/commonFunctions.ts:3-6](lib/commonFunctions.ts#L3-L6)
- Flow affected: Every success/error/info notification in the app — login, logout, password reset, team invite/edit/disable, every lead/activity/note/status CRUD action, bulk actions, demo booking
- Description: `notify()` calls sonner's base `toast(message, { type })`. Sonner's own type definitions (`node_modules/sonner/dist/index.d.ts:124`) define `ExternalToast = Omit<ToastT, 'id' | 'type' | ...>` — `type` is explicitly stripped from the options object accepted by plain `toast()`. To get success/error/info styling and icons, sonner requires calling `toast.success(...)`, `toast.error(...)`, or `toast.info(...)` instead. Confirmed as a real compiler error: `npx tsc --noEmit` reports `lib/commonFunctions.ts(5,22): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type 'ExternalToast'.`
- How to reproduce: Trigger any failure (e.g. wrong password on sign-in) and any success (e.g. successfully editing a lead) back to back. Both toasts render with sonner's default, un-styled appearance — no color coding, no success/error icon — because the `type` field passed at the call site is discarded before it reaches sonner's renderer.
- Impact: Every single piece of async feedback in the entire product — the app's only mechanism for confirming "did that work?" — currently gives the user zero visual distinction between success and failure. This is a widespread, easily reproducible defect touching every feature built so far.
- Suggested fix: Change `notify()` to call `toast[type](message, restOfOptions)` (defaulting to `toast(message, ...)` for a plain/neutral case), or switch every call site to `toast.success/.error/.info` directly.
- Effort estimate: S
- Resolution: `notify()` now calls `toast[type](message)`. `npx tsc --noEmit` no longer reports the TS2353 error on this line.

---

### [HIGH] B6 — Book-a-Demo form sends a hardcoded placeholder value in a real lead-capture request — ✅ FIXED
- Location: [app/auth/signup/page.tsx:79](app/auth/signup/page.tsx#L79)
- Flow affected: Marketing site > "Start Free Trial" / "Book a Demo" (the only real lead-generation entry point on the public site)
- Description: `handleSubmit` builds the API payload with `"organization_type": "asdasdsd"` — an obvious leftover debug/placeholder string — sent on every real submission of this form, regardless of what the visitor actually filled in (there's no `organization_type` field in the form at all).
- How to reproduce: Fill out and submit the Book a Demo form; inspect the network request body for `POST /user/bookings`.
- Impact: Every real prospect who books a demo has garbage data recorded against their organization type in the CRM/backend — this is a marketing-critical, revenue-facing form, and the corrupted field pollutes real business data, not test data.
- Suggested fix: Either remove the field if the backend doesn't require it, or add a real "organization type" input to the form and wire it through.
- Effort estimate: S
- Resolution: Removed the `organization_type` field from the submitted payload, since no corresponding input exists in the form. Flagging again: if the backend requires this field, a real "organization type" input still needs to be added — this was not verified against the backend contract.

---

### [MEDIUM] B7 — Book-a-Demo form resets and re-enables its submit button before the request resolves — ✅ FIXED
- Location: [app/auth/signup/page.tsx:88-98](app/auth/signup/page.tsx#L88-L98)
- Flow affected: Marketing site > Book a Demo
- Description: `dispatch(reqToBookADemo({...}))` is not awaited. `resetForm()` (line 93) and `setSubmitting(false)` inside `finally` (line 97) both execute synchronously right after the dispatch call returns — i.e., essentially immediately, well before the actual network request has resolved. `console.log` statements at lines 73 and 87 are also left in from debugging, exposing the visitor's submitted PII (name, email, phone) in the browser console.
- How to reproduce: Open devtools, throttle the network, submit the form. The "Booking..." disabled state on the submit button clears almost instantly (not when the request actually finishes), and the form fields clear immediately — including on a request that later fails, since `resetForm()` isn't inside the `onSuccess` callback.
- Impact: Double-submit protection is effectively broken (the button re-enables while the first request is still in flight). On failure, the visitor's typed input is already wiped by the time the "Failed to book demo, please try again" toast appears, forcing them to re-enter everything.
- Suggested fix: `await dispatch(reqToBookADemo({...})).unwrap()` (or move `resetForm()` into the thunk's `onSuccess` callback and `setSubmitting(false)` into both `onSuccess`/`onFailure`), and remove the two `console.log` calls.
- Effort estimate: S
- Resolution: Took the second option — `resetForm()` now runs only inside `onSuccess`, `setSubmitting(false)` runs in both `onSuccess` and `onFailure`, and both `console.log` calls were removed.

---

### [MEDIUM] B8 — Team settings page: non-admin redirect is dead code; admin-only endpoint is fetched for every role — ✅ FIXED
- Location: [app/[orgnization]/settings/team/page.tsx:40-52](app/[orgnization]/settings/team/page.tsx#L40-L52)
- Flow affected: Settings > Team (direct navigation by a non-admin `org_user`)
- Description: The redirect meant to bounce a non-admin away from this page is commented out: `// router.replace(pageRoutes.dashboard);` (line 42). The function falls through to `if (role !== "org_admin") return null;` (line 50), so a non-admin who reaches the URL directly sees a blank page instead of being redirected or shown an access-denied message. Separately, the `useEffect` on line 46-48 dispatches `reqToGetOrgUsers` unconditionally, before the role check — `GET /api/app/users` is admin-only on the backend (confirmed 403 for non-admins per `specs/leads/lead-api-implementation.md`'s Current State notes), so this fires a guaranteed-to-fail request for every non-admin visitor, with no `onFailure` handling.
- How to reproduce: Log in as an `org_user` and navigate to `/{org}/settings/team` directly (the sidebar already hides this link for non-admins, so this requires typing/pasting the URL). The page renders blank; the network tab shows a failed `GET /api/app/users`.
- Impact: Low security impact (the backend is the real gate), but a confusing dead-end for the user (blank white page, no explanation) and a real, avoidable failed network request on every hit.
- Suggested fix: Un-comment the redirect (or replace with an access-denied state), and gate the `reqToGetOrgUsers` dispatch behind the same role check.
- Effort estimate: S
- Resolution: Un-commented the redirect, correcting it to use `buildOrgRoute(orgSlug, pageRoutes.dashboard)` (the literal `pageRoutes.dashboard` would have been a repeat of B3's bug — a non-org-scoped path). `reqToGetOrgUsers` now only dispatches when `role === "org_admin"`.
