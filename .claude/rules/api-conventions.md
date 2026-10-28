# API Conventions

- All HTTP calls go through the single shared `Axios` instance in `lib/axios/index.ts` (`withCredentials: true`). Do not create a second axios instance anywhere else.
- Exception: public, unauthenticated reads done on the server (in a Server Component) use plain `fetch` with `next.revalidate`, like `lib/pricing/getPricingPlans.ts` for the landing page's pricing plans.
- Never hardcode an API path in a component or a thunk. Add it to `apiRoutes` in `lib/constants.ts` and reference the constant (see `reqToBookADemo`).
- For the request/response contract each thunk follows, see `.claude/rules/state-management.md`.

## Base URL

`NEXT_PUBLIC_API_URL` (e.g. `http://localhost:5000/api/`) is the API root; `lib/axios` uses it as `baseURL`. Anything that builds a full URL outside the shared client (raw `axios`, server `fetch`) must use `apiUrl(apiRoutes.x)` from `lib/constants.ts`. Never concatenate `API_BASE_URL + path`: the double slash it produces 404s.
