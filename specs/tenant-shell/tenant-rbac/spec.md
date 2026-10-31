# Tenant roles and permissions
**SRS section:** 2.2 · **Requirement IDs:** SH-R1, SH-R2, SH-R3, SH-R4 · **Priority:** Must 3, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/tenant-rbac/spec.md)
**Overall status in this project:** 🟡 (0 of 4 requirements implemented)

## Summary
Controls what each tenant user can do by module and action. This is the strongest area of the product: permissions come from the database on every request and tenants can build custom roles. Record-level scope and plan gating are missing. Used by Tenant Admin and every tenant role.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-R1 | Tenant permissions shall be configurable per module and per action (view, create, edit, delete, export, bulk, approve). | Must | 🟡 | `components/team/permission-matrix.tsx`, `components/team/role-form.tsx`, `components/team/roles-tab.tsx`, `lib/roles/matrix.ts`, `hooks/useAuth.ts` (`can`) | The role editor works, limited to the permission keys the API offers. |
| SH-R2 | Record-level visibility shall support Own, Team and All scopes, which drive the Leads "Self" ownership filter. | Must | ❌ | — | No Self, My team or All filter. |
| SH-R3 | A module turned off by plan or feature flag shall be hidden for every role in that tenant, whatever the role grants. | Must | ❌ | — | `visibleNavGroups` in `lib/navigation.ts` filters by permission only. |
| SH-R4 | Invoice approval shall be a separate permission so an approval workflow can be enabled. | Should | ❌ | — | No approval permission in the matrix. |

## Out-of-SRS behaviour
None found.
