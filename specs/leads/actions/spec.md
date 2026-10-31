# Lead actions
**SRS section:** 5.5 · **Requirement IDs:** LD-A1, LD-A2, LD-A3, LD-A4, LD-A5, LD-A6, LD-A7 · **Priority:** Must 5, Should 2 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/actions/spec.md)
**Overall status in this project:** 🟡 (0 of 7 requirements implemented)

## Summary
Adding, editing, deleting, importing and calling leads. Add, edit and delete work, with a partial bulk bar. Duplicate checks, restore, import and the dialler do not exist. Used by Sales Executive, Sales Manager, Tenant Admin.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-A1 | "+ Add Lead" form with validation and duplicate check; duplicates show the matching record with options to open it or create anyway. | Must | 🟡 | `components/leads/lead-form-dialog.tsx` (`LeadFormDialog`) | Form works. No duplicate prompt. |
| LD-A2 | "Create Social Leads" pulls leads from connected Meta / Google / WhatsApp lead forms (see 9.2). | Should | ❌ | — | No Create Social Leads action. |
| LD-A3 | Edit (pencil) and delete (trash) per lead; delete asks for confirmation and is a soft delete restorable for 30 days. | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`handleDelete`) | Confirmation works, but it says the delete cannot be undone. No restore screen. |
| LD-A4 | Bulk actions on selected leads: assign owner, change stage, change status, add/remove tags, export, delete. | Must | 🟡 | `app/[orgnization]/leads/page.tsx` (`handleBulkStageChange`, `handleBulkAssign`, `handleBulkDelete`) | Stage, assign and delete only. No tags, status or export. |
| LD-A5 | Import leads from CSV/Excel with column mapping, duplicate handling (skip, update, create) and an error report. | Must | ❌ | — | No import screen. |
| LD-A6 | Quick call: phone icon opens the dialler (tel: link, or integrated telephony later); after a call the user logs an outcome. The icon is colour-coded: green = answered / connected, yellow = follow-up pending, red = not answered or missed follow-up, grey = never called. | Must | 🟡 | `components/leads/lead-detail-sheet.tsx` (`handleLogActivity`) | Manual logging only. No `tel:` link or coloured call icon. |
| LD-A7 | Convert a lead into a Billing client (pre-fills client details). | Should | ❌ | — | No Billing client conversion. |

## Out-of-SRS behaviour
- Convert to Contact (`handleConvertLead`) and the Contacts screens (`app/[orgnization]/contacts/page.tsx`, `components/contacts/`) are not in the SRS.
