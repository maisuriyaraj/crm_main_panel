# Pre-Release Audit — Summary

**Scope**: Full repo (`main-panel`), traced end-to-end across the marketing landing page, Book-a-Demo lead capture, the shared sign-in/forced-password-reset flow, the org-scoped app shell + sidebar, Team management, and the Leads module (List/Kanban/Analytics/Activity/Notes), plus the Redux state layer and shared UI primitives underneath all of them. Findings are grounded in the actual working tree as of 2026-09-06, cross-checked against `npx tsc --noEmit` and `npx eslint .` output where relevant, and against the project's own specs (`specs/**`) to distinguish intentional, already-flagged tradeoffs from genuine regressions.

## Overall Health

The codebase is well-organized and mostly follows its own conventions (one Axios instance, one Redux thunk shape, `pageRoutes`/`apiRoutes` constants, shadcn primitives reused rather than hand-rolled) — the specs in `specs/` are unusually good, and most of what they flag as risk turned out to be accurately described. But there's a real gap between "the Leads module is fully wired to a real API" and "the app is actually safe to put in front of real users": the client-side auth guard that used to protect every logged-in screen was deleted during a routing restructure and never rebuilt, the one CRM feature module with real customer data (Leads) has no route protection at all, and the post-login redirect that every single user hits after signing in produces a broken URL. None of these are subtle — they're the kind of thing that would surface in the first five minutes of manual QA — which suggests this repo has been shipped through fast, spec-driven iteration without a corresponding pass of "did I actually click through this in a browser." (Several specs' own Implementation Notes say as much: interactive browser testing was never performed, only `tsc`/`eslint`/one `curl`.) Fix the five items below first; the rest of this audit is real but lower-stakes polish and tech debt on top of an otherwise sound structure.

## All Findings

| ID | Category | Severity | Title | Location |
|----|----------|----------|-------|----------|
| B1 | Bug | CRITICAL | No auth guard in the protected app shell | [app/[orgnization]/layout.tsx](app/[orgnization]/layout.tsx) |
| B2 | Bug | CRITICAL | Leads (and every other module route) unprotected by `proxy.ts` | [proxy.ts](proxy.ts) |
| B3 | Bug | CRITICAL | Post-login/reset-password redirect produces a broken double-slash URL | [app/auth/signin/page.tsx:49](app/auth/signin/page.tsx#L49) |
| B4 | Bug | HIGH | Fallback owner `id` type mismatch breaks name lookup | [lib/leads/fallback-data.ts:24](lib/leads/fallback-data.ts#L24) |
| B5 | Bug | HIGH | `notify()`'s toast type is silently dropped by sonner | [lib/commonFunctions.ts:3-6](lib/commonFunctions.ts#L3-L6) |
| B6 | Bug | HIGH | Hardcoded placeholder value sent in real demo-booking requests | [app/auth/signup/page.tsx:79](app/auth/signup/page.tsx#L79) |
| B7 | Bug | MEDIUM | Book-a-demo form resets/re-enables before request resolves | [app/auth/signup/page.tsx:88-98](app/auth/signup/page.tsx#L88-L98) |
| B8 | Bug | MEDIUM | Team page: dead redirect + unconditional admin-only fetch | [app/[orgnization]/settings/team/page.tsx:40-52](app/[orgnization]/settings/team/page.tsx#L40-L52) |
| U1 | UI Bug | MEDIUM | Dark theme fully built but completely unreachable | [app/globals.css:112-176](app/globals.css#L112-L176) |
| U2 | UI Bug | MEDIUM | Lead form dialog's grid has no responsive breakpoint | [components/leads/lead-form-dialog.tsx:144](components/leads/lead-form-dialog.tsx#L144) |
| U3 | UI Bug | LOW | Table loading state is plain text, not a skeleton | [app/[orgnization]/leads/page.tsx:601](app/[orgnization]/leads/page.tsx#L601) |
| X1 | UX Issue | HIGH | Footer links go to the wrong destinations | [app/page.tsx:491-499](app/page.tsx#L491-L499) |
| X2 | UX Issue | MEDIUM | Sign-in fields have no visible keyboard focus indicator | [app/auth/signin/page.tsx:164-196](app/auth/signin/page.tsx#L164-L196) |
| X3 | UX Issue | MEDIUM | Deep-link redirect target captured but never used after login | [app/auth/signin/page.tsx:37-65](app/auth/signin/page.tsx#L37-L65) |
| X4 | UX Issue | MEDIUM | Leads "select all" silently selects off-screen rows | [app/[orgnization]/leads/page.tsx:334-341](app/[orgnization]/leads/page.tsx#L334-L341) |
| X5 | UX Issue | LOW | Kanban cards block native touch scrolling | [components/leads/kanban-card.tsx:48-51](components/leads/kanban-card.tsx#L48-L51) |
| C1 | Code Improvement | MEDIUM | Foundational hooks trip real React-hooks lint errors | [hooks/use-mobile.tsx:14](hooks/use-mobile.tsx#L14) |
| C2 | Code Improvement | MEDIUM | Pervasive `any` typing across every Redux thunk | `lib/store/slices/*.ts` |
| C3 | Code Improvement | HIGH | `pricingPlansSlice` state explicitly typed `unknown` | [lib/store/slices/pricingPlansSlice.ts:5](lib/store/slices/pricingPlansSlice.ts#L5) |
| C4 | Code Improvement | LOW | Dead, already-broken commented-out comparison table | [app/page.tsx:436-452](app/page.tsx#L436-L452) |
| C5 | Code Improvement | LOW | Inconsistent mutation pattern between sibling slices | [lib/store/slices/leadsSlice.ts:523-538](lib/store/slices/leadsSlice.ts#L523-L538) |
| C6 | Code Improvement | LOW | `@dnd-kit/sortable` installed but unused | [package.json](package.json) |
| C7 | Code Improvement | LOW | Sign-in hand-rolls raw `<input>` instead of shared primitive | [app/auth/signin/page.tsx:164-196](app/auth/signin/page.tsx#L164-L196) |
| S1 | Security | HIGH | Access token in `localStorage` (XSS-readable) | [lib/axios/tokenStore.ts](lib/axios/tokenStore.ts) |
| S2 | Security | HIGH | Axios `baseURL` hardcoded to `localhost:5000` | [lib/axios/index.ts:6](lib/axios/index.ts#L6) |
| S3 | Security | MEDIUM | Admin-only UI gates are client-side only, unverifiable from this repo | multiple, see file |
| S4 | Security | LOW | Admin-only endpoint requested regardless of caller's role | [app/[orgnization]/settings/team/page.tsx:46-48](app/[orgnization]/settings/team/page.tsx#L46-L48) |

**27 findings total** — 8 functional bugs, 3 UI bugs, 5 UX issues, 7 code-improvement items, 4 security/performance items. No performance-specific findings beyond what's already logged as an accepted tradeoff in the Leads specs (client-side filtering over a large `limit=1000` fetch) — flagged there, not repeated here as a new item.

## If You Only Fix 5 Things

1. **B1 — Rebuild the auth guard** in `app/[orgnization]/layout.tsx`. Right now nothing client-side stops an unauthenticated or session-expired user from sitting on the app shell.
2. **B2 — Add Leads (and the rest of the module routes) to `proxy.ts`'s protected list and matcher.** The one feature module wired to real data currently has zero frontend route protection.
3. **B3 — Fix the double-slash post-login/reset-password redirect** (`signin/page.tsx:49`, `reset-password/page.tsx:75`) by using the existing `buildOrgRoute` helper. Every successful login currently 404s instead of reaching the dashboard — this is the single highest-visibility bug in the app.
4. **B5 — Fix `notify()`'s toast styling** (`lib/commonFunctions.ts`). One-line-ish fix, and it's the app's only feedback mechanism across every feature — currently every success and every error look identical.
5. **B6 — Remove the hardcoded `"asdasdsd"` placeholder** from the real Book-a-Demo payload (`signup/page.tsx:79`). It's corrupting real business data on the one live lead-generation form on the marketing site.

All five are small, isolated, high-confidence fixes (S–M effort each) that remove the app's worst first-impression and trust risks before anything else on this list is worth spending time on.
