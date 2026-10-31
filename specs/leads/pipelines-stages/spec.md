# Pipelines and stages
**SRS section:** 5.2 · **Requirement IDs:** LD-P1, LD-P2, LD-P3, LD-P4, LD-P5 · **Priority:** Must 4, Should 1 · **Feature flag:** crm_enabled
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/leads/pipelines-stages/spec.md)
**Overall status in this project:** 🟡 (0 of 5 requirements implemented)

## Summary
The ordered stages a lead moves through. Each org has one stage list, which the API can edit, with a different default list from the SRS. Multiple pipelines do not exist and no screen edits stages. Used by Tenant Admin, Sales Manager.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| LD-P1 | Each tenant gets a default pipeline with stages in this order: Untouched Leads (new, unprocessed) → Not Contacted (identified, not reached) → Contacted – Need Follow-up (first contact made) → Interested → Not Interested (declined) → Junk (not related to the business). | Must | 🟡 | `app/[orgnization]/leads/page.tsx`, `lib/leads/fallback-data.ts` | Shows whatever the API returns, with fallback placeholders when empty. |
| LD-P2 | Tenants can create more pipelines (e.g. Buyer pipeline, PreSales, Sales) and edit stages: add, rename, reorder, colour, delete (only when empty or after moving its leads). | Must | 🟡 | `lib/store/slices/leadsSlice.ts` (`reqToCreateLeadStatus`, `reqToUpdateLeadStatus`, `reqToDeleteLeadStatus`) | Thunks exist but no screen calls them, so users cannot edit stages. |
| LD-P3 | Each stage maps to a lifecycle outcome: open, won (Closed), or lost (Dead). Not Interested and Junk map to Dead by default. | Must | 🟡 | `components/leads/lead-analytics.tsx` (`wonStageIds`, `lostStageIds`) | Used only for win rate. |
| LD-P4 | Pipeline selector in the toolbar with an edit (pencil) shortcut for users with permission. | Must | ❌ | — | No pipeline selector or pencil shortcut. |
| LD-P5 | Optional required fields per stage (e.g. reason required when moving to Not Interested). | Should | ❌ | — | No stage rule UI. |

## Out-of-SRS behaviour
None found.
