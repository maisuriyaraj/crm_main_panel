# Navigation
**SRS section:** 4.2 · **Requirement IDs:** SH-N1, SH-N2, SH-N3, SH-N4, SH-N5 · **Priority:** Must 4, Should 1 · **Feature flag:** None
**Project:** crm_main_panel (Tenant Panel UI) · **Other side:** [crm_backend](../../../../crm_backend/specs/tenant-shell/navigation/spec.md)
**Overall status in this project:** 🟡 (0 of 5 requirements implemented)

## Summary
The shared sidebar, top bar and global search. A permission-aware, collapsible sidebar exists. The top bar, breadcrumbs, module switcher and global search do not. Used by all tenant users.

## Implementation status
Source: [OrbitOps SRS](../../../../docs/requirements/orbitops-srs.md). A requirement is fully done only when every project's spec shows ✅ or ➖; see the [coverage matrix](../../../../docs/requirements/coverage-matrix.md).

| Req ID | Requirement | Priority | Status | Evidence | Missing or unclear |
|---|---|---|---|---|---|
| SH-N1 | Left sidebar lists the modules the tenant's plan and the user's role allow (Dashboard, Leads, Ad Manager, Billing, Settings); disabled modules are not shown. | Must | 🟡 | `lib/navigation.ts` (`navGroups`, `visibleNavGroups`), `components/layout/app-sidebar.tsx` | Filters by permission, not plan. No Billing item. Ads, Companies, Deals, Tasks and Growth links lead to routes with no page. |
| SH-N2 | Module switcher to jump between modules; breadcrumb (e.g. Home › Ad Manager). | Must | ❌ | — | No module switcher. `components/ui/breadcrumb.tsx` is not used by any page. |
| SH-N3 | Top bar icons: Create (+) quick-create menu, Analytics, Notification bell with unread indicator, Calendar, Settings, Profile menu (profile, preferences, logout), More (⋯). | Must | ❌ | — | `app/[orgnization]/layout.tsx` has only a sidebar toggle in the header. Sign out and Security sit in the sidebar footer. |
| SH-N4 | Global search (⌘K / Ctrl+K) across leads, clients, invoices, campaigns and CRM pages, with grouped results and keyboard navigation. | Must | ❌ | — | No ⌘K search. `components/ui/command.tsx` is not used. |
| SH-N5 | Sidebar collapses to icons; layout is responsive down to 360 px width. | Should | 🟡 | `components/layout/app-sidebar.tsx` (`collapsible="icon"`), `hooks/use-mobile.tsx` | Collapse to icons works. The 360 px layout has not been tested and has no test. |

## Out-of-SRS behaviour
- Sidebar includes Contacts, Companies, Deals, Tasks and Growth, and a light/dark theme toggle, none of which are in the SRS. Only Contacts has a page.
