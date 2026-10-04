# 05 — Frontend: main-panel

> Part of the Contacts doc set. The index and the other five documents are in
> `backend/docs/modules/contacts/` — start at its `README.md`.

`main-panel` is the tenant-facing app and the only UI for Contacts.

## Routes

| Path | Page component | Permission required |
|---|---|---|
| `/{orgSlug}/contacts` | `main-panel/app/[orgnization]/contacts/page.tsx` | any authenticated org user; admin-only controls gated in-page |
| `/{orgSlug}/leads` | `main-panel/app/[orgnization]/leads/page.tsx` | any authenticated org user; admin-only controls gated in-page |
| `/{orgSlug}/dashboard` | `main-panel/app/[orgnization]/dashboard/page.tsx` | any authenticated org user |
| `/{orgSlug}/settings/team` | `main-panel/app/[orgnization]/settings/team/page.tsx` | nav group restricted to `org_admin` (`main-panel/components/layout/app-sidebar.tsx:100`) |

The org segment directory is spelled **`[orgnization]`** — missing the second `a`. That is the
real directory name and the real param name. See `07-gotchas.md` #10.

The sidebar entry and route constant predate the page
(`main-panel/components/layout/app-sidebar.tsx:75`, `main-panel/lib/constants.ts:12`); adding
the page is what made the existing link resolve, so **no sidebar change was needed**. Nine
sibling destinations still 404 — Companies, Deals, Tasks (`:76-78`) and the whole Growth group
(`:84-95`).

## Screen by screen — Contacts

Root: `main-panel/app/[orgnization]/contacts/page.tsx`.

### Data loading — server-side, unlike Leads

Every filter is sent to the API. The page holds `search`, `ownerFilter` and `page` in state,
assembles a `ContactListQuery`, and refetches whenever it changes. Search is debounced 350ms
and resets to page 1. Page size is 20; the server clamps any `limit` above 100.

This is the deliberate opposite of the Leads screen, which fetches 1000 rows once and filters
in the browser (`07-gotchas.md` #11).

| Trigger | Thunk | Endpoint |
|---|---|---|
| Mount, and any filter/page change | `reqToGetContacts` | `GET /api/contacts` |
| Mount | `reqToGetOrgUsers` | `GET /api/app/users` |
| Detail sheet opened | `reqToGetContactNotes` | `GET /api/contacts/:id/notes` |

### Actions

| Action | Thunk | Gated |
|---|---|---|
| Create / edit | `reqToCreateContact`, `reqToUpdateContact` | no |
| Delete | `reqToDeleteContact` | `isAdmin` — control hidden |
| Bulk delete / reassign | `reqToBulkDeleteContacts`, `reqToBulkUpdateContacts` | `isAdmin` — bulk bar hidden |
| Add / edit / delete note | `reqToCreateContactNote`, `reqToUpdateContactNote`, `reqToDeleteContactNote` | note controls shown only to the author or an admin |

Admin detection is `role === "org_admin"` from `useAuth`, matching the Leads screen. Row
selection is page-scoped and clears whenever the visible rows change.

### Empty states

Three distinct states, unlike the Leads screen's one: loading skeletons; "No contacts yet" with
an add action; and "No contacts match these filters" with a clear-filters action.

## The form

`main-panel/components/contacts/contact-form-dialog.tsx`, one dialog for create and edit.

`contactFormSchema` mirrors the server's rules **including the length caps** — the Leads form
omits them and lets the server fail (`07-gotchas.md` #8). `fullName` is required and capped at
255; names at 100; mobile fields at 50; company, designation and website at 255.

### Server errors are attached to fields

`onSubmit` returns a `Promise<boolean>`. The dialog **stays open on false**, so a rejected write
does not lose what the user typed.

- A `400` carries `errors: [{field, message}]`; `mapApiErrorsToForm`
  (`main-panel/lib/contacts/mappers.ts`) translates the snake_case API field name to the form
  field name and the page hands them to `form.setError`.
- A `409` duplicate email is attached to the email input specifically.
- Anything else becomes a toast via `notify`.

This is only possible because the Contacts API returns structured `400`s. The Leads API's
flat `500` cannot be mapped to a field (`07-gotchas.md` #3).

## Convert from a lead

`main-panel/components/leads/lead-detail-sheet.tsx` gained an optional `onConvert` prop and a
"Convert to Contact" button, wired from the leads page to `reqToConvertLead`. When
`lead.convertedContactId` is set the button is replaced by a disabled "Already a contact".

`Lead.convertedContactId` was added to `main-panel/lib/leads/types.ts` and
`main-panel/lib/leads/mappers.ts:44`.

## State and caching

Redux Toolkit, slice at `main-panel/lib/store/slices/contactsSlice.ts` (12 thunks), registered
as `contacts` in `main-panel/lib/store/index.ts`.

Same manual pattern as leads — there is no RTK Query in this project — but `refreshContacts()`
refetches **the current page with the current filters**, not 1000 rows. It is called from the
`onSuccess` of every mutation.

---

# Context: the Leads screen

## Screen by screen — Leads

The pattern a Contacts screen would follow. Root: `main-panel/app/[orgnization]/leads/page.tsx`
(644 lines).

### View modes

Three, selected by a `view` query param written with `router.replace`
(`main-panel/app/[orgnization]/leads/page.tsx:109-113`) so the choice survives a reload and
back-button:

| View | Component | Shows |
|---|---|---|
| list | in-page table | Row per lead, checkbox selection, bulk action bar |
| kanban | `main-panel/components/leads/kanban-board.tsx` (139 lines) | Column per stage, `main-panel/components/leads/kanban-card.tsx` per lead, drag to change stage |
| analytics | `main-panel/components/leads/lead-analytics.tsx` (165 lines) | Aggregates computed client-side from the already-loaded array |

### Data loading

On mount (`main-panel/app/[orgnization]/leads/page.tsx:119-124`), three dispatches fire:

| Thunk | Endpoint |
|---|---|
| `reqToGetLeads` with `{limit: 1000}` | `GET /api/leads` |
| `reqToGetLeadStatuses` | `GET /api/leads/statuses` |
| `reqToGetOrgUsers` | `GET /api/app/users` (for the owner dropdown) |

`LEADS_FETCH_LIMIT = 1000` is declared at
`main-panel/app/[orgnization]/leads/page.tsx:72`.

**All filtering and searching is client-side.** `filteredLeads`
(`main-panel/app/[orgnization]/leads/page.tsx:132-` onward) filters the loaded array on
`statusId`, `assignedTo`, priority, temperature and search text. The backend supports every one
of these as a query param (`02-api-reference.md`, `GET /leads`) and **none of them are used**.
Pagination is likewise never requested. This is the single most important behaviour to know
about this screen — see `07-gotchas.md` #11.

Opening the detail sheet triggers two more fetches, keyed on the selected lead
(`main-panel/app/[orgnization]/leads/page.tsx:126-130`): activities with `limit: 100`, and
notes.

### Actions and the endpoints they fire

| Action | Thunk | Endpoint | Gated |
|---|---|---|---|
| Create lead | `reqToCreateLead` | `POST /api/leads` | no |
| Edit lead | `reqToUpdateLead` | `PATCH /api/leads/:id` | no |
| Drag card between columns | `reqToChangeLeadStage` | `PATCH /api/leads/:id/stage` | no |
| Delete lead | `reqToDeleteLead` | `DELETE /api/leads/:id` | `isAdmin` (`:441`) |
| Bulk delete | `reqToBulkDeleteLeads` | `DELETE /api/leads/bulk` | `isAdmin` (`:553`) |
| Bulk stage / owner change | `reqToBulkUpdateLeads` | `PATCH /api/leads/bulk` | `isAdmin` (`:553`) |
| Add activity | `reqToAddLeadActivity` | `POST /api/leads/:id/activities` | no |
| Add / edit / delete note | `reqToCreateLeadNote`, `reqToUpdateLeadNote`, `reqToDeleteLeadNote` | `/api/leads/notes` paths | no |

Admin detection is `role === "org_admin"`
(`main-panel/app/[orgnization]/leads/page.tsx:81-82`), from the `useAuth` hook. Non-admins get
**hidden controls**, not disabled ones — the bulk action bar and delete control are not
rendered at all. The server independently rejects these calls (`03-business-rules.md` R-24), so
this is defence in depth rather than the only barrier.

## The form

`main-panel/components/leads/lead-form-dialog.tsx` (408 lines), one dialog for both create and
edit, mode chosen by a `formMode` state
(`main-panel/app/[orgnization]/leads/page.tsx:107`).

Client validation — `leadFormSchema`, `main-panel/components/leads/lead-form-dialog.tsx:37-52`:

| Field | Client rule | Server rule |
|---|---|---|
| `fullName` | `z.string().min(1, "Full name is required")` | required, max 255 — **agrees** |
| `statusId` | `z.string().min(1, "Stage is required")` | **optional and nullable — disagrees** |
| `email` | `z.string().email("Enter a valid email").optional().or(z.literal(""))` | valid email, optional, nullable; `""` would be rejected but the mapper converts it to `undefined` first |
| `companyName`, `mobile`, `designation`, `website`, `description` | `z.string().optional()` — **no length caps** | max 255 (50 for mobile) — a 300-char company name passes the client and fails the server |
| `priority` | `z.enum(["low","medium","high","urgent"])` | same enum |
| `temperature` | `z.enum(["cold","warm","hot"])` | same enum |
| `assignedTo` | `z.string().optional()` | `idField`, optional, nullable |
| `value`, `probability`, `leadScore` | `z.string().optional()` — **free text** | numbers with range rules |
| `tags` | `z.array(z.string())` | array of trimmed strings, 1–255 each |

The three numeric fields are strings in the form and are coerced by `toNumber`
(`main-panel/lib/leads/mappers.ts:96-112`). A non-numeric entry becomes `undefined` and is
dropped from the payload **silently** — no client error, and the field simply does not change.

### Server errors

Each thunk catches and reduces the error to a single string:
`error?.response?.data?.message || "Failed to create lead"`
(`main-panel/lib/store/slices/leadsSlice.ts:120-123`, and the same shape in all 18 thunks).
That string is surfaced as a toast via the `onFailure` callback.

Consequences:
- **Field-level server errors cannot be shown.** The API returns a flat
  `{message, status: false}` with no field key (`02-api-reference.md`), so there is nothing to
  attach to an input.
- Because validation failures arrive as **HTTP 500 with a stringified Zod issue array** as the
  message (`07-gotchas.md` #3), a user who trips a server-only rule — say a 300-character
  company name — sees a raw JSON blob in a toast.

## State and caching

Redux Toolkit. Store at `main-panel/lib/store/index.ts`, leads slice at
`main-panel/lib/store/slices/leadsSlice.ts` (613 lines, 18 thunks).

`LeadsState` (`main-panel/lib/store/slices/leadsSlice.ts:19-34`) holds `leads`, `pagination`,
`isLoading`, `error`, `statuses`, `statusesLoading`, `statusesError`, `activeLeadActivities`,
`activitiesLoading`, `activeLeadNotes`, `notesLoading`.

**There is no cache-invalidation layer.** No RTK Query, no tag invalidation. Every mutation
re-runs the full list fetch by hand:

```
const refreshLeads = () => {
  dispatch(reqToGetLeads({ data: { limit: LEADS_FETCH_LIMIT } }));
};
```
(`main-panel/app/[orgnization]/leads/page.tsx:115-117`)

`refreshLeads` is called from the `onSuccess` callback of each mutation. Every create, edit,
delete, stage change and bulk action therefore refetches **up to 1000 leads**. The thunks
themselves do not update the store optimistically; the UI does not change until the refetch
lands.

The thunk signature is uniform and non-standard: each takes
`{ data, onSuccess, onFailure }` and invokes the callbacks itself
(e.g. `main-panel/lib/store/slices/leadsSlice.ts:61-78`). Follow it for consistency rather than
reaching for the idiomatic `unwrap()`.

## Transport

`main-panel/lib/axios/index.ts`. Base URL is **hardcoded** to `http://localhost:5000`
(`main-panel/lib/axios/index.ts:5-8`) — no environment variable. See `07-gotchas.md` #12.

The access token is held in a module variable mirrored into `localStorage` under the key
`accessToken` (`main-panel/lib/axios/tokenStore.ts:3`, `:6`, `:13`) and attached as a Bearer
header by a request interceptor (`main-panel/lib/axios/index.ts:10-16`).

A response interceptor retries once on `401`, de-duplicating concurrent refreshes through a
shared `refreshPromise` (`main-panel/lib/axios/index.ts:20-35`, `:37-65`). On refresh failure
it clears the token and hard-navigates to the sign-in page (`:59-62`).

## Wire-shape mapping

The backend speaks `snake_case` with numeric BIGINT ids; this app uses `camelCase` with string
ids. `main-panel/lib/leads/mappers.ts` is the only boundary where that is translated —
`mapLeadFromApi` (`:27`), `mapLeadStatusFromApi` (`:48`), `mapLeadActivityFromApi`,
`mapLeadNoteFromApi` (`:67`), and `mapLeadPayloadToApi` (`:96`) for outgoing writes.

**Four columns the API returns are dropped by the mapper** and are unreachable from any
component: `first_name`, `last_name`, `alternate_mobile`, `expected_budget`. Compare
`mapLeadFromApi` (`main-panel/lib/leads/mappers.ts:27-45`) against the column list in
`01-data-model.md`. See `07-gotchas.md` #5.

`tags` is flattened from an array of row objects to an array of strings
(`main-panel/lib/leads/mappers.ts:43`), and `createdBy` on a note is read from **`uploaded_by`**
(`:67-73`) — the column-name mismatch documented in `07-gotchas.md` #4.

## Fallback data

`main-panel/lib/leads/fallback-data.ts` (25 lines) provides placeholder stages with ids like
`fallback-contacted` (`:16`) used when the statuses request fails or returns empty. These ids
are **not real status ids**; a mutation attempted against one will fail server-side with
`400 "Invalid status_id for this organization"`.

## Panel-specific quirks

Everything in this document is main-panel-specific, because `mst_admin` has no contacts or
leads code at all (`mst_admin/docs/modules/contacts/04-frontend-mst_admin.md`). There are no
cross-panel divergences to reconcile — there is only one panel in play.

The divergences that matter are between the **Contacts and Leads screens inside this panel**:
server-side vs client-side filtering, field-level vs toast-only error handling, and length caps
present vs absent in the form. All three are listed in `07-gotchas.md` #19. Contacts is the
intended direction.
