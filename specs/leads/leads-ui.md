# Spec: Leads Module (User Panel Frontend)

## Status
Implemented

## Type
New Feature

## Goal
Build the Leads screens inside the User Panel (`app/[orgnization]/leads/`) — List, Kanban, and Analytics views, lead create/edit forms, activity log and notes — wired to the backend endpoints defined in the companion spec `backend/specs/leads/leads-api.md`.

## Current State

- **Sidebar nav entry already exists — no sidebar change needed.** `specs/navigation/sidebar-nav.md` (Implemented) already added a real "Leads" link: `pageRoutes.leads = "/leads"` in `lib/constants.ts`, icon `UserPlus`, rendered via `buildOrgRoute`. It currently points at a route with no page behind it. This spec fills that gap; it does not touch the sidebar itself, per your instruction.
- **No `OrbitOps*` component convention exists.** Confirmed by repo-wide search (zero matches) — independently confirmed twice now, first by `sidebar-nav.md`, again here. What actually exists: `components/ui/data-table.tsx` (a plain generic client-side sortable/searchable/paginated table) and two form patterns. This spec does not introduce an `OrbitOps` prefix; it uses the real, existing conventions (see Forms below). You asked to skip resolving this and just proceed — this is the proceed-with-existing-convention default.
- **No Lovable reference doc exists.** `.claude/context/leads-lovable-reference.md` was requested as UX/data-model reference but doesn't exist anywhere in the workspace — checked backend, main-panel, and the actual `lovable/` prototype source itself (which has no leads feature in it at all, just scaffold/UI-kit code). You said to skip/ignore this. This spec's view/feature list below is therefore written from your task description and standard CRM conventions, not from any concrete reference screen — flagged so it isn't mistaken for a match to a design you've already seen.
- **The two form patterns that actually coexist** (`.claude/rules/component-structure.md`): Formik+Yup (older, used in `app/auth/signup/page.tsx`) and react-hook-form+zod (newer — `components/team/user-form-dialog.tsx`, wired into the shared `components/ui/form.tsx` primitive). The most recently built form (`user-form-dialog.tsx`, part of the Implemented `sidebar-nav`/`auth-flow` work) uses react-hook-form+zod. This spec follows that same, more recent pattern for all new Leads forms — not Formik+Yup, and not an `OrbitOpsField*` wrapper.
- **State management is Redux Toolkit, not react-query.** `.claude/rules/state-management.md` documents one required async-slice shape (`createAsyncThunk({ data, onSuccess, onFailure })`, `isLoading`/`error` reducer cases) that every existing slice (`pricingPlansSlice.ts`, `orgUsersSlice.ts`) already follows. `@tanstack/react-query` is not installed (confirmed in `package.json`). This is a deviation from your original task description, which mentioned react-query — flagged explicitly in Risks/Open Questions rather than silently adding a new data-fetching library or silently ignoring the mismatch.
- **No drag-and-drop library is installed.** Kanban needs one — proposed in Proposed Change §3.
- The closest existing precedent for a CRM list screen is `app/[orgnization]/settings/team/page.tsx`: a Redux slice + `DataTable` + a dialog form built on `useForm`/`zodResolver`. This spec's List view follows that shape closely.
- `DataTable` (`components/ui/data-table.tsx`) is **client-side only** — `team/page.tsx` fetches the full list in one call and lets `DataTable` handle search/sort/paginate in-browser. The backend Leads API (companion spec) supports real server-side `page`/`limit`/`search`/filter/sort query params. Leads could scale far larger than the team member list, so this spec proposes moving to server-driven pagination for the List view instead of copying the fully-client-side pattern as-is — see Proposed Change §2 and Open Questions.

## Proposed Change

### 1. Routes (`app/[orgnization]/leads/`)
- `app/[orgnization]/leads/page.tsx` — the main Leads screen. Renders a view-switcher (List / Kanban / Analytics) as tabs, with the active tab kept in the URL (`?view=list|kanban|analytics`, default `list`) so a view is shareable/bookmarkable and survives a refresh — not local-only component state.
- `app/[orgnization]/leads/[leadId]/page.tsx` — lead detail (profile fields, activity timeline, notes) — opened either as its own page or a slide-over drawer over the list/kanban (drawer is the recommended pattern, matching common CRM UX and avoiding a full navigation away from the board/list); final choice flagged in Open Questions.
- No new sidebar entry is added — see Current State, this is intentionally not this spec's job.

### 2. List view
- Server-driven pagination/search/filter/sort, calling `GET /api/leads` with `page`, `limit`, `search`, `status_id`, `assigned_to`, `priority`, `temperature`, `tag`, `sort_by`, `sort_dir` query params (matches the backend spec's contract).
- Still built on `components/ui/data-table.tsx` for rendering (columns, row actions), but driven by server response + Redux state for `data`/`pagination`/`isLoading` rather than `DataTable`'s built-in client-side search/sort — `DataTable` needs either a small prop addition to accept "controlled" pagination or this view manages page/sort state itself and passes only the current page's rows in. Exact prop-level change to `data-table.tsx` is an implementation detail for `/sdd-implement`, not decided here.
- Columns: name (with company as secondary line), stage (colored badge from `lead_statuses.color`), owner (assignee), priority, temperature, score, value, last activity date, tags. Row actions: edit, change stage (inline dropdown), delete (admin-only, matches backend gating).
- Bulk actions: row selection checkboxes → bulk stage-change / bulk assign / bulk delete action bar, calling `PATCH /leads/bulk` / `DELETE /leads/bulk`.

### 3. Kanban view
- Columns = the org's `lead_statuses`, ordered by `sort_order`, fetched via `GET /api/leads/statuses`. Each column shows lead cards (name, company, value, owner avatar, temperature indicator) for leads with that `status_id`.
- Drag-and-drop between columns calls `PATCH /leads/:id/stage`. **New dependency required** — nothing in `package.json` today does drag-and-drop. Proposed: `@dnd-kit/core` + `@dnd-kit/sortable` (actively maintained, accessible, no legacy React 19 compatibility issues unlike some alternatives). Flagged for your approval before adding.
- Optimistic UI: move the card immediately on drop, roll back if the `PATCH` fails (matches the "instant feel" expectation of a Kanban board); toast via existing `notify()` helper on failure.

### 4. Analytics view
- Summary tiles: total leads, total pipeline value (sum of `value` across non-lost leads), win rate (`is_won` stage count / closed count), average deal size, leads by temperature.
- Charts: stage funnel (count per `lead_statuses`, ordered by `sort_order`) and a simple time-series (leads created per week/month) — using `recharts`, already installed and already used elsewhere in this repo's dependency tree (confirmed present in `node_modules`; verify it's an actual declared dependency, not just transitive, before relying on it — flagged as an implementation-time check).
- No new backend endpoint is assumed beyond what's needed to compute these from `GET /leads` + `GET /leads/statuses` results client-side for v1 — a dedicated `/leads/analytics` aggregation endpoint is not in the backend spec. If the lead volume makes client-side aggregation impractical, that's a backend spec change, not something to silently add here.

### 5. Lead detail (activity + notes)
- Activity timeline: `GET /leads/:id/activities`, newest first, with a small "add activity" form (`activity_type` select + subject + description) posting to `POST /leads/:id/activities`.
- Notes: `GET /leads/:id/notes` list + inline add/edit/delete, calling the note endpoints from the backend spec.

### 6. Forms
- `components/leads/lead-form-dialog.tsx` (create/edit, mirrors `user-form-dialog.tsx`'s `mode="create" | "edit"` pattern) — `react-hook-form` + `zodResolver`, plain-named fields (no `OrbitOpsField*`), reusing existing `components/ui/*` primitives (`input.tsx`, `select.tsx`, `textarea.tsx`, a tags input — new small component `components/leads/tag-input.tsx` if none exists, checked at implementation time).
- Zod schemas colocated with the form component (matching how `user-form-dialog.tsx` defines `createUserSchema`/`editUserSchema` inline), not a new shared validation file — this repo doesn't centralize frontend validation schemas the way the backend does.
- "New Lead" entry point: a page-header button (`+ New Lead`, matches `team/page.tsx`'s "Invite User" button placement/style) on the List/Kanban toolbar. Not duplicated in the sidebar (the sidebar is just a nav link, per Current State) and not a second entry point elsewhere for v1.

### 7. State ownership
- **Server state**: a new `lib/store/slices/leadsSlice.ts`, following the exact required shape from `.claude/rules/state-management.md` — thunks `reqToGetLeads`, `reqToGetLead`, `reqToCreateLead`, `reqToUpdateLead`, `reqToDeleteLead`, `reqToBulkUpdateLeads`, `reqToBulkDeleteLeads`, `reqToChangeLeadStage`, `reqToGetLeadActivities`, `reqToAddLeadActivity`, `reqToGetLeadNotes`, `reqToCreateLeadNote`, `reqToUpdateLeadNote`, `reqToDeleteLeadNote`, `reqToGetLeadStatuses`, `reqToCreateLeadStatus`, `reqToUpdateLeadStatus`, `reqToDeleteLeadStatus`. Registered in `lib/store/index.ts` under a `leads` key. This is a large number of thunks for one feature — flagged in Risks as a real cost of matching the existing convention verbatim rather than something to silently trim.
- **Local UI state** (not server state, not persisted server-side):
  - Active view tab — URL query param (`?view=`), not local state, not localStorage (see Route section above).
  - Filter-sidebar open/collapsed — `localStorage`, per-browser convenience only. This mirrors the precedent already set by `sidebar-nav.md`'s own collapse-state decision (a plain cookie there, for a similar "not worth a backend field yet" reason) — same reasoning applied here, not a new pattern.
  - Saved views / filter presets — `localStorage` for v1 (matches the Lovable reference's original approach, since there's no per-user-preference backend endpoint today). Flagged as an Open Question: this means saved views don't sync across devices/browsers; if that matters, it needs a real backend table + endpoints, which is out of scope for this spec.
  - Kanban drag-in-progress state — local component state, owned by `@dnd-kit`.

## Affected Files

**New**
- `app/[orgnization]/leads/page.tsx`, `app/[orgnization]/leads/[leadId]/page.tsx`
- `components/leads/lead-form-dialog.tsx`, `components/leads/lead-detail-drawer.tsx` (or page, per Open Questions), `components/leads/kanban-board.tsx`, `components/leads/kanban-card.tsx`, `components/leads/lead-analytics.tsx`, `components/leads/tag-input.tsx` (if no existing tag/multi-value input is found at implementation time)
- `lib/store/slices/leadsSlice.ts`

**Modified**
- `lib/store/index.ts` — register the `leads` slice.
- `lib/constants.ts` — add `apiRoutes` entries for every backend endpoint in the companion spec (`getLeads`, `getLead`, `createLead`, `updateLead`, `deleteLead`, `bulkUpdateLeads`, `bulkDeleteLeads`, `changeLeadStage`, `getLeadActivities`, `addLeadActivity`, `getLeadNotes`, `createLeadNote`, `updateLeadNote`, `deleteLeadNote`, `getLeadStatuses`, `createLeadStatus`, `updateLeadStatus`, `deleteLeadStatus`). `pageRoutes.leads` already exists — not modified.
- `package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable` (pending your approval, see Proposed Change §3).

**Not touched by this spec**
- `components/layout/app-sidebar.tsx` — the nav link already exists (see Current State).
- `components/ui/data-table.tsx` — reused; any prop addition needed for server-driven pagination is an implementation detail decided during `/sdd-implement`, not a redesign of the primitive.

## Design
- **Screens affected**: new — `app/[orgnization]/leads/*` didn't render anything before this spec (404 via Next's default not-found page, per `sidebar-nav.md`'s Risks).
- **Existing components reused**: `components/ui/data-table.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/dialog.tsx`/`alert-dialog.tsx`, `components/ui/form.tsx` (react-hook-form wiring), `components/ui/select.tsx`, `components/ui/tabs.tsx` (for the List/Kanban/Analytics switcher, if present — verify at implementation time), `recharts` (Analytics charts).
- **New components**: listed under Affected Files, all plain-named per `components/team/`'s existing pattern — no new naming convention introduced.
- **Design tokens**: existing semantic tokens only (`--primary`, `--muted`, `--chart-1..5` for Analytics charts, `--sidebar*` not relevant here) — no new raw colors, per `.claude/rules/theming.md`. Stage colors (`lead_statuses.color`, backend-provided) render as inline style on badges/kanban headers since they're per-org configurable data, not design-system tokens — this is an intentional, narrow exception to "no raw colors" for user-configured data, not a precedent for hardcoding colors elsewhere.
- **Platform differences**: none specified; Kanban's drag-and-drop UX on touch/mobile is worth a manual check once built (not blocking the spec).

## Out of Scope (v1)
Mirrors the backend spec's Out of Scope list, since the frontend has nothing to build against for these:
- Lead→Contact conversion UI (no Contacts module, no backend endpoint).
- Attachment upload UI (no backend upload endpoint).
- Follow-up/reminder UI (`lead_followups` exists as a backend model only, no routes).
- CSV import/export.
- WhatsApp click-to-chat (a `wa.me` link is trivial to add later on the lead detail view once the fields exist; not built now since it wasn't asked for as MVP).
- Automatic lead scoring (score/value/probability are plain editable fields).
- Server-side saved views (v1 is `localStorage`, see State Ownership).

## Risks
- The Redux Toolkit async-slice pattern requires ~17 near-identical thunks for this one feature (see Proposed Change §7) — matches the existing convention exactly, but is real boilerplate. If you'd rather introduce `@tanstack/react-query` for this data-heavy module specifically (mixing patterns, the way this repo already mixes two form libraries), that's a call only you can make — this spec does not make it unilaterally.
- Moving the List view from `DataTable`'s built-in client-side pagination to server-driven pagination (Proposed Change §2) is a deviation from the one existing precedent (`team/page.tsx`). If Leads volume is expected to stay small (dozens, not thousands), the simpler fully-client-side pattern from `team/page.tsx` would also work and requires less new plumbing — flagged as an Open Question.
- `@dnd-kit` is a new dependency; confirm before it's added to `package.json`.
- No UX reference exists for this feature (see Current State) — the view/feature list above is this spec's own interpretation of your task description, not a match to a screen you've already seen. Expect more visual back-and-forth during implementation than a spec with a real reference would need.

## Open Questions
1. Redux Toolkit (matches every existing slice, more boilerplate) vs introducing react-query for this module specifically (less boilerplate, a second server-state pattern in the app) — which do you want?
2. Server-driven List pagination (this spec's proposal) vs keeping it simple and fully client-side like `team/page.tsx` (works fine while lead counts are small) — which, and does your expected lead volume per org actually push toward one or the other?
3. Lead detail: slide-over drawer (recommended, keeps the board/list in view) or its own full page (`[leadId]/page.tsx`) — which?
4. `@dnd-kit/core` + `@dnd-kit/sortable` OK as the drag-and-drop library, or do you have a preference (e.g. `@hello-pangea/dnd`)?
5. Saved views/filter presets in `localStorage` for v1 (device-local only) — acceptable, or does this need to be a backend feature (its own table + endpoints) from the start?
6. Is `recharts` actually a declared dependency in `package.json` (not just present in `node_modules` transitively) — confirm before Analytics is built on it.

## Implementation Notes

- **Built exactly as specced, with one developer-directed scope change made at implementation time**: the developer explicitly instructed "don't implement any API — just make the whole leads module with demo static data" when kicking off `/sdd-implement`. This replaces this spec's entire §7 "Server state" plan (a `leadsSlice.ts` with ~17 Redux Toolkit thunks calling real endpoints) with **plain local React state** (`useState`/`useReducer` in `app/[orgnization]/leads/page.tsx`) seeded from a new static data module, `lib/leads/demo-data.ts` (types + `DEMO_LEADS`, `DEMO_LEAD_STATUSES`, `DEMO_OWNERS`, `DEMO_ACTIVITIES`, `DEMO_NOTES`). No `lib/store/slices/leadsSlice.ts` was created, `lib/store/index.ts` was not touched, and `lib/constants.ts` gained no new `apiRoutes` entries — there is nothing to call yet. This was confirmed with the developer before proceeding (not assumed).
- Everything else matches the spec: routes (`app/[orgnization]/leads/page.tsx`, view switcher as `?view=list|kanban|analytics` in the URL, not local-only state), List/Kanban/Analytics views, lead create/edit form (`components/leads/lead-form-dialog.tsx`, react-hook-form + zod, no `OrbitOpsField*`), activity log + notes (`components/leads/lead-detail-sheet.tsx`), tags (`components/leads/tag-input.tsx`), bulk stage-change/assign/delete action bar.
- **Open Question 3 (lead detail: drawer vs. page) resolved**: slide-over `Sheet`, per the spec's own recommendation, confirmed with the developer.
- **Open Question 4 (drag-and-drop library) resolved**: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` added to `package.json`, confirmed with the developer before installing. `@dnd-kit/sortable` is installed but not actually imported anywhere — the Kanban board (`components/leads/kanban-board.tsx`) only needed `@dnd-kit/core`'s `DndContext`/`useDraggable`/`useDroppable`/`DragOverlay` for cross-column drag; no within-column reordering was built. Flagged as a small known-unused dependency, not removed in case within-column ordering is wanted later.
- **Open Questions 1, 2, 6 are moot** for this pass (they were about Redux-vs-react-query, server-vs-client pagination, and confirming `recharts` is a real dependency) — all three are only meaningful once real API calls exist. `recharts` was independently confirmed as a real `package.json` dependency (not just transitive) during implementation.
- **Open Question 5 (saved views/filter persistence)** was not built at all this pass — filters (search, stage, owner, priority, temperature) are plain component state, reset on navigation/refresh. No `localStorage` was used anywhere in this module.
- **Deviation not in the original spec**: `components/ui/data-table.tsx`'s `DataTableColumn.header` type was widened from `string` to `React.ReactNode` (one line, backward-compatible — existing string usages are unaffected) so the List view's selection column could put a "select all" `Checkbox` in the header. The spec's §2 plan to add server-controlled pagination props to this component was **not** done — with no API, `DataTable`'s existing client-side search/sort/paginate mode is used as-is, which is actually the right fit now that there's no backend to page against.
- **Known limitation**: the List view's "select all" checkbox selects across all rows matching the current filters, not just the rows visible on the current `DataTable` page (the component doesn't expose its internal paged subset to column render props). Minor UX rough edge, not a correctness bug — flagged for whoever wires this up against a real server-paginated list later.
- Stage colors in `lib/leads/demo-data.ts` are CSS variable references (`var(--chart-1)` etc., `var(--destructive)` for the Lost stage) rather than raw hex, keeping `.claude/rules/theming.md`'s "no raw colors" rule intact — the backend spec's `lead_statuses.color` is a free-text column, but this demo data controls its own values.
- A synthetic "Stage changed from X to Y" activity entry is logged automatically on every stage change (via the edit form or a Kanban drag), mirroring the backend spec's own `PATCH /leads/:id/stage` behavior described in `backend/specs/leads/leads-api.md`, so the activity timeline stays representative even without a real backend doing it.
- Verified: `npx tsc --noEmit` and `npx eslint` both show zero issues in every new/changed file (one real pre-implementation type error was caught and fixed — a `zodResolver`/`z.coerce.number()` + `.default()` combination in `lead-form-dialog.tsx`'s schema produced an unrelated-generic-types error; fixed by keeping the three numeric fields as plain strings in the form and parsing them to numbers where the `Lead` object is built in `page.tsx`, rather than coercing inside the zod schema). `next build`'s Turbopack compile step succeeded; its later type-check step fails only on the same pre-existing, unrelated issue already documented in `specs/auth/auth-flow.md` and `specs/navigation/sidebar-nav.md` (`app/page.tsx`'s `pricingPlansSlice` typing) — nothing in this feature's files. A dev server was started and `GET /testorg/leads` was fetched directly (this route isn't in `proxy.ts`'s protected-route list, so no login was needed) and returned real page content ("New Lead", "Track and manage your sales pipeline") with no error markers.
- **Not verified**: interactive browser testing (drag-and-drop feel, dialog/sheet open-close, chart rendering) — no browser/screenshot tool was available in this session, only an HTML fetch of the server-rendered shell. Follow-up: a manual pass in a real browser before this is considered done, matching the same known gap already on record in `auth-flow.md` and `sidebar-nav.md`.
- Follow-up when real API work starts: `lib/leads/demo-data.ts`'s field names already match `backend/specs/leads/leads-api.md`'s contract (`statusId`↔`status_id`, `assignedTo`↔`assigned_to`, `value`, `probability`, `temperature`, etc.), so swapping local `useState` for a real `leadsSlice.ts` (per this spec's original §7) should mostly mean replacing the `set*` calls in `app/[orgnization]/leads/page.tsx` with thunk dispatches, not reshaping the components.

## Change Request History
*(none yet)*
