# Code Improvements / Tech Debt

---

### [MEDIUM] C1 — Foundational hooks used app-wide trip real React-hooks lint rules
- Location: [hooks/use-mobile.tsx:14](hooks/use-mobile.tsx#L14), [lib/store/StoreProvider.tsx:14](lib/store/StoreProvider.tsx#L14)
- Description: `npx eslint .` reports two `error`-level (not warning) violations in files that sit underneath every single page in the app:
  - `use-mobile.tsx:14` — `react-hooks/set-state-in-effect`: `setIsMobile(...)` is called synchronously inside the effect body (in addition to the `mql` change listener), which the rule flags as a cascading-render risk. This hook backs `components/ui/sidebar.tsx`'s mobile/desktop switch, so it runs on every page that renders the app shell.
  - `lib/store/StoreProvider.tsx:14` — `react-hooks/refs`: `<Provider store={storeRef.current}>` reads a ref's `.current` during render, which the rule flags as unsafe (ref reads should happen in effects/handlers, not render). This wraps the entire app in `app/layout.tsx`.
- Impact: Both are currently benign in practice (the values involved are effectively static after mount), but they're `error`-severity lint failures in the two lowest-level files in the codebase — exactly the place regressions are easiest to introduce unnoticed, and the kind of finding that should be cleared before treating `npx eslint .` as a real CI gate.
- Suggested fix: For `use-mobile.tsx`, initialize `isMobile` from `window.matchMedia(...).matches` directly in `useState`'s initializer (guarded for SSR) instead of setting it again inside the effect. For `StoreProvider.tsx`, this is the documented Next.js per-request-store pattern; either suppress the rule with a comment explaining why (SSR-safe singleton, not a per-render read) or adopt the newer `useState(() => store)` initializer pattern instead of `useRef`.
- Effort estimate: S

---

### [MEDIUM] C2 — `any` typing throughout every Redux thunk defeats TypeScript's purpose
- Location: `lib/store/slices/authSlice.ts`, `lib/store/slices/leadsSlice.ts`, `lib/store/slices/orgUsersSlice.ts`, `lib/store/slices/pricingPlansSlice.ts`, `lib/store/slices/publicAPisSlice.ts` — every `createAsyncThunk<any, any, ...>` declaration and most reducer payloads
- Description: `npx eslint .` reports roughly 90 `@typescript-eslint/no-explicit-any` errors concentrated in these five files. Every thunk's argument and return type is `any`, and `lib/leads/mappers.ts`'s `raw: any` parameters mean the snake_case→camelCase mapping layer — the one place that's supposed to be the type-safety boundary between backend and frontend shapes — has none. This matches the pattern already mandated by `.claude/rules/state-management.md`'s required thunk shape, so it's a systemic convention issue, not a one-off mistake.
- Impact: None of the compiler's help is available at the exact boundary (API responses) where runtime shape mismatches are most likely and most costly — this repo would not have caught B4's `id: 1` vs `id: string` mismatch through any thunk/mapper typing, only through the one place `LeadOwner[]` is used with a real interface.
- Suggested fix: At minimum, type each thunk's payload argument as a concrete interface (already exist for most: `AuthUser`, `OrgUser`, `Lead`, etc.) instead of `any`, and type `mappers.ts`'s `raw` parameters against a `LeadApiShape`/`LeadStatusApiShape` etc. This doesn't need to happen all at once — even converting the request/response shapes for one slice at a time would meaningfully narrow the blast radius of the next mapping bug.
- Effort estimate: L (repo-wide), M (just the mappers + one slice as a starting pattern)

---

### [HIGH] C3 — `pricingPlansSlice.ts` explicitly types its state as `unknown`
- Location: [lib/store/slices/pricingPlansSlice.ts:5](lib/store/slices/pricingPlansSlice.ts#L5)
- Description: `const initialState: unknown = { error: null, isLoading: false, pricingPlans: [] };` — the `: unknown` annotation isn't inferred, it's written explicitly, and it's the reason `useAppSelector((state) => state.pricing)` resolves to `unknown` everywhere it's consumed. Confirmed as the direct cause of three of the pre-existing `tsc --noEmit` errors already logged in every spec's Implementation Notes as "unrelated, pre-existing": `app/page.tsx(199,11)`, `app/page.tsx(421,30)`, `app/page.tsx(431,38)`.
- Impact: The landing page's pricing section — a revenue-facing, marketing-critical piece of UI — currently renders with zero type safety on its data (`p.plan_name`, `p.plan_features.map`, etc. are all implicitly `any`). This one-line annotation is the root cause every downstream consumer inherits.
- Suggested fix: Remove the `: unknown` annotation (or replace with a proper `PricingPlansState` interface, matching every other slice's pattern) and let inference/typing flow normally; downstream `any`s at the three cited `app/page.tsx` lines should resolve on their own once this is fixed.
- Effort estimate: S

---

### [LOW] C4 — Dead, already-broken code left commented out in the landing page
- Location: [app/page.tsx:436-452](app/page.tsx#L436-L452) (commented-out comparison table), backing data at [app/page.tsx:19-24](app/page.tsx#L19-L24) (`plans`)
- Description: A feature-comparison `<table>` is commented out in JSX, and its only consumer is the local `plans` array, which uses `{ name, price, desc, features }` fields. Line 441 (still inside the comment) references `p.plan_name` — a field that only exists on the real, API-driven `pricingPlans` Redux state (used correctly elsewhere on the same page, e.g. line 424), not on the local static `plans` array. If this block is ever uncommented as-is, every `<th>` would render blank/`undefined` and share the same React key.
- Impact: Harmless while commented out, but it's a landmine for whoever re-enables it later expecting it to just work, and it's dead weight in an already-large single file (508 lines).
- Suggested fix: Delete the commented block and the unused `plans`/`comparisonTable` consts, or if the comparison table is still wanted, rebuild it against the real `pricingPlans` shape.
- Effort estimate: S

---

### [LOW] C5 — Inconsistent mutation pattern between sibling slices
- Location: [lib/store/slices/orgUsersSlice.ts:171-175](lib/store/slices/orgUsersSlice.ts#L171-L175) vs. [lib/store/slices/leadsSlice.ts:523-538](lib/store/slices/leadsSlice.ts#L523-L538)
- Description: `orgUsersSlice`'s `reqToDeleteOrgUser.fulfilled` updates Redux state directly (`state.users = state.users.filter(...)`), so the UI updates without a refetch. `leadsSlice`'s equivalent thunks (create/update/delete/bulk-update/bulk-delete/change-stage) are all batched through a shared `.forEach` that only ever sets `isLoading`/`error` — none of them touch `state.leads` — so every mutation in `app/[orgnization]/leads/page.tsx` has to call `refreshLeads()` (a full `GET /api/leads` refetch) in its `onSuccess` callback to see the result. Both are "correct" in that they work, but they're two different solutions to the identical problem, built for the same async-slice convention.
- Impact: Not a bug, but it means a future contributor has two contradictory examples to copy from, and the Leads pattern does one extra network round-trip per mutation compared to the Team pattern.
- Suggested fix: Pick one pattern (optimistic local update vs. refetch-after-mutate) and document it in `.claude/rules/state-management.md` so new slices don't have to guess which existing slice to copy.
- Effort estimate: M (if standardizing existing slices) / S (if just documenting the chosen pattern going forward)

---

### [LOW] C6 — `@dnd-kit/sortable` is an installed, unused dependency
- Location: [package.json](package.json) (`"@dnd-kit/sortable": "^10.0.0"`)
- Description: Already flagged in `specs/leads/leads-ui.md`'s Implementation Notes as a known-unused install — confirmed still true: `components/leads/kanban-board.tsx` only imports from `@dnd-kit/core` (`DndContext`, `useDroppable`, `useDraggable` via `kanban-card.tsx`, `DragOverlay`). No file in the repo imports anything from `@dnd-kit/sortable`.
- Impact: Pure bundle-size/dependency-surface cost with no functional benefit today.
- Suggested fix: Remove it from `package.json` until within-column reordering (the feature that would actually need it) is built, per the original spec note.
- Effort estimate: S

---

### [LOW] C7 — Sign-in form hand-rolls raw `<input>` markup instead of the shared primitive
- Location: [app/auth/signin/page.tsx:164-169](app/auth/signin/page.tsx#L164-L169), [app/auth/signin/page.tsx:190-196](app/auth/signin/page.tsx#L190-L196)
- Description: `.claude/rules/component-structure.md` requires composing class names with `cn()` and reusing `components/ui/*` primitives. `reset-password/page.tsx` (built after sign-in, in the same auth flow) correctly uses the shared `Input` component; `signin/page.tsx` instead hand-writes raw `<input className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 outline-none" />` twice. This is also the direct cause of the missing-focus-ring accessibility gap logged as X2 in `ux-issues.md`.
- Impact: Two different visual/behavioral implementations of "a text input" exist side-by-side in the same auth flow, and the older one is missing accessibility behavior the primitive already solved.
- Suggested fix: Replace both raw `<input>` elements with `<Input>` from `components/ui/input.tsx`, matching `reset-password/page.tsx`'s pattern (fixes this and X2 together).
- Effort estimate: S
