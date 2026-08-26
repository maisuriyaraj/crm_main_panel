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
