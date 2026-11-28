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
leads | specs/leads/leads-ui.md | Leads module screens (List, Kanban, Analytics), forms, activity/notes, and tags — originally built on local demo data, now wired to the real API by lead-api-implementation.md. | Implemented
leads | specs/leads/lead-api-implementation.md | Wires the Leads UI to the real backend API — Redux slice, api routes, snake_case/camelCase mapping — replacing the local demo data. | Implemented
leads | specs/leads/lead-detail/spec.md | Attachments tab on the lead detail sheet: upload with checks and progress, list, fresh-link download, delete, storage usage and limit message, behind storage_enabled. | Implemented
tenant-shell | specs/tenant-shell/impersonation/spec.md | SRS 3.8 Tenant impersonation, this project's half: the /impersonate exchange screen and the "OrbitOps support is signed in" banner. | Implemented
billing | specs/billing/settings-permissions/spec.md | SRS 7.10 Invoice settings screen: company billing details and numbering, tax rates, invoice emails, payment gateway keys, accounting sync; invoice screens themselves not built | Draft
billing | specs/billing/clients/spec.md | SRS 7.7 Clients: list, form and client page for whom the organization invoices, Convert to client on a lead (LD-A7), and the credit-limit warning built as a drop-in; invoices and balance wait on invoice screens | Implemented
billing | specs/billing/products-services/spec.md | SRS 7.8 Products and services: the price list an invoice line will be filled in from — list with search, status and unit filters, the form with the tax-rate picker, active/inactive toggle, item-code clash dialog; BI-PR2 half shown, the rest waits on invoice screens | Implemented
team | ../docs/specs/team-management-spec.md | Cross-app Team Management: Team page, invitations, accept-invite page, permission-based gating (shared with backend) | Implemented
bookings | ../docs/bookings/spec.md | Public Book a Demo form on the v2 availability and create endpoints (shared with backend, mst_admin) | Approved
