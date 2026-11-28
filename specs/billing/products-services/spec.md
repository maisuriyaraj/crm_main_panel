# Products and services tab
**SRS section:** 7.8 · **Requirement IDs:** BI-PR1, BI-PR2 · **Priority:** Must 2 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/products-services/spec.md)
**Overall status in this project:** 🟡 (1 of 2 requirements implemented; BI-PR2's "hidden from new invoices" half is built, its "stays on old invoices" half waits on the invoice screens)

## Summary
The price list this organization invoices from: every item it sells, with its code, price, unit, default tax rate and HSN/SAC code, and whether it is still in use. One page with search, a status filter, a unit filter and an active/inactive toggle, and one form carrying every field SRS 7.8 names.

This is the **management** screen, so it shows active and inactive items together with a badge on each. An item is never deleted, so a tenant has to be able to find a retired one and bring it back. The API's own default is active items only — that is the filter a future invoice item-picker sends, not what this tab shows.

**Nothing can be invoiced yet**, which the page says once at the top, together with what the catalogue is actually for: once invoicing exists, an item fills in an invoice line in one click, and the invoice keeps its own copy of what was sold, so editing an item here never changes an invoice already sent.

Used by Accountant, Tenant Admin; read by Sales Manager and Viewer.

Built 2026-11-28, against the backend built the same day.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

**No tests were written or run for this work, by Raj's instruction, and `tsc` and `eslint` were not run either.** Nothing here has been opened in a browser or exercised against a running API. What was done is reading the backend's own spec for every field name, status code and error code, and writing the screens against it; and checking that every imported symbol exists in this repo.

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-PR1 | Catalogue fields: name, SKU/item code, description, unit price, unit (Pieces, Hours, Days, Months), tax rate, HSN/SAC code, Active/Inactive. | Must | ✅ | `app/[orgnization]/settings/billing-products/page.tsx`, `components/billing/product-form-dialog.tsx`, `components/billing/product-sku-conflict-dialog.tsx`, `lib/products/types.ts`, `lib/products/mappers.ts`, `lib/store/slices/billingProductsSlice.ts`, nav entries in `lib/navigation.ts`, routes in `lib/constants.ts` | Every field is on the form and every one is shown in the list. One search box across name, code and description; filters on status and unit; server paging and sorting by name, code and price. The tax rate is picked from the organization's own rates (Invoice settings), with "No tax on this item" as a real choice. **Make inactive**, not Delete. Not type-checked, not linted, not opened in a browser. |
| BI-PR2 | Inactive items are hidden from new invoices but stay on old ones. | Must | 🟡 | The status toggle and its confirmation in `page.tsx`; the "This is your price list for invoices" notice; no delete control anywhere | **"Hidden from new invoices" is as built as this project can make it:** there is no delete, the toggle is the only way an item leaves the list, and the confirmation says in plain words that the item stops being offered on new invoices while every invoice it is already on keeps it exactly as it was, including its name, price and tax at the time. The screen that would actually *hide* it — an invoice item-picker — does not exist, so nothing here demonstrates the hiding; the backend's active-only list default is what will do it. **"Stays on old invoices" cannot be shown at all:** there are no invoices in this project to show an item still sitting on. Blocked; see below. |

## Pending from the backend
**Nothing.** Every route, field and error code this feature needed exists and is used: the list with its `status`/`unit`/`search` filters, create, edit and the status toggle, plus `GET /app/billing-settings/tax-rates` for the form's rate picker. See the backend's [products spec](../../../../crm_backend/specs/billing/products-services/spec.md) → API.

Two things the API offers that no screen uses yet, and why:
- **`GET /app/billing/products/:id`** (`reqToGetProduct` in the slice) — there is no item page. A row opens the edit form, filled from the row already in the list, which carries every field including the resolved tax rate. The thunk is there for the invoice feature, which will need one item with its `invoice_line_defaults`.
- **`invoice_line_defaults`** on the detail read — mapped (`ProductInvoiceLineDefaults`) and displayed nowhere. It is the snapshot an invoice line must copy, and there is no invoice line to copy it into.

## Blocked on another feature
**BI-PR2's "stays on old invoices" half** waits on the **invoice CRUD feature** (SRS 7.3, `../create-edit-invoice/spec.md`), which exists in neither project. This project cannot show an item staying on an old invoice while there are no invoices and no invoice lines.

What that feature must do on this side, so the promise this screen's confirmation dialog makes is actually kept:
- **The item-picker on an invoice line calls `GET /app/billing/products` with no `status`,** which is active only. It must not reuse this page's `?status=all`.
- **The line stores what it copied, and renders from its own copy** — name, unit price, unit, tax rate *value* and HSN/SAC — never re-reading the product to display or total a line. `ProductInvoiceLineDefaults` in `lib/products/types.ts` is that shape; `mapProductDetailFromApi` already maps it.
- **A line already on an invoice is never re-resolved against the catalogue**, so renaming, repricing or deactivating an item leaves every issued invoice reading exactly as it was sent. This is the rule, written out in full as Decisions 7–8 of the backend spec, and it is the thing to test first.
- **Deactivating an item then raising a new invoice** is the one flow that proves BI-PR2 end to end, and it cannot be run until there is an invoice form.

## Decisions (2026-11-28)
Asked by Raj before the work, or settled while building. Change them only through `/sdd-change`.

- **One route, in the Billing area:** `/{org}/settings/billing-products`, beside `/settings/billing-clients` (whom the organization invoices) and `/settings/billing-settings` (how its invoices will look). Deliberately not under `/settings/billing`, which is the invoices OrbitOps sends *this* organization — four different things that would read as one if they shared a path.
- **No item page, and no side sheet.** A product is a handful of fields with nothing hanging off it: no timeline, no related records, and (until invoices exist) no history. Everything there is to do with one is edit it, so a row opens the form. A page would be an empty frame around six fields. This is the one place this feature deliberately differs from clients, which get a page because BI-CL2 will fill it with invoices and payments.
- **The list shows active and inactive together by default** (`?status=all`), with a badge per row and an "Active only / Inactive only" filter. Asked for explicitly: this is the management screen, nothing is ever deleted, and a default that hid the retired items would make reactivating one impossible to discover. The API's active-only default belongs to the invoice picker.
- **`products.view` gates the screen, `products.manage` every control.** `/auth/me` drops both keys while `billing_enabled` is off for the organization, so one `can()` check covers the plan, the flag and the role, and the page fires no request without it — a typed-in URL costs nothing. A reader without `products.manage` sees "You can look, but not change" and gets no New item button, no Edit, no toggle and no row click, as the clients screen does.
- **The list is not on the shared list contract**, because the API's is not: no record scope, so no `useServerList`, no column chooser, no saved views. It still uses `ServerList` for the table, the pager and the empty state, and maps the API's `pagination` and `meta.empty_state` through `lib/lists/types`, so page sizes and the "1–10 of 46" line are the shared ones rather than a second set.
- **"No tax on this item" is an option, not an empty box.** Some items genuinely carry no tax, and a blank select would read as "not filled in yet". `NO_TAX_RATE` is the sentinel the Select holds (a Radix Select cannot hold an empty value) and the mapper turns it back into the `null` the API reads as "no tax".
- **The rate picker offers active rates only**, because the API refuses an inactive one (409 `TAX_RATE_INACTIVE`). **An item being edited keeps a rate that has since been turned off,** which stays selectable and is labelled "— turned off", so saving an unrelated field cannot silently change an item's tax. Those items are also flagged in the list's Tax column and called out in one alert above it, with a link to Invoice settings. A rate turned off is a thing the tenant did and should see the consequences of, not something to hide.
- **A price is typed in major units and sent in minor ones** (`priceToMinor`), in the organization's business currency, which the API sends with the list (`meta.currency`). **Empty is read as 0, not refused**: an item can be added before its price is decided, and a free line is a real line. Unlike a client's credit limit, there is no null case — an item always has a price.
- **HSN/SAC gets no client-side format check** beyond its 20-character cap, matching the API. The published code lists change, and refusing a valid new code would be worse than accepting a wrong one. The form says to check the code with the tenant's accountant rather than pretending to validate it.
- **A clashing item code gets its own dialog with one way out: edit the item that already holds it.** Like the client duplicate dialog and for the same reason — the API has no override, because a code that names two things is not a code. It says when the holder is **inactive**, which is the confusing case: the code looks free because the item is not in the list. Its action opens that item if it is on the current page, and otherwise clears the filters and searches for it, because an inactive item usually is not loaded.
- **Error codes are turned into sentences in one place,** `productErrorMessage` in `lib/products/types.ts`, so the list, the form and the status toggle all say the same thing about the same code. `SKU_ALREADY_EXISTS` names the item and whether it is inactive; `TAX_RATE_INACTIVE` and `TAX_RATE_NOT_FOUND` point at Invoice settings; `PRODUCT_INACTIVE` explains why an item cannot go on a new invoice. Anything else falls back to the API's own message, which is already written for a reader.
- **The money formatter is imported from `lib/clients/types`, not rewritten.** One formatter for the whole Billing area, so a price here and a credit limit there can never be grouped differently (Indian grouping for INR, SRS NFR-U4).
- **"Invoicing isn't available yet" is said once, and made useful.** On the clients screen that notice only apologises; here it also says what the catalogue is *for* — that each item will fill in an invoice line, and that an invoice keeps its own copy so editing an item never changes an invoice already sent. That is BI-PR2 explained to the person whose data it is. It leads with the API's own `meta.messages[0]`, so a change to that wording ships from the server. Not repeated on the form, where it would get in the way of the job.
- **The tax-rate screen's delete now explains itself.** A rate that any item uses cannot be removed (409 `TAX_RATE_IN_USE`, from the backend's new RESTRICT foreign key). `components/billing/tax-rates-tab.tsx` shows the API's own message, which names how many items are in the way, and the remove dialog now says up front that turning the rate off is the way to retire one. Without this the member would have seen "Couldn't remove that tax rate." and no reason.

## Screens and routes
| Where | What |
|---|---|
| Sidebar → Organization → **Products & services** | `products.view`, module `invoices` (which is where the keys live, so a plan or subscription message is the right one). |
| Top bar → Settings → **Products & services** | Same permission. |
| Top bar → Create (+) → **New product or service** | `products.manage`; links with `?new=1`, which the page opens its form from. |
| `/{org}/settings/billing-products` | The list: search box, All / Active only / Inactive only, unit filter, Clear filters, sortable Item / Code / Unit price headers, pager, New item. Each row has Edit and Make inactive/active; the row itself opens the edit form. |

## Out-of-SRS behaviour
- The route itself, the nav entry, the Settings-menu entry and the Create (+) entry: the SRS names a Products/Services tab inside Billing, not a page under Settings. There is no Billing module screen to hold a tab yet.
- Showing active and inactive together by default, and the three-way status filter: the SRS says inactive items are hidden from new invoices, not what this screen shows.
- The unit filter, and sorting by code and unit price.
- The item-code clash dialog and its "edit that item instead" action, including the inactive-holder wording: SRS 7.8 asks for an item-code field, not for a uniqueness rule.
- "No tax on this item" as an explicit option, and keeping a turned-off rate selectable while editing.
- Flagging items whose tax rate has been turned off, both in the Tax column and in an alert with a link to Invoice settings.
- Reading an empty price as 0 rather than refusing it.
- The "This is your price list for invoices" notice explaining what the catalogue will be used for.
- `priceWithUnit`, `taxRateLabel` and `PRODUCT_UNIT_PER`: wording helpers, not SRS fields.
- `ProductInvoiceLineDefaults` being mapped while nothing renders it, so the snapshot shape is settled on this side before the invoice feature needs it.
- The `TAX_RATE_IN_USE` wording and the extra line in the tax-rate remove dialog, both in another feature's screen.

## Change Request History
- 2026-11-28: Built BI-PR1 in full and BI-PR2 as far as this project can take it: the products list under `/settings/billing-products` with search, status and unit filters and the active/inactive toggle, the product form with every BI-PR1 field and the tax-rate picker reading the organization's own rates, the item-code clash dialog, the error-code wording, the `billingProducts` slice, and the nav, Settings-menu and Create (+) entries. Also explained the new `TAX_RATE_IN_USE` refusal on the tax-rate screen. No tests written or run, and `tsc` and `eslint` were not run, by Raj's instruction. Asked by Raj.
