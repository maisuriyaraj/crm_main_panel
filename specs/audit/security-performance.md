# Security & Performance

No performance-specific findings (no obvious unmemoized heavy computation, N+1 client-side call pattern, or missing pagination beyond what's already logged as a known, accepted tradeoff in the Leads specs — see S-note below). The findings below are all security/access-control related, which is where this pass found real, evidenced issues.

---

### [HIGH] S1 — Access token stored in `localStorage`, readable by any script on the page
- Location: [lib/axios/tokenStore.ts:1-20](lib/axios/tokenStore.ts#L1-L20)
- Description: `setAccessToken`/`getAccessToken` mirror the in-memory access token into `localStorage` under the key `"accessToken"`. This is a documented, deliberate decision in `specs/auth/auth-flow.md` ("accepted per your instruction... mitigated by the short 15-minute backend expiry"), not an oversight — flagged here because a pre-release security pass should re-confirm the tradeoff is still acceptable, not because it's unknown.
- Impact: Any XSS on this origin (including a compromised third-party script, ad tag, or a future dependency vulnerability) can read `localStorage.getItem("accessToken")` directly, with no `httpOnly` protection. The stated mitigation (a short backend-side expiry) can't be verified from this repo — if the backend's actual token TTL is longer than 15 minutes, or the refresh flow silently extends a stolen token's usable window, the real exposure is larger than documented.
- Suggested fix: If httpOnly-cookie-only auth (no readable JS token at all) is feasible given the cross-origin (`localhost:3000` → `localhost:5000` in dev) setup, that would remove this surface entirely. If localStorage must stay for now, treat the backend's actual expiry value as a hard commitment and verify it independently as part of this pre-release review, rather than trusting the frontend comment.
- Effort estimate: L (removing localStorage entirely, if feasible) / — (verification only, if keeping current design)

---

### [HIGH] S2 — Axios base URL is hardcoded to `localhost:5000`; the app cannot reach a real backend as shipped
- Location: [lib/axios/index.ts:6](lib/axios/index.ts#L6)
- Description: `baseURL: "http://localhost:5000"` is a literal string, not read from any environment variable. `.env` defines `API_URL=http://localhost:5000`, but a repo-wide search confirms zero references to `API_URL` anywhere in `.ts`/`.tsx` source — it's dead configuration. This is already flagged as a known issue in `.claude/rules/api-conventions.md` and repeated in every feature spec's Risks section; restated here because it's now carrying meaningfully more traffic than when first flagged (every authenticated screen, not just marketing forms) and is a hard blocker for any non-local deployment.
- Impact: Deploying this app to any environment other than a developer's own machine with a backend on `localhost:5000` will silently fail every single API call (CORS/connection errors), with no build-time or config-time warning.
- Suggested fix: Read `baseURL` from `process.env.API_URL` (or `NEXT_PUBLIC_API_URL`, since this needs to be available client-side — `API_URL` without the `NEXT_PUBLIC_` prefix is server-only in Next.js and won't be readable in this client-side Axios instance as currently named).
- Effort estimate: S

---

### [MEDIUM] S3 — Every admin-only UI gate is a client-side string comparison with no independent double-check
- Location: [app/[orgnization]/settings/team/page.tsx:37](app/[orgnization]/settings/team/page.tsx#L37), [app/[orgnization]/leads/page.tsx:81-82](app/[orgnization]/leads/page.tsx#L81-L82), [app/[orgnization]/leads/page.tsx:440](app/[orgnization]/leads/page.tsx#L440), [app/[orgnization]/leads/page.tsx:552](app/[orgnization]/leads/page.tsx#L552), [components/layout/app-sidebar.tsx:128](components/layout/app-sidebar.tsx#L128)
- Description: Every admin-only affordance in the app (Team management page access, Leads' Delete button, the bulk action bar, the "Organization" sidebar group) is gated purely by `role === "org_admin"` read from client-side Redux state. This is consistent with the pattern the auth spec explicitly documents as "UX-only, backend is the real enforcement" — not a new finding, but worth restating as an explicit checklist item in a pre-release security pass, since none of it is independently verifiable from this repo (the backend lives elsewhere) and every one of these gates would silently do nothing if a future contributor added a new admin-only action and forgot the matching backend check.
- Impact: No confirmed vulnerability from this repo alone — but it's exactly the kind of control that's easy to regress silently (add a new admin action, remember the frontend `role !== "org_admin"` check, forget the backend `requireOrgAdmin` middleware) without any test coverage catching it, since this repo has no test runner configured at all.
- Suggested fix: Not a frontend code change — a process one: before this ships, walk every admin-gated action listed above against the backend route list and confirm each has server-side role enforcement, and consider a lightweight integration test (even a manual checklist) that specifically re-verifies this on every future admin-feature PR.
- Effort estimate: — (verification/process, not a code fix)

---

### [LOW] S4 — Admin-only endpoint requested unconditionally regardless of caller's role
- Location: [app/[orgnization]/settings/team/page.tsx:46-48](app/[orgnization]/settings/team/page.tsx#L46-L48)
- Description: See B8 in `bugs.md` for the full description — `reqToGetOrgUsers` (`GET /api/app/users`, admin-only per the backend) fires for every visitor to this page regardless of role, before the role check runs. Filed here too because it's a useful data point for S3: the frontend doesn't currently have a habit of checking role before firing an admin-only request, which is worth knowing before more admin-only endpoints are added.
- Impact: Not a data leak (the backend 403s), just wasted requests and console noise for every non-admin visitor.
- Suggested fix: Same as B8 — gate the dispatch behind the role check.
- Effort estimate: S
