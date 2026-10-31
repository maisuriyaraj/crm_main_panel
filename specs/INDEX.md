# Spec Index

This file is maintained automatically by Claude.
Every time a new spec is created or a spec status changes,
this file is updated. Do not edit manually.

Every spec under specs/** (excluding WORKFLOW.md, TEMPLATE.md,
and this file) must have exactly one row here. Descriptions must
stay to one line; do not append change history into this file.

## Format
Group | File Path | Description | Status

## Specs

auth | specs/auth/auth-flow.md | Shared login, silent token refresh, forced password reset, role-gated app shell, and Org Admin team management. | Implemented
navigation | specs/navigation/sidebar-nav.md | User Panel sidebar nav component covering the full planned module set (Dashboard, Leads, Contacts, Companies, Deals, Tasks, Ads Manager submenu, Growth, admin-only Team) and its layout wiring. | Implemented
bookings | ../mst_admin_crm/specs/docs/bookings/spec.md | Public Book a Demo form on the v2 availability and create endpoints (shared with backend, mst_admin) | Approved
tenant-shell | specs/tenant-shell/tenant-rbac/spec.md | SRS 2.2 Tenant roles and permissions, Tenant Panel UI: 0 of 4 implemented | Draft
tenant-shell | specs/tenant-shell/auth-onboarding/spec.md | SRS 4.1 Authentication and onboarding, Tenant Panel UI: 1 of 3 implemented | Draft
tenant-shell | specs/tenant-shell/navigation/spec.md | SRS 4.2 Navigation, Tenant Panel UI: 0 of 5 implemented | Draft
tenant-shell | specs/tenant-shell/list-behaviours/spec.md | SRS 4.3 Common list behaviours, Tenant Panel UI: 0 of 8 implemented | Draft
tenant-shell | specs/tenant-shell/settings/spec.md | SRS 4.4 Tenant settings, Tenant Panel UI: 0 of 4 implemented | Draft
tenant-shell | specs/tenant-shell/notifications/spec.md | SRS 4.5 In-app notifications, Tenant Panel UI: 0 of 2 implemented | Draft
leads | specs/leads/lead-fields/spec.md | SRS 5.1 Lead fields, Tenant Panel UI: 1 of 20 implemented | Draft
leads | specs/leads/pipelines-stages/spec.md | SRS 5.2 Pipelines and stages, Tenant Panel UI: 0 of 5 implemented | Draft
leads | specs/leads/view-modes/spec.md | SRS 5.3 Lead view modes, Tenant Panel UI: 0 of 5 implemented | Draft
leads | specs/leads/search-filter-sort/spec.md | SRS 5.4 Lead search, filter and sort, Tenant Panel UI: 0 of 4 implemented | Draft
leads | specs/leads/actions/spec.md | SRS 5.5 Lead actions, Tenant Panel UI: 0 of 7 implemented | Draft
leads | specs/leads/lead-detail/spec.md | SRS 5.6 Lead detail, Tenant Panel UI: 0 of 3 implemented | Draft
leads | specs/leads/assignment-limits/spec.md | SRS 5.7 Lead assignment and limits, Tenant Panel UI: 0 of 2 implemented | Draft
leads | specs/leads/analytics/spec.md | SRS 5.8 Leads analytics, Tenant Panel UI: 0 of 1 implemented | Draft
ad-manager | specs/ad-manager/header-navigation/spec.md | SRS 6.1 Ad Manager header and navigation, Tenant Panel UI: 0 of 4 implemented | Draft
ad-manager | specs/ad-manager/account-connection/spec.md | SRS 6.2 Ad account connection, Tenant Panel UI: 0 of 3 implemented | Draft
ad-manager | specs/ad-manager/kpis-charts/spec.md | SRS 6.3 + 6.4 KPI cards and charts, Tenant Panel UI: 0 of 6 implemented | Draft
ad-manager | specs/ad-manager/campaigns/spec.md | SRS 6.5 Campaigns tab, Tenant Panel UI: 0 of 5 implemented | Draft
ad-manager | specs/ad-manager/ad-sets/spec.md | SRS 6.6 Ad Sets tab, Tenant Panel UI: 0 of 4 implemented | Draft
ad-manager | specs/ad-manager/creatives/spec.md | SRS 6.7 Creatives tab, Tenant Panel UI: 0 of 4 implemented | Draft
ad-manager | specs/ad-manager/audiences-tracking/spec.md | SRS 6.8 Audiences and tracking, Tenant Panel UI: 0 of 3 implemented | Draft
ad-manager | specs/ad-manager/ab-testing/spec.md | SRS 6.9 A/B testing tab, Tenant Panel UI: 0 of 3 implemented | Draft
ad-manager | specs/ad-manager/analytics/spec.md | SRS 6.10 Ad analytics tab, Tenant Panel UI: 0 of 2 implemented | Draft
ad-manager | specs/ad-manager/budget/spec.md | SRS 6.11 Budget management, Tenant Panel UI: 0 of 2 implemented | Draft
billing | specs/billing/summary-dashboard/spec.md | SRS 7.1 Billing summary dashboard, Tenant Panel UI: 0 of 3 implemented | Draft
billing | specs/billing/invoices-list/spec.md | SRS 7.2 Invoices list, Tenant Panel UI: 0 of 3 implemented | Draft
billing | specs/billing/create-edit-invoice/spec.md | SRS 7.3 Create and edit invoice, Tenant Panel UI: 0 of 8 implemented | Draft
billing | specs/billing/invoice-actions/spec.md | SRS 7.4 Invoice actions, Tenant Panel UI: 0 of 3 implemented | Draft
billing | specs/billing/payments/spec.md | SRS 7.5 Payments, Tenant Panel UI: 0 of 6 implemented | Draft
billing | specs/billing/advanced-invoicing/spec.md | SRS 7.6 Advanced invoicing, Tenant Panel UI: 0 of 6 implemented | Draft
billing | specs/billing/clients/spec.md | SRS 7.7 Clients tab, Tenant Panel UI: 0 of 3 implemented | Draft
billing | specs/billing/products-services/spec.md | SRS 7.8 Products and services tab, Tenant Panel UI: 0 of 2 implemented | Draft
billing | specs/billing/reports/spec.md | SRS 7.9 Billing reports, Tenant Panel UI: 0 of 3 implemented | Draft
billing | specs/billing/settings-permissions/spec.md | SRS 7.10 Billing settings and permissions, Tenant Panel UI: 0 of 4 implemented | Draft
platform | specs/platform/performance/spec.md | SRS 10.1 Performance and scalability, Tenant Panel UI: 0 of 5 implemented | Draft
platform | specs/platform/usability/spec.md | SRS 10.5 Usability and compatibility, Tenant Panel UI: 0 of 4 implemented | Draft
