# Billing settings and permissions
**SRS section:** 7.10 · **Requirement IDs:** BI-S1, BI-S2, BI-S3, BI-S4 · **Priority:** Must 3, Could 1 · **Feature flag:** billing_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/billing/settings-permissions/spec.md)
**Overall status in this project:** 🟡 (BI-S1 and BI-S4 built; BI-S2 partly, BI-S3 has no screen by design)

## Summary
One screen, **Invoice settings**, where a tenant sets up the invoices it will send its own clients: its billing identity and numbering, its tax rates, the wording of its invoice emails, its payment gateway keys, and the accounting software its books live in. Five tabs, matching the parts of the backend's settings API.

Separate from `/settings/billing`, which shows what OrbitOps charges the organization.

**The screen says plainly, at the top, that invoices themselves cannot be created, sent or paid yet**, because the invoice screens (SRS 7.2–7.5) are not built. It configures ahead of them. Used by Accountant and Tenant Admin.

Built 2026-11-25.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

**Tests: none were run and none were written, by Raj's instruction for this session.** No test file was created or changed, `npm test` was not run, and neither were `tsc` or `eslint`. The screens have not been opened in a browser. Nothing here is covered by a test.

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| BI-S1 | Company details, invoice numbering, default terms, default currency, tax rates, bank details, email templates, payment gateway keys. | Must | 🟡 | Page `app/[orgnization]/settings/billing-settings/page.tsx`; tabs `components/billing/billing-company-tab.tsx`, `tax-rates-tab.tsx`, `invoice-emails-tab.tsx`, `payment-gateways-tab.tsx`; slice `lib/store/slices/billingSettingsSlice.ts` (registered as `billingSettings`); routes in `lib/constants.ts`; nav entries in `lib/navigation.ts`; error wording in `lib/auth/errors.ts` | Every field in the requirement has a control, against the real API. **Not covered by tests and never opened in a browser**; no typecheck or lint was run. Payment gateway keys can be entered but do nothing: the tab says so. |
| BI-S2 | Permissions: create, edit, approve, send, record payment, void, view only (see 2.2); optional approval step before an invoice can be sent. | Must | 🟡 | The page renders for `invoices.view` and is read-only without `invoices.settings_manage` (every input disabled, no save button, a note saying so); `<NoAccess module="invoices">` otherwise. The approval switch ("Require approval before sending") is on the Company tab | **Cannot be proven end to end.** There is no invoice screen, so nothing in this panel ever offers create, edit, approve, send, record payment or void, and nothing acts on the approval switch. Blocked on the invoice CRUD feature (SRS 7.3, `../create-edit-invoice/spec.md`). |
| BI-S3 | Every invoice change is audit logged with before/after values. | Must | ➖ | — | No screen is wanted or built here: the backend writes the rows, and a tenant reads its activity log in Team → Activity. It will show `team.invoice.*` rows once something writes them, which is blocked on SRS 7.3. |
| BI-S4 | Sync to accounting software (Tally, Zoho Books, QuickBooks). | Could | 🟡 | The Accounting tab: `components/billing/accounting-sync-tab.tsx`; thunks and state in `lib/store/slices/billingSettingsSlice.ts` (`reqToGetAccounting`, `reqToConnectAccounting`, `reqToUpdateAccountingSettings`, `reqToTestAccounting`, `reqToDisconnectAccounting`, `reqToGetAccountingSyncItems`, `reqToRetryAccountingSync`); routes in `lib/constants.ts`; 21 new error codes in `lib/auth/errors.ts` | A tenant can connect Zoho Books or QuickBooks with its own credentials, test it, say where documents post, switch automatic sync on, retry what failed, disconnect, and see the per-record sync history; Tally shows as a file import. **Nothing syncs yet**: the tab's first banner says so, because OrbitOps cannot create a client invoice (SRS 7.3). Not covered by tests, never opened in a browser, and no provider has ever been connected for real. |

## Decisions
Decided by Raj on 2026-11-25. Change them only through `/sdd-change`.
- **Its own page, under Settings:** `/{org}/settings/billing-settings` (`pageRoutes.settingsBillingSettings`), with five tabs (Company, Tax rates, Invoice emails, Payment gateways, Accounting).
- **Gating.** The page checks `invoices.view` to open and `invoices.settings_manage` to change. No separate feature-flag check is made, because `/auth/me` already drops every `invoices.*` key while `billing_enabled` is off for the organization — so the one permission covers the plan, the flag and the role together. Without `invoices.view` the page renders `<NoAccess module="invoices">` and fires no request.
- **Nav entries follow the same rule:** "Invoice settings" is added to the Organization sidebar group and to the top bar's Settings menu, both on `invoices.view`, so a tenant whose plan has no billing never sees them.
- **Read-only, not hidden,** for a member with `invoices.view` alone: they see how billing is set up with every control disabled, and a note saying what permission they would need. This matches the Company settings screen's behaviour.
- **Every error code is shown in plain words** through `API_ERROR_MESSAGES` in `lib/auth/errors.ts` — the screens never show a server message. New entries: `STATE_REQUIRED`, `TAX_RATE_NOT_FOUND`, `TAX_RATE_NAME_TAKEN`, `TAX_RATE_LIMIT_REACHED`, `TAX_RATE_IS_DEFAULT`, `TAX_RATE_INACTIVE`, `TEMPLATE_NOT_CUSTOMISED`, `GATEWAY_NOT_FOUND`, `GATEWAY_SECRET_REQUIRED`, `INVOICE_NUMBER_TOO_LONG`. `VALIDATION_FAILED` field errors are mapped onto the Company tab's inputs.
- **Three notes are said in the UI, not only in this spec:** that invoices cannot be created or sent yet (a banner at the top of the page), that payment gateway keys are stored but not used (a banner on that tab), and that the tax rates and tax id are for the tenant's accountant to confirm.

**Settled while building (change through `/sdd-change` if wrong):**
- **Rates are typed as a percentage** and converted to basis points for the API (`18` → `1800`), so nobody has to think in basis points. Up to two decimal places, cap 50%.
- **Tax rate rows** offer Make default, Turn on/off, Edit and Remove. Setting a default or adding the first rate re-reads the list, because the server clears the other defaults; every other write patches the one row in place.
- **Removing a tax rate asks first**, and the dialog suggests turning it off instead.
- **Each invoice email is its own card** with Subject and Message, a Save for that one email, an Undo while it is dirty, and Reset to standard only when the tenant has its own wording. Standard-wording cards are labelled as such. The placeholder list is shown above them.
- **The gateway secret is never shown.** Each card says whether a secret is stored, shows the key id masked to its last four characters, and leaves the inputs blank — typing nothing keeps what is stored. "Ready to use" cannot be switched on before a secret is stored.
- **Country is a two-letter code input** with the country name shown back under it, the same way the setup wizard asks for it, rather than a new country list.
- **The GST state picker only appears for `IN`**, and its options come from the API's own list.
- **The next invoice number is shown** under the prefix input, from the API's preview, so a prefix change is easy to judge.
- The slice follows the repo's thunk contract exactly (`{ data, onSuccess, onFailure }`, `isLoading` / `isSaving` / `error`), and is registered in `lib/store/index.ts` as `billingSettings`.

**Accounting tab (BI-S4), settled while building:**
- **One card per provider**, driven by what the API says about it: the credential fields, whether it needs an account id, and which settings it still needs. The tab hardcodes only the plain-words label and help for each field name, so a fourth provider needs no new component.
- **Credentials are write-only in the UI too.** Each field shows "stored" when it is set and stays blank; typing nothing keeps what is stored. Secrets use a password input.
- **Tally is shown as a file import**, with a badge and a sentence saying OrbitOps cannot post into it because it runs on the tenant's own machine. Its download button is **disabled** while there are no invoices to export, rather than linking to a route that would answer with an error.
- **"Test connection" is offered only once connected**, and its own message from the API is what the toast shows.
- **"Try the N failed again" appears only when N is above zero**, from the per-status counts the API returns.
- **Disconnecting asks first**, and the dialog says the sync history is kept so reconnecting will not duplicate anything.
- The sync history table is hidden until something is connected or something has been synced, so the tab is not mostly empty furniture on first open.

## Pending from the backend
Nothing for this screen: the settings endpoints and the nine accounting endpoints it needs are all built (see the backend spec's API table).

What the **rest** of this module still waits on, and what therefore cannot be finished here:
- **The invoice CRUD feature (SRS 7.3 Create and edit invoice)**, with 7.2 Invoices list, 7.4 Invoice actions and 7.5 Payments beside it. Until it exists there is no invoice to create, send, approve, pay or void, so BI-S2's permissions have nothing to gate in this panel and BI-S3's audit rows are never written. That feature is the named blocker for finishing BI-S2 and BI-S3.
- **Online payment collection (SRS BI-P4)**, before the gateway keys entered here do anything.
- **A live provider connection.** No Zoho Books, QuickBooks or Tally has ever been connected: the backend adapters have never made a real call, so the Accounting tab is untried against anything but the API shapes it expects.

## Out-of-SRS behaviour
- The read-only mode for `invoices.view` without `invoices.settings_manage`.
- The "invoices aren't available yet" and "not used yet" banners.
- Showing the next invoice number as a preview, and the "a few details are still missing" summary.
- Turning a tax rate off instead of removing it, and one rate being the default.
- "Reset to standard" on an invoice email, and the placeholder list.
- The whole Accounting tab beyond the words "sync to accounting software": the per-record history, retry, test connection, the automatic-sync switch, and Tally as a download rather than a sync.

## Change Request History
- 2026-11-25: Added the Accounting tab for BI-S4: provider cards for Zoho Books, QuickBooks and Tally, write-only credentials, where-things-post settings, test, automatic sync, retry, disconnect and the per-record sync history, with 21 more plain-words error codes. Nothing was tested, typechecked, linted or opened in a browser, by Raj's instruction. Asked by Raj.
- 2026-11-25: Built the Invoice settings page and its four tabs against the new backend settings API, with the new Redux slice, routes, nav entries and plain-words error codes. No tests, typecheck or lint were run, by Raj's instruction. Asked by Raj.
