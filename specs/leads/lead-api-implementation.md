# Spec: Leads Module — Real API Integration

## Status
Implemented

## Type
New Feature

## Goal
Replace the Leads module's static demo data with real calls to the backend Leads API, so List, Kanban, Analytics, activity log, notes, and pipeline management all work against a live organization's real leads instead of `lib/leads/demo-data.ts`.

## Current State

- **Frontend**: `specs/leads/leads-ui.md` (Implemented) built the full Leads UI — `app/[orgnization]/leads/page.tsx`, `components/leads/kanban-board.tsx`, `kanban-card.tsx`, `lead-form-dialog.tsx`, `lead-detail-sheet.tsx`, `lead-analytics.tsx`, `tag-input.tsx` — but on a developer-directed scope cut: plain `useState` in `page.tsx`, seeded from `lib/leads/demo-data.ts` (`DEMO_LEADS`, `DEMO_LEAD_STATUSES`, `DEMO_OWNERS`, `DEMO_ACTIVITIES`, `DEMO_NOTES`). No `leadsSlice.ts` exists, `lib/store/index.ts` has no `leads` key, and `lib/constants.ts`'s `apiRoutes` has no Leads entries. That spec's own Implementation Notes flagged this as the intended follow-up: "swapping local `useState` for a real `leadsSlice.ts` ... should mostly mean replacing the `set*` calls ... not reshaping the components" — this spec is that follow-up.
- **Backend**: `backend/specs/leads/leads-api.md` (Implemented) — confirmed built and committed (`src/modules/leads/`, `src/services/leads/index.js`, migrations, 9 zod schemas), and independently re-audited this session endpoint-by-endpoint. All 18 endpoints work, org isolation and the 500-item bulk cap are solid, response envelope matches the rest of the app (`{ message, status, data }`, `pagination: { total, page, limit, totalPages }` as a sibling of `data`).
- **Two real backend bugs found in that audit, not yet fixed**, that this frontend work should account for:
  1. Every `.parse()` call in `src/services/leads/index.js` is unguarded — an invalid `priority`/`temperature`/`activity_type`/etc. throws a raw `ZodError` with no `.statusCode`, so the controller sends **500**, not 400, with a raw Zod issues dump as the message. Client-side zod validation in `lead-form-dialog.tsx` already blocks most bad values before they reach the network, so this mostly affects hand-crafted/malformed requests, but the frontend's generic error-toast path will show an ugly message in that case rather than a clean one.
  2. `PATCH /leads/:id/stage` writes its activity-log row with duplicated insert logic instead of reusing the shared activity helper — functionally correct today, not a frontend concern, noted here only for completeness.
  These are backend-repo fixes, out of scope for this frontend spec. Flagged so error-handling here isn't over-engineered around a bug that should be fixed at the source.
- **Owner/assignee list**: `DEMO_OWNERS` is currently a fake list. A real one already exists — `lib/store/slices/orgUsersSlice.ts` (`reqToGetOrgUsers`, backed by `GET /api/app/users`) is fully implemented and used by `app/[orgnization]/settings/team/page.tsx`. This spec reuses that slice for the assignee dropdown/filter instead of adding a second "get org users" endpoint.
- **Admin gating**: the frontend has no `isAdmin` flag today. Role gating is done by string comparison — `app/[orgnization]/settings/team/page.tsx:37,41,50` reads `const { role } = useAuth()` and checks `role !== "Admin"`. This spec follows that exact pattern for the Leads admin-only actions (delete lead, bulk update/delete, stage-pipeline CRUD), matching the backend's `requireOrgAdmin` gating on the same routes.
- **Known base URL issue** (`.claude/rules/api-conventions.md`): `lib/axios/index.ts` hardcodes `baseURL: "http://localhost:5000"`, `.env`'s `API_URL` is unused. This spec does not touch `lib/axios/index.ts` — flagged per that rule, not fixed here.
- **ID type mismatch**: backend `Lead`/`LeadStatus`/etc. primary keys are Sequelize `BIGINT` (`backend/src/models/leads.model.js:5-9`), while every existing frontend Leads type (`Lead.id`, `LeadStage.id`, etc. in `lib/leads/demo-data.ts`) is `string`, and `page.tsx`'s `selectedIds` is a `Set<string>`. A mapping layer (see Proposed Change §4) normalizes every backend id to a string on the way in, so no component needs to change its id handling.

## Proposed Change

### 1. `lib/constants.ts` — add `apiRoutes` entries
Three base paths, following the existing convention where one base key covers multiple HTTP verbs via a dynamic suffix (see `apiRoutes.appUsers`, reused for list/create/update/delete):
```
leads: "/api/leads",            // GET (list), POST (create); + /:id, /bulk, /:id/stage, /:id/activities, /:id/notes
leadStatuses: "/api/leads/statuses",  // GET (list), POST (create); + /:id
leadNotes: "/api/leads/notes",        // + /:noteId  (PATCH/DELETE — this route is NOT nested under a lead id)
```
`pageRoutes.leads` already exists — not touched.

### 2. `lib/leads/types.ts` — new file
Move the type definitions currently in `lib/leads/demo-data.ts` (`Lead`, `LeadStage`, `LeadOwner`, `LeadActivity`, `LeadNote`, `LeadPriority`, `LeadTemperature`, `LeadActivityType`) here unchanged, since every component (`kanban-board.tsx`, `kanban-card.tsx`, `lead-form-dialog.tsx`, `lead-detail-sheet.tsx`, `lead-analytics.tsx`, `page.tsx`) already imports these shapes and none of them need to change — only where the data comes from changes.

### 3. `lib/leads/demo-data.ts` — retire
Delete `DEMO_LEADS`, `DEMO_LEAD_STATUSES`, `DEMO_OWNERS`, `DEMO_ACTIVITIES`, `DEMO_NOTES`, and the `ownerName` helper (no longer needed once assignee names come from `orgUsersSlice`). Once every import of this file is updated to `lib/leads/types.ts` (§2), delete the file — it becomes dead code otherwise.

### 4. `lib/leads/mappers.ts` — new file
The backend's JSON shape is `snake_case` with nested includes (`full_name`, `status_id`, `assigned_to`, `lead_score`, `expected_budget`, plus nested `status`, `assignee`, `tags`, `activities`, `notes` objects/arrays on `GET /leads/:id`); the frontend's `Lead`/`LeadStage`/`LeadActivity`/`LeadNote` types are `camelCase` flat shapes. This file holds pure mapping functions (`mapLeadFromApi`, `mapLeadStatusFromApi`, `mapLeadActivityFromApi`, `mapLeadNoteFromApi`, and the reverse `mapLeadToApiBody` for create/update payloads) so no component has to know about the wire format. Every id is coerced to `String(...)` here, resolving the id-type mismatch noted in Current State.

### 5. `lib/store/slices/leadsSlice.ts` — new file
Follows the required async-slice shape from `.claude/rules/state-management.md` exactly (thunk arg `{ data, onSuccess, onFailure }`, `pending`/`fulfilled`/`rejected` cases, `isLoading`/`error`), matching `orgUsersSlice.ts`'s existing pattern. Thunks, one per endpoint:

`reqToGetLeads`, `reqToGetLead`, `reqToCreateLead`, `reqToUpdateLead`, `reqToDeleteLead`, `reqToBulkUpdateLeads`, `reqToBulkDeleteLeads`, `reqToChangeLeadStage`, `reqToGetLeadActivities`, `reqToAddLeadActivity`, `reqToGetLeadNotes`, `reqToCreateLeadNote`, `reqToUpdateLeadNote`, `reqToDeleteLeadNote`, `reqToGetLeadStatuses`, `reqToCreateLeadStatus`, `reqToUpdateLeadStatus`, `reqToDeleteLeadStatus`.

State shape:
```
{
  leads: Lead[], pagination: { page, limit, total, totalPages } | null, isLoading, error,
  statuses: LeadStage[], statusesLoading, statusesError,
  activeLeadActivities: LeadActivity[], activitiesLoading,
  activeLeadNotes: LeadNote[], notesLoading,
}
```
Every `fulfilled` case runs the response through the matching mapper from §4 before storing it.

**Implementation detail to get right**: `DELETE /leads/bulk` needs a request body (`{ ids }`) on a DELETE call — Axios's `delete(url, config)` takes the body via `config.data`, not as a second positional argument like `post`/`patch`. Flagging this since it's an easy mistake (`reqToDeleteOrgUser`, the only existing delete thunk, is a single-id path-param delete and doesn't hit this).

### 6. `lib/store/index.ts`
Register the new reducer: `leads: leadsReducer` (or update per the exact key already chosen for `pricing`/`publicData`/`orgUsers` naming style — key name `leads`).

### 7. `app/[orgnization]/leads/page.tsx` — swap data source
- Replace `useState<Lead[]>(DEMO_LEADS)` etc. with `useAppSelector`/`useAppDispatch` against the new `leads` slice.
- On mount (and whenever a create/update/delete/stage-change/bulk action succeeds), dispatch `reqToGetLeads({ data: { limit: 1000 } })` — see Open Questions §1 for why a single large fetch, not true server pagination, is proposed for v1.
- Keep the existing client-side `filteredLeads` `useMemo` (search/stage/owner/priority/temperature) exactly as-is — it already operates on a plain `Lead[]`, so it doesn't care whether that array came from `DEMO_LEADS` or the Redux store.
- Owner filter/assignee dropdown: switch from `DEMO_OWNERS` to `useAppSelector((s) => s.orgUsers.users)` (dispatch `reqToGetOrgUsers` alongside the leads fetch on mount, matching how `team/page.tsx` already does it).
- Every mutation (`create`, `edit`, `delete`, bulk actions, stage change via Kanban drag or the detail sheet, activity add, note add/edit/delete, status CRUD) dispatches the matching thunk with `onSuccess`/`onFailure` calling the existing `notify()` toast helper, replacing the current in-memory array splicing.

### 8. `components/leads/*` — import path update only
`kanban-board.tsx`, `kanban-card.tsx`, `lead-form-dialog.tsx`, `lead-detail-sheet.tsx`, `lead-analytics.tsx`, `tag-input.tsx`: change their `from "@/lib/leads/demo-data"` type imports to `from "@/lib/leads/types"`. No logic changes expected in these files — they already only consume the `Lead`/`LeadStage`/`LeadActivity`/`LeadNote` shapes, never the `DEMO_*` constants directly (confirmed: only `page.tsx` imports the `DEMO_*` arrays and `ownerName`).

### 9. Admin-gated actions
In `page.tsx` (delete lead, bulk update/delete) and wherever stage-pipeline management lives (statuses CRUD — not yet built as a UI in `leads-ui.md`; if this spec's implementation needs a minimal settings surface for it, that's flagged in Open Questions), gate the action buttons on `role !== "Admin"` from `useAuth()`, matching `settings/team/page.tsx`. This is a UI-level convenience only — the backend's `requireOrgAdmin` is the real enforcement either way.

## Affected Files

**New**
- `lib/leads/types.ts`
- `lib/leads/mappers.ts`
- `lib/store/slices/leadsSlice.ts`

**Modified**
- `lib/constants.ts` — add `leads`, `leadStatuses`, `leadNotes` to `apiRoutes`.
- `lib/store/index.ts` — register `leads` reducer.
- `app/[orgnization]/leads/page.tsx` — swap demo state for Redux-backed data, owner list from `orgUsersSlice`.
- `components/leads/kanban-board.tsx`, `kanban-card.tsx`, `lead-form-dialog.tsx`, `lead-detail-sheet.tsx`, `lead-analytics.tsx`, `tag-input.tsx` — import path only (`demo-data` → `types`).

**Deleted**
- `lib/leads/demo-data.ts` (once every import above is migrated).

## API Changes

Frontend now calls the existing backend contract (`backend/specs/leads/leads-api.md`) as-is — no backend change proposed here. Full endpoint list (all under `/api/leads`, all requiring the existing auth header the shared `Axios` instance already attaches):

`GET /leads`, `GET /leads/:id`, `POST /leads`, `PATCH /leads/:id`, `DELETE /leads/:id` (admin), `PATCH /leads/bulk` (admin), `DELETE /leads/bulk` (admin), `PATCH /leads/:id/stage`, `GET /leads/:id/activities`, `POST /leads/:id/activities`, `GET /leads/:id/notes`, `POST /leads/:id/notes`, `PATCH /leads/notes/:noteId`, `DELETE /leads/notes/:noteId`, `GET /leads/statuses`, `POST /leads/statuses` (admin), `PATCH /leads/statuses/:id` (admin), `DELETE /leads/statuses/:id` (admin).

## Risks

- **v1 pagination is "fetch one large page, filter client-side"** (Proposed Change §7), not true server-driven pagination. This matches the current demo architecture and needs no component rewrite, but if a single org accumulates more leads than the fetch limit (proposed 1000), the list silently stops showing the rest. The backend has no hard cap on `limit` (confirmed: `src/services/leads/index.js` just does `parseInt(limit, 10) || default`), so raising the number later is cheap, but a real fix is a follow-up spec that moves `DataTable` to controlled/server pagination — flagged as Open Question 1, already flagged once before in `leads-ui.md`.
- The two backend bugs noted in Current State (Zod validation surfacing as 500 instead of 400; stage-change's duplicated activity-insert code) are not fixed by this spec. The 500-vs-400 one has a small user-facing effect: a malformed request shows a generic/ugly error toast instead of a clean validation message. Worth fixing on the backend independently of this frontend work.
- `DELETE /leads/bulk`'s body-on-DELETE Axios detail (§5) is an easy mistake to make; flagged explicitly so it isn't missed during implementation.
- Deleting `lib/leads/demo-data.ts` removes the only demo/seed data for this module — if anyone still wants a no-backend demo mode (e.g. for local UI work without the backend running), that capability is gone after this spec. Not raised as a requirement anywhere so far; flagged in case it matters.

## Open Questions

1. Confirm the "fetch a large page (limit=1000), keep client-side filtering" approach (Proposed Change §7, Risks) is acceptable for v1, versus doing the larger work of real server-driven pagination now. Recommend: ship the simple version now (matches existing architecture, low risk), revisit if/when real lead volumes approach the fetch limit.
2. `leads-ui.md` never built a stage-pipeline (lead-statuses) management UI — no screen for org admins to add/edit/delete/reorder stages exists yet, only the Kanban board that *reads* `GET /leads/statuses`. This spec adds the `reqToCreateLeadStatus`/`reqToUpdateLeadStatus`/`reqToDeleteLeadStatus` thunks (so the API layer is complete), but should a minimal settings UI for managing stages be built as part of this pass, or left for a separate spec since org admins get sensible defaults (New/Contacted/Qualified/Proposal/Won/Lost) seeded automatically today?
3. Confirm no other consumer of `lib/leads/demo-data.ts`'s `DEMO_*` exports exists outside the Leads module itself (e.g. a Dashboard widget or Analytics preview elsewhere) before it's deleted — a repo-wide search found none as of this spec, but worth a final check at implementation time since new code may have landed since.

## Implementation Notes

- **Built as specced**: `lib/leads/types.ts` (type defs extracted from `demo-data.ts`), `lib/leads/mappers.ts` (snake_case↔camelCase conversion, every id coerced to `String(...)`), `lib/store/slices/leadsSlice.ts` (18 thunks, matching `.claude/rules/state-management.md`'s required shape), `apiRoutes.leads`/`leadStatuses`/`leadNotes` in `lib/constants.ts`, `leads` reducer registered in `lib/store/index.ts`, `app/[orgnization]/leads/page.tsx` rewritten to dispatch thunks instead of mutating local `useState`, and `lib/leads/demo-data.ts` deleted (confirmed no remaining references beyond the two spec docs).
- **Deviation from §8 (flagged before making it)**: the spec's claim that only `page.tsx` imported `DEMO_LEAD_STATUSES`/`DEMO_OWNERS`/`ownerName` directly was wrong — `kanban-board.tsx`, `kanban-card.tsx`, `lead-form-dialog.tsx`, `lead-detail-sheet.tsx`, and `lead-analytics.tsx` all did too. Fixed by threading `statuses`/`owners` in as new required props on all five components, not a plain import-path swap.
- **Deviation, not in the original plan**: the backend only auto-logs the "Stage changed from X to Y" activity through the dedicated `PATCH /leads/:id/stage` endpoint, not the generic `PATCH /leads/:id`. So editing a lead's stage via the form dialog now dispatches `reqToChangeLeadStage` first (to get that activity logged), then `reqToUpdateLead` for the remaining fields — two sequential requests instead of one for that specific case.
- **Known limitation, not worked around**: `PATCH /leads/bulk` does not write an activity-log entry server-side (confirmed in this session's earlier backend audit), so a bulk stage-change from the list view's selection bar produces no activity trail. Not patched from the frontend with a per-lead loop — that would defeat the point of the bulk endpoint and risks being slow/abusive at the 500-item cap.
- **Known limitation**: Kanban drag-and-drop is no longer instant — a card only moves once the `PATCH .../stage` call resolves and the list is refetched. True optimistic-UI (instant move + rollback on failure) was never actually built in `leads-ui.md` either (its Kanban board has no local reordering, just renders whatever `leads` prop it's given), so this isn't a regression from a working feature, just a gap that's now more visible with a real network round-trip. Follow-up if the lag is a real problem.
- **Open Question 1 resolved**: v1 fetches leads once via `GET /leads?limit=1000` and keeps the existing client-side filter/search `useMemo` as-is (recommended default in the spec).
- **Open Question 2 resolved as deferred**: the `reqToCreateLeadStatus`/`reqToUpdateLeadStatus`/`reqToDeleteLeadStatus` thunks were built (API layer complete), but no stage-pipeline management screen was added this pass — orgs still rely on the backend's default seeded stages (New/Contacted/Qualified/Proposal/Won/Lost). A settings UI for this is a separate, future spec.
- **Open Question 3 confirmed**: repo-wide search found no consumer of `demo-data.ts`'s `DEMO_*` exports outside the Leads module before deleting it.
- Delete-lead (single row) and the bulk selection action bar (stage-change/assign/delete) are now hidden in the UI for non-`Admin` users, matching `settings/team/page.tsx`'s `role !== "Admin"` pattern — the real enforcement is still server-side (`requireOrgAdmin`), this is a UI convenience only.
- **Follow-up, unfixed**: the two backend bugs found in this session's earlier audit of `backend/specs/leads/leads-api.md` (Zod validation errors surfacing as 500 instead of 400; `PATCH /leads/:id/stage` duplicating activity-insert logic) are unchanged — backend-repo fixes, out of scope here.
- Verified: `npx tsc --noEmit` shows zero new errors (only the same pre-existing, unrelated ones already documented in `auth-flow.md`/`sidebar-nav.md`/`leads-ui.md` — `app/page.tsx`, `components/ui/calendar.tsx`, `components/ui/chart.tsx`, `lib/commonFunctions.ts`, `pricingPlansSlice.ts`, `publicAPisSlice.ts`). `npx eslint` is clean on every touched file except `leadsSlice.ts`/`mappers.ts`, which trip `no-explicit-any` — the same violation already present, unaddressed, in the existing `orgUsersSlice.ts`, since it's mirroring the thunk shape `.claude/rules/state-management.md` mandates. `next build`'s compile step succeeds; its later type-check step fails only on the same pre-existing `app/page.tsx` pricing-slice typing issue, nothing in this feature's files. An already-running dev server picked up the changes via HMR; `GET /testorg/leads` returned 200 with the expected page content ("New Lead", "Track and manage your sales pipeline"), no error markers.
- **Not verified**: interactive browser testing against a live backend (real create/edit/delete round-trips, drag-and-drop feel, activity/notes panels) — no backend server was confirmed running and no browser/screenshot tool was available this session. Matches the same gap already on record in `auth-flow.md`, `sidebar-nav.md`, and `leads-ui.md`. A manual pass against a running backend is a real follow-up before this is considered fully done.

## Change Request History
- 2026-08-26 | Added `lib/leads/fallback-data.ts` (static placeholder stages/owners) and wired `app/[orgnization]/leads/page.tsx` to use it whenever the real `statuses`/`owners` lists come back empty. | Stage and Owner dropdowns in the Add Lead form were rendering empty: `GET /api/app/users` (reused for the Owner list) is admin-only on the backend and 403s for non-admin users, and this test org has no seeded `lead_statuses` rows yet. Developer said the backend isn't ready yet and asked for static data as a stopgap rather than fixing the backend gate/seeding right now. Real data still takes priority automatically once either is populated — no further code change needed when the backend catches up. | Developer
