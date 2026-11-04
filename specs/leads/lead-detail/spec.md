# Spec: Lead attachments (lead detail)

## Status
Implemented

## Type
New Feature

## Goal
Members can attach files to a lead, see who added what, download a file, and delete one, from the lead detail sheet (SRS 5.6, LD-D3: "Attach files (subject to plan storage limit)"). The backend side is [crm_backend's lead detail spec](../../../../crm_backend/specs/leads/lead-detail/spec.md) and [file storage spec](../../../../crm_backend/specs/integrations/file-storage/spec.md).

## Current State
- The lead detail is a slide-over sheet, `components/leads/lead-detail-sheet.tsx`, with Activity and Notes tabs, opened from `app/[orgnization]/leads/page.tsx`. Each write control is shown only when the page passes its handler, which it does only with the right permission.
- `specs/leads/leads-ui.md` left attachments out because no upload endpoint existed. The backend now has upload, list, download and delete under `/leads/:id/attachments`, plus `GET /storage/usage`, with a per-plan storage limit and a `storage_enabled` flag.
- The panel did not read feature flags anywhere before this.
- The test setup is `node:test` over the TypeScript sources, with a simulated API and no DOM. So logic lives in `lib/` modules that can be tested, and components stay thin.

## Proposed Change
- **Attachments tab** in the lead detail sheet, next to Activity and Notes. Shown only when `storage_enabled` is on, read from `GET /features`. Unknown, still loading, or a failed load all count as off, so the tab never flashes in and out.
- **Upload** (needs `leads.update`): drag and drop onto the box, or "Choose a file". One file at a time, with a progress bar.
  - **Checked before sending:** the type is checked by extension (images JPG, PNG, GIF, WebP; video MP4, WebM; PDF; DOCX), and the size against the API's default limits (10 MB, video 90 MB). If the organization's usage is known and the file would not fit, it is stopped here with the storage message.
  - The file picker offers only those types.
- **List:** name, size, uploader (from the member list the page already loads), and the date added.
  - States: skeleton rows while loading, "No files yet." when empty, and an error message with "Try again".
  - Another lead's files never show, even if their request answers late.
- **Download:** asks the API for a new signed link on every click, and hands it straight to the browser (`window.location.assign`). The API serves it as a download, so the panel stays open. The link is never returned, kept in Redux or component state, put in local or session storage, or written into the page as an `href`. It is a bearer link for about 5 minutes, so keeping one around would let it leak.
- **Delete** (needs `leads.update`): a confirmation dialog first ("Delete this file?"), then the file leaves the list.
- **Storage usage:** a line and bar above the list, for example "Storage: 990.0 MB of 1.0 GB used (96.7%)". It is refreshed after every upload and delete.
- **Storage limit error:** a `STORAGE_QUOTA_EXCEEDED` answer re-reads `GET /storage/usage` and shows, for example, "Your organization's file storage is full: 990.0 MB of 1.0 GB used (96.7%). This file needs 40.0 MB, but only 34.0 MB is left. Delete files you no longer need, or ask your admin about a larger plan."
- **Other failures**, each in its own plain sentence:
  - no permission;
  - feature off;
  - file too large, or wrong type (the API's own sentence);
  - damaged file;
  - too many uploads;
  - storage unavailable;
  - no connection.

Why this approach: it follows the existing patterns. That means a Redux slice in the `{ data, onSuccess, onFailure }` thunk shape, the shared Axios client, the UI primitives already in `components/ui/` (Tabs, Progress, AlertDialog, Skeleton, Button), and `notify` for toasts. No library was added: drag and drop uses the browser's own events, and progress uses Axios's `onUploadProgress`.

## Affected Files
- Created: `lib/leads/attachments.ts` (types, mapping, checks, messages, API calls, `openAttachment`), `lib/store/slices/leadAttachmentsSlice.ts`, `lib/store/slices/featuresSlice.ts`, `components/leads/lead-attachments.tsx`, `tests/lead-attachments.test.mjs`, this spec.
- Changed: `lib/constants.ts` (`apiRoutes.features`, `apiRoutes.storageUsage`), `lib/store/index.ts` (two reducers), `components/leads/lead-detail-sheet.tsx` (the tab, and an `attachments` prop), `app/[orgnization]/leads/page.tsx` (loads flags once, passes the permissions), `specs/INDEX.md`, `specs/leads/leads-ui.md`.

## Design
- Screen: the lead detail sheet's new third tab.
- Reused: `Tabs`, `Progress`, `AlertDialog`, `Skeleton`, `Button`, `lucide-react` icons (`Upload`, `Download`, `Trash2`, `Paperclip`), `resolveOwnerName`, and `date-fns` `format`.
- The drop box is a dashed `border-border` box that turns `border-primary` with a light `bg-primary/5` while a file is dragged over it. Errors use the `destructive` tokens.
- New component: `LeadAttachments`. The sheet keys it by lead id, so its upload state starts fresh for each lead.

## API Changes
None. The panel uses these routes as they are:

| Call | Route | Used for |
|---|---|---|
| List | `GET /leads/:id/attachments` | `{ id, lead_id, file_name, file_type, mime, bytes, uploaded_by, created_at }[]` |
| Upload | `POST /leads/:id/attachments`, multipart, field `file` | 201 with the new row; 403, 413 (`FILE_TOO_LARGE` or `STORAGE_QUOTA_EXCEEDED`), 415, 422, 429, 5xx |
| Download | `GET /leads/:id/attachments/:attachmentId/download` | `{ url, expires_at, file_name }`, used once and dropped |
| Delete | `DELETE /leads/:id/attachments/:attachmentId` | 200 |
| Usage | `GET /storage/usage` | `{ used_bytes, files, limit_bytes, percent_used, limit_source }` |
| Flags | `GET /features` | `{ storage_enabled: boolean, ... }` |

## Risks
- **The type and size rules are a copy of the API's defaults.** A Master Admin can change the limits on the server. A stricter server setting is still refused there, with its own message. A looser one would be wrongly refused here until this copy is updated.
- **Hiding the tab when storage is off also hides existing files.** The API still lets members list, download and delete them with the flag off. This follows the request to hide the section; a read-only list could be shown instead later.
- **The list is not paginated.** It shows every file on the lead, which is fine for a handful per lead.
- **Not checked in a browser.** The local backend database is missing recent migrations, so the screen was not run end to end. The download hand-off, drag and drop and progress bar need a manual check against a working backend.

## Open Questions
None.

## Implementation Notes
2026-11-03: implemented as above.
- `npm test` passes 91 of 91, 18 of them new.
- `next build` passes.
- `tsc --noEmit` passes, and the new files pass lint. The page and sheet keep their one lint error from before this work.

Three deliberate breaks were all caught by the new tests:
- caching the download link per file;
- dropping the per-lead check that ignores a late answer;
- dropping the storage check made before sending.

## Change Request History
- 2026-11-03 | Created: attachments tab with upload, list, download, delete, storage usage and limit message, behind `storage_enabled` | LD-D3 now has a backend | Raj Maisuriya

# Lead detail
**SRS section:** 5.6 · **Requirement IDs:** LD-D1, LD-D2, LD-D3 · **Priority:** Must 2, Should 1 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/lead-detail/spec.md)
**Overall status in this project:** 🟡 (0 of 3 requirements implemented)

## Summary
The full record of one lead. A slide-over sheet shows key fields, activity and notes. It is not a page, is not editable inline, and follow-up tasks and attachments have no API. Used by all roles with lead access.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-D1 | Shows all fields, editable inline, plus a timeline of activity: stage changes, owner changes, calls, notes, emails, tasks, and linked invoices. | Must | 🟡 | `components/leads/lead-detail-sheet.tsx` (`LeadDetailSheet`) | A side sheet, not a page. Shows some fields, with no inline edit. |
| LD-D2 | Add notes and follow-up tasks with due date and reminder. | Must | 🟡 | `components/leads/lead-detail-sheet.tsx` (`handleAddNote`) | Notes work. No follow-up task form. |
| LD-D3 | Attach files (subject to plan storage limit). | Should | ❌ | — | No attachment UI. |

## Out-of-SRS behaviour
None found.
