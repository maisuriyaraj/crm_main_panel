# State Management (Redux Toolkit)

## Store

- The store is assembled in `lib/store/index.ts`. Every new slice's reducer must be registered there under a short state key (see `pricing`, `publicData`).
- `lib/store/StoreProvider.tsx` (client component) wraps the app once in `app/layout.tsx` — don't add a second `<Provider>`.

## Hooks

- Always use `useAppDispatch` / `useAppSelector` from `lib/store/hooks.ts`, never the raw `react-redux` hooks — these carry the app's `RootState`/`AppDispatch` types.

## Async slice pattern

Every existing async slice (`lib/store/slices/pricingPlansSlice.ts`, `lib/store/slices/publicAPisSlice.ts`) follows the same shape — new slices must match it:

- The thunk (`createAsyncThunk`) takes one argument object: `{ data, onSuccess, onFailure }`. It calls the API through the shared `Axios` client (see `.claude/rules/api-conventions.md`), then invokes `onSuccess(response.data)` or `onFailure(error)` **in addition to** returning/rejecting — callers rely on these callbacks for UI side effects (e.g. `notify(...)`), not only on the thunk's fulfilled/rejected state.
- Reducer cases:
  - `pending` → `isLoading = true`, `error = null`
  - `fulfilled` → `isLoading = false`, `error = null`, store the response data
  - `rejected` → `isLoading = false`, `error = action.payload?.message`, using `rejectWithValue({ message })` in the catch block

Do not introduce a different thunk argument shape or a differently-shaped `isLoading`/`error` state — components and future slices assume this exact contract.
