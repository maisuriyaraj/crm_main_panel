# Lead actions
**SRS section:** 5.5 · **Requirement IDs:** LD-A1, LD-A2, LD-A3, LD-A4, LD-A5, LD-A6, LD-A7 · **Priority:** Must 5, Should 2 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/actions/spec.md)
**Overall status in this project:** 🟡 (3 of 7 requirements implemented)

## Summary
Adding, editing, deleting, importing and calling leads. Add, edit and delete work; the duplicate warning and the 30-day restore were built on 2026-11-27, and Convert to client on 2026-11-28. Import and social leads do not exist in this panel. Used by Sales Executive, Sales Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-A1 | "+ Add Lead" form with validation and duplicate check; duplicates show the matching record with options to open it or create anyway. | Must | ✅ | `components/leads/duplicate-lead-dialog.tsx`, `createLead` in `app/[orgnization]/leads/page.tsx`, `components/leads/lead-form-dialog.tsx` | Submitting a new lead that matches an existing one opens a warning naming each match it may show, with **Open it** per match and **Add it anyway** for the lot. "Add it anyway" resends exactly the same body with `confirm_duplicate`. A match the member's role hides is reported as existing, with nothing identifying it, which is all the API sends. Validation also follows the new "any one of name, email or mobile" rule (see [lead-fields](../lead-fields/spec.md)). |
| LD-A2 | "Create Social Leads" pulls leads from connected Meta / Google / WhatsApp lead forms (see 9.2). | Should | ❌ | — | No Create Social Leads action. It is also what would fill in a lead's campaign reference, which is why that field is read-only. |
| LD-A3 | Edit (pencil) and delete (trash) per lead; delete asks for confirmation and is a soft delete restorable for 30 days. | Must | ✅ | the Deleted tab, `components/leads/deleted-leads-view.tsx`, the delete confirmations in `app/[orgnization]/leads/page.tsx` | The confirmation now says the lead can be restored for 30 days instead of saying it cannot be undone, and the toast says where. The **Deleted** tab (shown only with `leads.delete`) lists the deleted leads of the board with the date each can be restored until and how many days are left, and a Restore button. Past the window the button is disabled with a tooltip saying why. |
| LD-A4 | Bulk actions on selected leads: assign owner, change stage, change status, add/remove tags, export, delete. | Must | 🟡 | `handleBulkStageChange`, `handleBulkAssign`, `handleBulkDelete`, `ExportButton` | Stage, owner, delete and export. A bulk delete now promises the same 30 days as a single one. Still no bulk tags and no bulk "status" separate from the stage. |
| LD-A5 | Import leads from CSV/Excel with column mapping, duplicate handling (skip, update, create) and an error report. | Must | ❌ | — | No import screen, and no import API to build one against. |
| LD-A6 | Quick call: phone icon opens the dialler (tel: link, or integrated telephony later); after a call the user logs an outcome. The icon is colour-coded: green = answered / connected, yellow = follow-up pending, red = not answered or missed follow-up, grey = never called. | Must | 🟡 | the Mobile column, `CALL_COLOR` in `app/[orgnization]/leads/page.tsx`, `CALL_DOT` in `components/leads/kanban-card.tsx`, the outcome picker in `components/leads/lead-detail-sheet.tsx` | The `tel:` link, the four colours and logging the outcome are all built: picking "call" in the detail sheet's activity box reveals an outcome dropdown, and that is what sets the lead's last call status. **Not built:** the red "missed follow-up" case — the colour follows the last call's outcome alone, and nothing works out that a follow-up date has passed, because nothing watches follow-up dates yet (see Blocked). Integrated telephony does not exist. |
| LD-A7 | Convert a lead into a Billing client (pre-fills client details). | Should | ✅ | the **Convert to client** button in `components/leads/lead-detail-sheet.tsx`, `handleConvertLeadToClient` and `canConvertToClient` in `app/[orgnization]/leads/page.tsx`, `reqToConvertLeadToClient` in `lib/store/slices/billingClientsSlice.ts`, the wording in `lib/clients/types.ts` | Built 2026-11-28 with the Clients screens; see [billing/clients](../../billing/clients/spec.md). The lead detail sheet has **Convert to client** beside Convert to Contact — a contact is a person in the CRM, a client is who an invoice is addressed to, and a lead can become both. It needs `leads.view` + `clients.manage`, which `/auth/me` drops while billing is off, so the button is simply absent then. It sends an empty body (the API pre-fills from the lead), disables itself with a spinner while the request runs so it cannot be pressed twice, then opens the new client. A lead already converted shows what it became and opens that client. **Not type-checked, not linted, not opened in a browser.** |

## Pending from the backend
Nothing for LD-A1 and LD-A3: both are built in `crm_backend` (see its [actions spec](../../../../crm_backend/specs/leads/actions/spec.md) → API) and this panel uses every route and code they added.

Still missing from the backend for the rest of 5.5:
- **LD-A5** — no import route or background job, so there is nothing for an import screen to call.
- **LD-A4's bulk tags** — the bulk edit takes tags already; the panel has no control for them. That is this project's gap, not the backend's.
- **LD-A7** — **nothing is missing, and the panel half is built.** `POST /leads/:id/convert-to-client` (`leads.view` + `clients.manage`, and both `crm_enabled` and `billing_enabled`) pre-fills the client from the lead, so the panel sends an empty body. The Convert to client button, its error wording and the jump to the new client all use it; see [billing/clients](../../billing/clients/spec.md) for the screens it lands on.

## Blocked on another feature
- **LD-A2 (social lead forms)** — until it exists nothing fills in a lead's campaign reference, so that field stays read-only.
- **Calendar / reminders (LD-V4, LD-D2)** — the "missed follow-up" red on the call icon needs something that knows a follow-up is overdue. Today the colour is the last call's outcome only.
- **Integrated telephony** — not scoped anywhere; the `tel:` link is the whole of LD-A6's dialler.

## Decisions (2026-11-27)
Asked by Raj. Change them only through `/sdd-change`.

### The duplicate warning (LD-A1)
- **The form asks by submitting.** The check is not run while someone types: a warning that appears mid-typing on a half-entered number is noise, and the API runs the check again on create anyway. So the 409 is what opens the warning. The dedicated check route exists and is unused by this panel for that reason.
- **The form stays open behind the warning.** It used to close on submit; now the caller closes it only once the API has taken the lead, so going back from the warning leaves everything as it was typed.
- **"Add it anyway" resends the same body** with `confirm_duplicate: true` through the same function as the first attempt, so there is no second code path that could drift.
- **"Open it" leaves the form.** When the match is on the loaded page the sheet opens straight away; otherwise the filters are cleared and `?lead=<id>` is set, which the screen's existing deep-link handler picks up.
- **A hidden match is described as a count and nothing else.** The API deliberately sends no name, owner or id for a match outside the member's record scope, so the dialog says a matching lead exists and that their role does not let them open it — and "add it anyway" is then the only way forward, which is correct.

### Restore (LD-A3)
- **A tab, not a page.** The Deleted leads list is a fourth tab beside List, Kanban and Analytics, because it is the same records read the other way round and the board selector above it still applies.
- **Shown only with `leads.delete`,** which is the permission the API gates both the list and the restore on. Undoing a delete is the same decision as making one.
- **It reads its own list.** The tab fetches `include_deleted=true&status=deleted` itself with its own paging rather than going through the shared list contract: it has no column chooser, no saved views and no bulk actions, so a second list key would buy nothing.
- **Both the deadline and the days left are shown.** A date alone makes the member count; "4 days left" alone hides which date.
- **Past the deadline the button is disabled, with the reason in a tooltip,** rather than hidden or left clickable. A missing button looks like a bug; a clickable one would be refused.
- **A refused restore reloads the list.** The window can close while the tab is open, so the row is re-read rather than left promising a button that no longer works.
- **No bulk restore.** Nothing in the SRS asks for one, and the API has no bulk route for it.

### Delete wording
- Every delete confirmation and toast now names the 30 days and says where to undo it. The old copy said the delete could not be undone, which was already untrue (it was a soft delete) and is now plainly wrong.

## Screens and routes
| Where | What |
|---|---|
| `/{org}/leads` toolbar | Unchanged, plus the Lead settings button (see [lead-fields](../lead-fields/spec.md)). |
| `/{org}/leads?view=deleted` | The Deleted leads tab: name, company, email, mobile, restore-until, days left, Restore. |
| Add Lead dialog | On a 409 `DUPLICATE_LEAD`, the duplicate warning opens over it. |
| Row and bulk delete confirmations | Reworded for the 30-day window. |
| Detail sheet, activity box | An outcome dropdown when the activity is a call. |

## Error codes shown in plain words
Added to `API_ERROR_MESSAGES` in `lib/auth/errors.ts`, so no raw server message reaches a screen: `DUPLICATE_LEAD`, `RESTORE_PERIOD_OVER`, `SOURCE_IN_USE`, `CHANNEL_IN_USE`, `NAME_TAKEN`, `FIELD_KEY_TAKEN`, `UNKNOWN_CUSTOM_FIELD`. `SOURCE_IN_USE` and `CHANNEL_IN_USE` are also caught in the settings dialog, which keeps the sentence on screen next to the list instead of in a toast that disappears.

## State
`lib/store/slices/leadsSlice.ts` gained `reqToRestoreLead` and `reqToCheckLeadDuplicates`. The duplicate check stores nothing: its answer belongs to the one form that asked.

## Testing
**No tests were written or run for this work, by instruction** (2026-11-27). `npm run lint` and `tsc` were not run either, also by instruction.

What has never been exercised: the duplicate warning's three ways out (open, add anyway, go back), the deep link when the match is not on the loaded page, the Deleted tab's paging, a restore refused because the window closed, and a restore refused because the plan is full.

## Out-of-SRS behaviour
- Convert to Contact (`handleConvertLead`) and the Contacts screens are not in the SRS.
- Days left beside each restore deadline.
- The disabled Restore button with its explanation, rather than no button.
- Clearing the filters when opening a duplicate match that is not on the loaded page.

## Change Request History
- 2026-11-28: LD-A7 built in the panel. Convert to client on the lead detail sheet, with the busy state, the plain-words error handling and the jump to the new client. The Clients screens it lands on are in [billing/clients](../../billing/clients/spec.md). No tests, lint or type-check run, by Raj's instruction. Asked by Raj.
- 2026-11-27: LD-A1 and LD-A3 built in the panel. The duplicate warning with Open it / Add it anyway and the hidden-match case; the Deleted leads tab with restore deadlines and a Restore button; delete confirmations reworded for the 30-day window; LD-A6's call outcome and coloured call indicator. No tests, lint or type-check run, by Raj's instruction. Asked by Raj.
