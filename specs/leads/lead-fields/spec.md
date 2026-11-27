# Lead fields
**SRS section:** 5.1 · **Requirement IDs:** None; the SRS section has no IDs, so rows are named by item · **Priority:** Not set in the SRS · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/lead-fields/spec.md)
**Overall status in this project:** 🟡 (10 of 20 rows done, 10 partial; every field the SRS names is now on the form and readable on the screen — the 10 partials are each a named gap below, three of them waiting on another feature)

## Summary
The data held on each lead, as the Tenant Panel shows and edits it. Section 5.1 of the SRS is a table without requirement IDs, so rows are named by field. The lead form now carries every field the SRS names, with the rarely-used ones folded into a "More details" section and the organization's own fields drawn from its definitions. Lifecycle, source and channel are also toolbar filters and list columns. Used by Sales and marketing roles.

A lead no longer needs a name: any one of a name, an email or a mobile is enough, and a lead with none of the three names shows as "No name" wherever it appears.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| 5.1: First name, Last name | Text. At least one of name, email or mobile required; list shows "No name" when both are blank. | — | ✅ | `components/leads/lead-form-dialog.tsx` (`leadFormSchema`'s `superRefine`), `lib/leads/types.ts` (`leadDisplayName`, `hasNoName`, `NO_NAME`) | Full name is optional, with First and Last name under "More details". The form refuses a lead with no name, no email and no mobile before it is sent. "No name" is shown, greyed, in the list, the board card, the detail sheet, the delete confirmation and the duplicate warning — one helper decides it everywhere. |
| 5.1: Company name | Text. Tooltip on hover when truncated. | — | ✅ | `app/[orgnization]/leads/page.tsx` (the `full_name` and `company_name` columns), `components/shared/field-help.tsx` (`Truncated`), `components/leads/kanban-card.tsx` | The list and the detail sheet use the shared `Truncated`, so the full name is always in the tooltip; the board card truncates with a plain `title`. |
| 5.1: Email | Format validated; duplicate warning within tenant. | — | ✅ | `components/leads/lead-form-dialog.tsx`, `components/leads/duplicate-lead-dialog.tsx` | Format on the form; the duplicate warning is LD-A1, see [actions](../actions/spec.md). |
| 5.1: Mobile | Phone (E.164, country code). Click-to-call icon; duplicate warning within tenant. | — | 🟡 | `app/[orgnization]/leads/page.tsx` (the `mobile` column), `components/leads/lead-detail-sheet.tsx` | The number is a `tel:` link in the list and the detail sheet, with the coloured call icon beside it. Still free text with no country-code picker: a half-typed number is kept rather than refused, because refusing one while someone is on the phone is worse. |
| 5.1: Alternate phone, WhatsApp number | Phone. Optional. | — | 🟡 | `components/leads/lead-form-dialog.tsx` ("More details") | Alternate mobile is on the form and in the detail sheet, as a `tel:` link. No separate WhatsApp field — the help text says to put a WhatsApp-only number here, because the API has no third phone column. |
| 5.1: Lead status / stage | Required; defaults to first stage (Untouched). | — | 🟡 | `components/leads/lead-form-dialog.tsx` (`statusId`) | Required on the form and defaults to the board's first stage. The stage names come from the tenant's own pipeline, so an older organization's list still differs from the SRS's — deliberately, see the backend's pipelines spec. |
| 5.1: Lead source | Tenant-editable picklist. | — | ✅ | `components/leads/lead-settings-dialog.tsx`, the Source field on the form, the Source filter and column | A dropdown on the form, a toolbar filter, a list column, and a management tab for adding, renaming, switching off and removing entries. |
| 5.1: Lead owner | Defaults to creator; reassignable. | — | 🟡 | `components/leads/lead-form-dialog.tsx` (`assignedTo`) | Reassignable, and now clearable back to Unassigned. Still does not default to the creator on the form; the API does that only for a member whose scope is their own records. |
| 5.1: Pipeline | Pipeline, e.g. Buyer pipeline. | — | 🟡 | `components/leads/pipeline-selector.tsx`, the Pipeline block on the form | The board is chosen in the toolbar and shown on the form, so nobody has to guess which board a new lead joins. It is **not** editable from the form: a lead only moves board together with a stage from that board, which the API refuses otherwise. Moving a lead between boards therefore still has no screen of its own. |
| 5.1: Category tags | Multi-select tags; tenant-editable. | — | 🟡 | `components/leads/tag-input.tsx` | Free-text entry, reused by name. No managed list with its own screen, as source and channel now have. |
| 5.1: Lifecycle status | Active / Closed / Dead. Drives status filters. | — | ✅ | the Lifecycle column and filter in `app/[orgnization]/leads/page.tsx`, `lib/leads/types.ts` (`LIFECYCLE_LABEL`), `components/leads/lead-detail-sheet.tsx` | Shown as a badge on the row, the detail sheet and the form (where it follows the stage being chosen), and offered as a quick filter. Never editable, because the API reads it from the stage. |
| 5.1: Channel (CHL) | Picklist. Default channel filter in toolbar. | — | 🟡 | the Channel field, filter and column; `components/leads/lead-settings-dialog.tsx` | The field, the filter and the management tab are built. The filter opens on "All Channels" rather than a remembered default: SRS 5.4 puts a *default* channel filter in the toolbar, and nothing stores one. A saved view is how a member pins one today. |
| 5.1: Address, city, state, country, pincode | Text. Optional. | — | ✅ | "More details" on the form; the address line in the detail sheet; City / State / Country / Pincode columns | — |
| 5.1: Estimated value, expected close date | Currency, date. Optional; used for forecasting. | — | ✅ | the Deal Value and Expected close date fields, both columns, both sortable | — |
| 5.1: Next follow-up date and time | Drives Calendar view and reminders. | — | 🟡 | the Next follow-up field, column and detail line | The moment is set, shown and sortable. **Blocked:** no Calendar view and no reminder — the field's help text says so in as many words, so nobody sets it expecting to be reminded. |
| 5.1: Last call status | Enum (none / not answered / answered / follow-up). Drives coloured call indicator. | — | ✅ | the Mobile column's phone icon, `CALL_COLOR` in `app/[orgnization]/leads/page.tsx`, `CALL_DOT` in `components/leads/kanban-card.tsx`, the outcome picker in `components/leads/lead-detail-sheet.tsx` | Green answered, yellow a follow-up is pending, red not answered, grey never called — on the list row and the board card. Set by logging a call with its outcome, which is the only way the API accepts it. |
| 5.1: Campaign / ad reference | Link. Set automatically when lead comes from Ad Manager. | — | 🟡 | the read-only Campaign block on the form, the Campaign line in the detail sheet | Shown when a lead has one. Deliberately read-only: **blocked** on LD-A2's lead-form integrations, which are what would fill it in. |
| 5.1: Notes | Long text. Optional. | — | ✅ | the Description field, the detail sheet | — |
| 5.1: Custom fields | Tenant-defined: text, number, date, picklist, checkbox. | — | ✅ | `components/leads/lead-settings-dialog.tsx` (the Custom fields tab), the "Your organization's fields" block on the form, the detail sheet | All five types, rendered from the definitions: text and number inputs, a date picker, a dropdown of the choices, and a tick box. Required fields are marked and checked before the form submits. |
| 5.1: Created at / Updated at / Created by | System. Shown as timestamps in DD-MM-YYYY HH:mm. | — | 🟡 | the Created and Updated columns, the Created / Updated lines in the detail sheet | Both are shown as date and time in the detail sheet and as dates in the list. Created by is not shown anywhere: the API returns the id and the panel has no name for it. |

## Pending from the backend
Nothing. Every field, list and filter this screen uses is built in `crm_backend` (see its [lead-fields spec](../../../../crm_backend/specs/leads/lead-fields/spec.md) → API). Two behaviours wait on **other features**, not on this one:
- **Automatic campaign reference** — needs LD-A2's Meta / Google / WhatsApp lead forms. The column and the manual value exist; nothing fills them in.
- **Follow-up reminders and the Calendar view** — needs the Calendar / reminders feature (LD-V4, LD-D2). The field exists and nothing acts on it.
- **A remembered default channel filter** (SRS 5.4) would need somewhere to keep it. Saved views already carry one, so no new API was asked for.

## Decisions (2026-11-27)
Asked by Raj. Change them only through `/sdd-change`.

- **One helper decides every displayed name.** `leadDisplayName` falls back from `full_name` to the two parts to "No name", and `hasNoName` greys it. A lead with only a mobile number shows "No name" beside that number, never the number in the name's place.
- **"More details" folds away the fields most leads do not need** — the two name parts, the alternate number, the address, and the two read-only blocks. It opens by itself when something inside it fails validation, so an error is never hidden behind a collapsed section.
- **The pipeline is shown on the form, not editable there.** The API refuses a board change without a stage from that board, so an editable dropdown here would produce a refusal the member could do nothing about.
- **Lifecycle, the campaign and the last call status are read-only everywhere.** Each is derived or set elsewhere, so offering it as a field would promise something the API would not do.
- **The organization's own fields are checked before the form submits**, against the definitions, so a required one or a non-number reads as a field error rather than a toast after a round trip.
- **The form only closes once the API has accepted the lead.** It used to close on submit, which threw away everything typed whenever a create was refused — the plan's lead limit, and now a duplicate.
- **A lead is re-read on its own before its form or its sheet opens.** A list row does not carry the values of the organization's own fields, so a form built from a row would show them empty and save them empty. If that read fails, the form opens from the row and leaves those fields out of the save entirely.
- **A retired source or channel stays in the dropdown while a lead carries it**, marked "(switched off)", so editing that lead's other fields does not quietly change where it came from.
- **Removing is separate from switching off,** in both management tabs, with different wording and different warnings: switching off keeps the entry on the leads that have it, removing is refused while any lead does.

## Screens and routes
Everything lives on `/{org}/leads`. No new page route.

| Where | What |
|---|---|
| Toolbar | **Lead settings** button (`leads.pipeline.manage`), opening the sources / channels / custom fields dialog. New quick filters: Lifecycle, Channel, Source. |
| Add / Edit Lead dialog | Every 5.1 field, "More details", and the organization's own fields. |
| List columns | `lifecycle`, `source`, `channel`, `expected_close_date`, `next_followup_at`, `last_call_status`, `city`, `state`, `country`, `pincode` — keys matching the API's own column catalog, so a saved column choice means the same on both sides. The Mobile column became a `tel:` link with the coloured call icon. |
| Detail sheet | Source, channel, lifecycle, the address, the expected close date, the next follow-up, the last call, the campaign, created and updated times, and the organization's own fields. |
| Board card | "No name", a truncated company name with its tooltip, and the coloured call dot beside the temperature dot. |

## State
`lib/store/slices/leadsSlice.ts` gained `sources`, `channels`, `customFields`, `picklistsLoading` and `picklistsError`, with thunks for all three lists (one pair of helpers builds the source and channel thunks, since the two are identical). The Leads screen loads the switched-on entries once; the settings dialog asks for the switched-off ones itself.

`initialState` also gained the `pipelines` keys it had been missing, which the pipeline selector was reading as `undefined` on its first render.

## Testing
**No tests were written or run for this work, by instruction** (2026-11-27). `npm run lint` and `tsc` were not run either, also by instruction.

What has never been exercised: the lead form end to end (it is the most changed file), every custom field type's input, the "No name" fallback, the re-read before an edit and the fallback when that read fails, and the two management tabs' refusals.

## Out-of-SRS behaviour
- "More details" as a collapsible section. The SRS lists fields, not a layout.
- `(switched off)` beside a retired picklist entry a lead still carries.
- Lifecycle shown on the form as the stage is chosen, before the lead is saved.
- The key suggested from the label when a custom field is added.
- Created and updated times in the detail sheet; the SRS asks only that they be shown.

## Change Request History
- 2026-11-27: SRS 5.1 built out in the panel. Source, channel, address, expected close date, next follow-up and the organization's own fields on the lead form; lifecycle, source and channel as filters and columns; the coloured call indicator and `tel:` links; "No name" everywhere a lead is named; the Lead settings dialog for sources, channels and custom fields. No tests, lint or type-check run, by Raj's instruction. Asked by Raj.
