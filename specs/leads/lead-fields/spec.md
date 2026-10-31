# Lead fields
**SRS section:** 5.1 · **Requirement IDs:** None; the SRS section has no IDs, so rows are named by item · **Priority:** Not set in the SRS · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/lead-fields/spec.md)
**Overall status in this project:** 🟡 (1 of 20 requirements implemented)

## Summary
The data held on each lead. Section 5.1 of the SRS is a table without requirement IDs, so rows are named by field. Basic contact fields exist; many fields the views depend on, such as source, pipeline, lifecycle and follow-up date, do not. Used by Sales and marketing roles.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| 5.1: First name, Last name | Text. At least one of name, email or mobile required; list shows "No name" when both are blank. | — | 🟡 | `components/leads/lead-form-dialog.tsx` (`leadFormSchema`) | One Full name field, always required. No "No name" display. |
| 5.1: Company name | Text. Tooltip on hover when truncated. | — | 🟡 | `app/[orgnization]/leads/page.tsx` | Shown under the name with no truncation tooltip. |
| 5.1: Email | Format validated; duplicate warning within tenant. | — | 🟡 | `components/leads/lead-form-dialog.tsx` | Format only. No duplicate warning. |
| 5.1: Mobile | Phone (E.164, country code). Click-to-call icon; duplicate warning within tenant. | — | 🟡 | `components/leads/lead-form-dialog.tsx`, `components/leads/lead-detail-sheet.tsx` | Free text. No click-to-call. |
| 5.1: Alternate phone, WhatsApp number | Phone. Optional. | — | ❌ | — | Neither field is on the form. |
| 5.1: Lead status / stage | Required; defaults to first stage (Untouched). | — | 🟡 | `components/leads/lead-form-dialog.tsx` (`statusId`) | Required on the form. Default stage list differs from the SRS. |
| 5.1: Lead source | Tenant-editable picklist. | — | ❌ | — | No field. |
| 5.1: Lead owner | Defaults to creator; reassignable. | — | 🟡 | `components/leads/lead-form-dialog.tsx` (`assignedTo`) | No default to creator. |
| 5.1: Pipeline | Pipeline, e.g. Buyer pipeline. | — | ❌ | — | No field. |
| 5.1: Category tags | Multi-select tags; tenant-editable. | — | 🟡 | `components/leads/tag-input.tsx` | Free-text entry only. |
| 5.1: Lifecycle status | Active / Closed / Dead. Drives status filters. | — | ❌ | — | No field or filter. |
| 5.1: Channel (CHL) | Picklist. Default channel filter in toolbar. | — | ❌ | — | No field or filter. |
| 5.1: Address, city, state, country, pincode | Text. Optional. | — | ❌ | — | No fields. |
| 5.1: Estimated value, expected close date | Currency, date. Optional; used for forecasting. | — | 🟡 | `components/leads/lead-form-dialog.tsx` (`value`) | No close date. |
| 5.1: Next follow-up date and time | Drives Calendar view and reminders. | — | ❌ | — | No field. |
| 5.1: Last call status | Enum (none / not answered / answered / follow-up). Drives coloured call indicator. | — | ❌ | — | No field or indicator. |
| 5.1: Campaign / ad reference | Link. Set automatically when lead comes from Ad Manager. | — | ❌ | — | No field. |
| 5.1: Notes | Long text. Optional. | — | ✅ | `components/leads/lead-form-dialog.tsx` (`description`), `components/leads/lead-detail-sheet.tsx` | — |
| 5.1: Custom fields | Tenant-defined: text, number, date, picklist, checkbox. | — | ❌ | — | No custom field UI. |
| 5.1: Created at / Updated at / Created by | System. Shown as timestamps in DD-MM-YYYY HH:mm. | — | ❌ | — | Not shown in the list or the detail sheet in the required format. |

## Out-of-SRS behaviour
- Extra form fields not in the SRS: priority, temperature, lead score, probability, designation, website.
