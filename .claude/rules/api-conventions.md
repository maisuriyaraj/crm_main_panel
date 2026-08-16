# API Conventions

- All HTTP calls go through the single shared `Axios` instance in `lib/axios/index.ts` (`withCredentials: true`). Do not create a second axios instance anywhere else.
- Never hardcode an API path in a component or a thunk. Add it to `apiRoutes` in `lib/constants.ts` and reference the constant (see `reqToGetPricingPlans`, `reqToBookADemo`).
- For the request/response contract each thunk follows, see `.claude/rules/state-management.md`.

## Known issue — do not copy this pattern

`lib/axios/index.ts` hardcodes `baseURL: "http://localhost:5000"`. The `.env` file defines `API_URL` for this exact purpose, but nothing in the app currently reads it. If you touch this file, flag this to the developer rather than silently hardcoding another URL elsewhere.
