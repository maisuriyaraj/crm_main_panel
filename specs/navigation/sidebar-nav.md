# Spec: User Panel Sidebar Navigation

## Status
Implemented

## Type
New Feature

## Goal
Give the User Panel (the logged-in area under `app/[orgnization]/`) a real sidebar navigation component: a collapsible icon-rail nav covering the full planned module set (Dashboard, Leads, Contacts, Companies, Deals, Tasks, an expandable Ads Manager group, Growth, and admin-only Team settings), built as **real, clickable navigation now** — not disabled placeholders — even though most of these module pages don't exist yet and will be built one at a time in later specs. This spec covers the sidebar component and the layout that mounts it — it does not build the Leads module, Ads Manager, Growth module, Master Admin, or any other new screen page.

## Current State

- **The protected app shell layout is missing.** The auth-flow feature (`specs/auth/auth-flow.md`, status Implemented) originally built `app/(app)/layout.tsx` as the shared guarded shell with a sidebar. As of this session, that file — along with `app/(app)/dashboard/page.tsx` and `app/(app)/settings/team/page.tsx` — has been **deleted** in an uncommitted, in-progress restructure (confirmed via `git status`). The pages were **moved** to `app/[orgnization]/dashboard/page.tsx` and `app/[orgnization]/settings/team/page.tsx` (new, untracked), but **no `app/[orgnization]/layout.tsx` exists yet** — there is currently no shell, no sidebar, and no auth guard wrapping these two pages at all.
- The `[orgnization]` folder name is spelled that way in the actual codebase (not "organization"). Per `.claude/rules/code-style.md` ("keep whatever name already exists in the file you're editing"), this spec keeps that spelling as-is rather than renaming it.
- Neither `dashboard/page.tsx` nor `settings/team/page.tsx` currently reads the dynamic `orgnization` route param — nothing in the app does yet.
- The only other clue to the intended org-scoped URL shape is an uncommitted edit to `app/auth/signin/page.tsx`, which now redirects a fresh login to:
  ```
  `/${me?.data?.organizationId}/${pageRoutes.dashboard}`
  ```
  This uses the numeric `organizationId` (not a slug) as the URL segment, and it has a pre-existing bug: `pageRoutes.dashboard` is `"/dashboard"` (leading slash already), so this produces a double slash (`/123//dashboard`). This spec's own link-building avoids repeating that bug (see Proposed Change), but does not fix `signin/page.tsx` itself — that file is outside this spec's scope ("nothing else").
- `proxy.ts` was also already updated (uncommitted) to expect this org-scoped shape: it strips the first path segment before matching `/dashboard` and `/settings/team` against its protected-route list. So the route-guard layer already assumes org-scoped URLs; only the actual page shell/sidebar is missing.
- `components/ui/sidebar.tsx` is a complete, already-installed shadcn-style sidebar primitive (`SidebarProvider`, `Sidebar`, `SidebarMenu*`, `SidebarTrigger`, `SidebarRail`, `useSidebar`, etc.). It already implements:
  - Icon-rail collapsed mode (`collapsible="icon"`) and an off-canvas mobile mode (via `components/ui/sheet.tsx`), switched automatically by `hooks/use-mobile.tsx`.
  - Tooltips on nav buttons that only show while collapsed (`SidebarMenuButton`'s `tooltip` prop, wired through `components/ui/tooltip.tsx`).
  - A `Ctrl/Cmd+B` keyboard shortcut to toggle.
  - It **writes** a `sidebar_state` cookie on every toggle, but nothing today **reads** that cookie back — so collapsed state does not actually survive a page reload yet, despite the plumbing being there.
  - This primitive is otherwise unused anywhere in the app right now (confirmed by search) — this spec is its first real usage.
- Design tokens for the sidebar (`--sidebar`, `--sidebar-foreground`, `--sidebar-primary(-foreground)`, `--sidebar-accent(-foreground)`, `--sidebar-border`, `--sidebar-ring`) already exist in both light and dark themes in `app/globals.css` and are already mapped in the `@theme inline` block. No new tokens needed.
- `hooks/useAuth.ts` exposes `{ user, role, isAuthenticated, isAuthChecked, isLoading, needResetPassword, logout }`. `user.organizationId` and `user.role` are what this spec needs.
- Role model, confirmed from the existing (uncommitted) `settings/team/page.tsx`: `role` is a plain `string` on `AuthUser`, and the only two values referenced anywhere in the codebase are `"org_admin"` and `"org_user"`. There is no formal role enum/union type today — this spec does not invent one, it matches the existing string-comparison pattern (`role !== "org_admin"`).
- **No `OrbitOps*` component naming convention exists anywhere in this codebase.** A repo-wide search for `OrbitOps[A-Z]\w*` found zero matches. `specs/auth/auth-flow.md` independently confirmed the same for `OrbitOpsDataTable` when it built `components/ui/data-table.tsx`. Existing non-`ui/` components use plain, purpose-based names grouped in feature folders (`components/team/user-form-dialog.tsx`). This spec follows that same existing pattern rather than introducing a new prefix — see Open Questions if you want it named `OrbitOpsSidebar` anyway.
- `lucide-react` (^1.18.0) is already installed and is the icon set used everywhere else in the app (`app/page.tsx`, `components/ui/sidebar.tsx` itself). No new icon dependency is needed.
- `lib/constants.ts`'s `pageRoutes` currently has flat, non-org-scoped values (`dashboard: "/dashboard"`, `settingsTeam: "/settings/team"`). This spec adds one small helper alongside them rather than changing their values, so nothing else that references them today breaks.

## Proposed Change

### 1. Component location and naming
- New folder `components/layout/` (parallel to the existing `components/team/` feature-folder pattern — `components/ui/` stays reserved for the generated shadcn primitives per `.claude/rules/component-structure.md`).
- New file `components/layout/app-sidebar.tsx`, exporting `AppSidebar`. Plain name, no `OrbitOps` prefix — see Current State for why. `"use client"` (uses `usePathname`, `useParams`, and the `useSidebar` context).
- Built entirely on the existing `components/ui/sidebar.tsx` primitive (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarRail`) — no hand-rolled nav markup, per `.claude/rules/component-structure.md`'s "extend, don't restructure" rule for `components/ui/`.

### 2. Nav structure
Updated per your review (see Change Request History) to match the full module set from your reference screenshot. A typed config array, `navGroups`, defined in the same file (small enough not to warrant its own constants file):

```
Workspace
 - Dashboard            -> real page today (app/[orgnization]/dashboard)
 - Leads                -> real link, no page built yet
 - Contacts             -> real link, no page built yet
 - Companies             -> real link, no page built yet
 - Deals                -> real link, no page built yet
 - Tasks                -> real link, no page built yet

Growth
 - Ads Manager (expandable, no href of its own — toggles open/closed)
    - Overview           -> real link, no page built yet
    - Campaigns           -> real link, no page built yet
    - Analytics           -> real link, no page built yet
    - Assets              -> real link, no page built yet
    - Account Center      -> real link, no page built yet
 - Growth                -> real link, no page built yet

Organization  (only rendered if role === "org_admin")
 - Team                  -> real page today (app/[orgnization]/settings/team)
```

- `Dashboard` and `Team` are the only two screens that actually exist today. Every other item is a genuine, clickable `<Link>` to its route — **not** a disabled/"coming soon" placeholder — per your instruction that this spec should ship the static nav with real navigation first, with each module's own page following in a later spec. Until a given module's spec lands, clicking its nav item hits Next's default not-found page (see Risks — flagged there, not silently patched over).
- No `comingSoon`/disabled flag is needed in the item type anymore — every item behaves the same way (a real link), so the config only needs `label`, `icon`, `href`, optional `roles`, and (for Ads Manager only) a `children` array for the submenu.
- Icons, matched to your screenshot: `LayoutDashboard` (Dashboard), `UserPlus` (Leads), `Users` (Contacts), `Building2` (Companies), `Briefcase` (Deals), `SquareCheck` (Tasks), `Megaphone` (Ads Manager), `TrendingUp` (Growth), `UsersRound` (Team). Sub-items under Ads Manager have no icons, matching the screenshot (indented text only).
- New route constants needed in `pageRoutes` (`lib/constants.ts`) for all the not-yet-built items: `leads`, `contacts`, `companies`, `deals`, `tasks`, `adsManagerOverview`, `adsManagerCampaigns`, `adsManagerAnalytics`, `adsManagerAssets`, `adsManagerAccountCenter`, `growth`. Exact URL slugs proposed as `/leads`, `/contacts`, `/companies`, `/deals`, `/tasks`, `/ads-manager/overview`, `/ads-manager/campaigns`, `/ads-manager/analytics`, `/ads-manager/assets`, `/ads-manager/account-center`, `/growth` — flagged in Open Questions in case you want different slugs once each module's own spec is written.

### 2a. Ads Manager submenu (new)
- Ads Manager is the one item with children, matching the screenshot's expandable group. Built with the existing `components/ui/collapsible.tsx` (`Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`, a thin wrapper over `@radix-ui/react-collapsible`, already installed) wrapping the existing `SidebarMenuSub`/`SidebarMenuSubItem`/`SidebarMenuSubButton` primitives from `components/ui/sidebar.tsx` — no new dependency, no hand-rolled expand/collapse logic.
- The "Ads Manager" row itself only toggles the submenu open/closed — it has no `href` and does not navigate (matches the screenshot, where it reads as a section header with children, not a page). Flagged in Open Questions in case you'd rather it also link to "Overview" when clicked directly.
- Expand/collapse state for this submenu is plain local component state (`useState`), defaulting to open when the current path matches one of its children (so refreshing on `/ads-manager/campaigns` shows the submenu already open), otherwise closed. This is separate from the sidebar's own collapse-state cookie (section 4) — it's cheap to recompute from the current path on every render, so it doesn't need its own persistence.
- In icon-rail collapsed mode, Ads Manager behaves like any other item with a tooltip; its submenu is hidden while collapsed (existing primitive behavior for `SidebarMenuSub`, unchanged).

### 3. Org-scoped links and active-state logic
- `AppSidebar` reads the current org segment with `useParams<{ orgnization: string }>()` from `next/navigation` (matching the actual URL, not `user.organizationId` from Redux — these should agree, but the URL is the source of truth for "what am I currently viewing").
- A small helper, `buildOrgRoute(orgSlug: string, route: string)` in `lib/constants.ts`, joins them as `` `/${orgSlug}${route}` `` (note: `route` already carries its own leading slash, e.g. `pageRoutes.dashboard = "/dashboard"`, so this produces `/123/dashboard`, not the double-slash `/123//dashboard` seen in the current `signin/page.tsx` redirect). This keeps the "never hardcode a route string in a component" rule (`.claude/rules/component-structure.md`) intact while fixing the join logic in one shared place.
- Active state: `usePathname()` from `next/navigation`, compared against each item's built href. A group/item is active on an exact match, or when the pathname starts with `href + "/"` (so a future nested route like `/123/settings/team/invite` still highlights "Team"). This mirrors the segment-stripping approach `proxy.ts` already uses, just for highlighting instead of gating.

### 4. Collapse/expand behavior
- Uses the existing primitive's built-in `collapsible="icon"` mode as-is: rail collapses to icon-only, `SidebarMenuButton`'s `tooltip` prop shows the label on hover while collapsed (already implemented in `components/ui/sidebar.tsx`, not rebuilt here).
- **Persistence — closing the gap noted in Current State**: `SidebarProvider` already *writes* the `sidebar_state` cookie on toggle but nothing *reads* it back today. This spec has the new `app/[orgnization]/layout.tsx` (a Server Component) read that cookie via `cookies()` from `next/headers` and pass it as `SidebarProvider`'s `defaultOpen` prop — the standard pattern this primitive was already built for. This means:
  - Persistence is a plain cookie, not `localStorage` (the Lovable reference's approach) and not a database-backed user preference.
  - It survives reloads and new tabs (cookie, not per-tab state), but is browser/device-local, not synced across devices — there is no backend endpoint for per-user UI preferences today, and adding one is out of scope for a sidebar-only spec.
  - This is flagged as an Open Question below in case you'd rather tie it to a real user-preference record later.

### 5. Role-based visibility
- Only one gate exists today: the "Organization" group (containing "Team") renders only when `role === "org_admin"`, matching the exact check already used in `settings/team/page.tsx`. `org_user` sees "Workspace" and "Growth" in full, minus "Organization"/"Team".
- This is UX-only, same caveat already on record in `specs/auth/auth-flow.md`: hiding the nav item doesn't stop direct navigation; the page itself (already does) and the backend remain the real enforcement.

### 6. Icon set and dependencies
- `lucide-react` only — already installed, already the app-wide icon set. No new package needed anywhere in this spec.

### 7. Layout wiring (`app/[orgnization]/layout.tsx`, new)
Scoped narrowly to *mounting the sidebar shell*, not to reproducing the full auth-guard behavior the old, deleted `app/(app)/layout.tsx` had (see Risks — that gap belongs to the auth-flow feature, not this one):
- Server Component. Reads the `sidebar_state` cookie (see #4) for `defaultOpen`.
- Renders `SidebarProvider` → `AppSidebar` → `SidebarInset` (existing primitives) → `{children}`.
- A minimal top bar inside `SidebarInset` with just `SidebarTrigger` (existing primitive) so the sidebar can be toggled — no header content beyond that is specified here.

## Affected Files

**New**
- `components/layout/app-sidebar.tsx` — the `AppSidebar` component and its `navGroups` config.
- `app/[orgnization]/layout.tsx` — mounts `SidebarProvider`/`AppSidebar`/`SidebarInset`, reads the persisted collapse-state cookie.

**Modified**
- `lib/constants.ts` — add `buildOrgRoute(orgSlug, route)` helper, plus new `pageRoutes` entries for every not-yet-built module link (`leads`, `contacts`, `companies`, `deals`, `tasks`, `adsManagerOverview`, `adsManagerCampaigns`, `adsManagerAnalytics`, `adsManagerAssets`, `adsManagerAccountCenter`, `growth`). `pageRoutes.dashboard` / `pageRoutes.settingsTeam` values are unchanged.

**Not touched by this spec** (called out because they're adjacent and easy to assume are in scope)
- `app/auth/signin/page.tsx` — has the double-slash redirect bug described in Current State; left as-is per "nothing else."
- `app/[orgnization]/dashboard/page.tsx`, `app/[orgnization]/settings/team/page.tsx` — already exist, not modified.
- Any real auth-guard logic (redirect on failed `/me`, forced-password-reset blocking) — see Risks.

## Design
- **Screens affected**: none of the page content changes — this adds the shell/nav that wraps `app/[orgnization]/dashboard` and `app/[orgnization]/settings/team`.
- **Existing components reused**: the entire `components/ui/sidebar.tsx` primitive family, plus `tooltip.tsx` and `sheet.tsx` that it's already built on. `badge.tsx` for the "Soon" placeholder marker.
- **New components**: `components/layout/app-sidebar.tsx` only. Built by composing the existing primitive, not by hand-rolling new nav markup, per `.claude/rules/component-structure.md`.
- **Design tokens**: existing `--sidebar*` tokens only (already defined light + dark in `app/globals.css`, already mapped in `@theme inline`) — no new colors, per `.claude/rules/theming.md`.
- **Reference**: `.claude/context/sidebar-lovable-reference.md` was requested as a UX reference for this spec but does not exist in the repo (no `.claude/context/` folder at all) — confirmed and flagged to you; proceeding without it, per your instruction to skip it rather than block or paste it manually.
- **Platform differences**: none beyond what the primitive already handles — `components/ui/sidebar.tsx` already switches to an off-canvas `Sheet` on mobile via `hooks/use-mobile.tsx`; `AppSidebar` doesn't need its own mobile-specific logic.

## Risks
- **Most nav items point to pages that don't exist yet.** Leads, Contacts, Companies, Deals, Tasks, Growth, and all five Ads Manager sub-items are real, clickable links to routes with no `page.tsx` behind them — per your instruction to ship functional navigation now and build each module later. Until each one is built, clicking those items shows Next's default not-found page. This is expected during this rollout, not a bug, but worth confirming you're fine with that interim look rather than a lightweight shared "under construction" page (see Open Questions).
- **This spec does not restore the auth guard.** The deleted `app/(app)/layout.tsx` (per `specs/auth/auth-flow.md`) used to call `reqToFetchMe` once, block rendering until it resolved, redirect to sign-in on failure, and force a password-reset redirect when `needResetPassword` is true. The new `app/[orgnization]/layout.tsx` in this spec does **not** reproduce that — it only mounts the sidebar shell. Until that guard logic is rebuilt somewhere (arguably back in `auth-flow.md`'s territory, via a `/sdd-change`), `app/[orgnization]/dashboard` and `.../settings/team` are reachable by an unauthenticated client-side render, relying solely on `proxy.ts`'s cookie-presence check. Flagging this clearly since it's easy to assume a "layout.tsx" fixes it.
- `buildOrgRoute` assumes the URL's org segment is always available (`useParams()` inside a page under `app/[orgnization]/...`) — if `AppSidebar` is ever rendered outside that route subtree, `orgnization` will be `undefined` and links will break. Not a concern for this spec's actual usage, worth knowing if it's reused elsewhere later.
- Cookie-based collapse persistence (see Proposed Change #4) is a UX nicety, not a data model decision — safe to change later without migration if you'd rather move it to a real user-preference record.
- `signin/page.tsx`'s existing double-slash redirect bug is left as-is (out of scope) but will produce a URL like `/123//dashboard` that still happens to work (browsers/Next collapse it) — not blocking, just noted so it isn't mistaken for something this spec caused.

## Open Questions
1. Naming — OK with plain `AppSidebar` / `components/layout/`, given no `OrbitOps*` convention actually exists in this codebase today? Or do you want this to be the first component to adopt an `OrbitOps` prefix?
2. Collapse-state persistence — is a plain cookie (this spec's proposal, closing a gap already half-built into `components/ui/sidebar.tsx`) good enough for now, or should it wait and tie into a real per-user preference once that exists on the backend?
3. Should the missing auth-guard logic (redirect-if-logged-out, forced-password-reset block) be picked up as a follow-up `/sdd-change` against `specs/auth/auth-flow.md` right after this spec, given it's currently not enforced client-side at all?
4. Icon choices (`LayoutDashboard`/`Users`/`Settings` etc.) — fine as proposed, or do you have specific icons in mind per item?
5. ~~Should the "Leads" placeholder show a "Soon" badge, or just be omitted entirely from the nav until the module is actually being built?~~ Superseded — see Change Request History below: all items are now real links, no badge/disabled state.
6. Are the proposed route slugs OK (`/leads`, `/contacts`, `/companies`, `/deals`, `/tasks`, `/ads-manager/overview`, `/ads-manager/campaigns`, `/ads-manager/analytics`, `/ads-manager/assets`, `/ads-manager/account-center`, `/growth`), or do you already have specific URLs planned for these modules?
7. Should clicking a not-yet-built nav item show Next's plain default not-found page (this spec's proposal — simplest, nothing extra to build), or would you rather this spec also add one shared, minimal "this module isn't built yet" page that all the unbuilt routes render, so it looks intentional rather than broken?
8. Should the "Ads Manager" row itself be link-only-a-toggle (this spec's proposal — clicking it only expands/collapses, matching the screenshot), or should it also navigate to "Overview" when clicked directly?

## Implementation Notes
- Built exactly as approved: `components/layout/app-sidebar.tsx` (`AppSidebar`, with the `navGroups` config, org-scoped links via `useParams`, active-state via `usePathname`, role-gated "Organization" group, and the Ads Manager `Collapsible`/`SidebarMenuSub` submenu with `defaultOpen` computed from whether a child route is active); `app/[orgnization]/layout.tsx` (Server Component, reads the `sidebar_state` cookie via `next/headers`'s `cookies()` — an async API in this Next version — for `SidebarProvider`'s `defaultOpen`, minimal `SidebarTrigger`-only header, matches the styling of the previously-deleted `app/(app)/layout.tsx`); `buildOrgRoute` helper plus the eleven new `pageRoutes` entries in `lib/constants.ts`.
- No deviations from the approved spec. The layout intentionally has no `SidebarFooter`/logout affordance — the previously-deleted `app/(app)/layout.tsx` had one, but this spec's section 7 scoped the new layout to just the sidebar shell, so it wasn't added here.
- Verification performed: `npx tsc --noEmit` and `eslint` on the three changed files show zero issues; `next build`'s Turbopack compile step succeeded (all new files compiled cleanly). Its later type-check step fails, but only on the same pre-existing, unrelated issues already documented in `specs/auth/auth-flow.md` (`app/page.tsx`, `pricingPlansSlice.ts`, etc.) — nothing in this feature's files.
- **Not verified**: interactive browser testing. There's no live backend to log in against, so `role`, `user.organizationId`/URL org segment, and the "Organization" group's visibility couldn't be exercised end-to-end in a real session.
- Known limitations carried over from the spec's own Risks (not fixed here, by design): the auth guard (redirect-if-logged-out, forced-password-reset block) is still not restored anywhere — `app/[orgnization]/dashboard` and `.../settings/team` currently rely solely on `proxy.ts`'s cookie-presence check; and every nav item except Dashboard and Team links to a route with no page yet, so clicking them shows Next's default not-found page until each module is built in its own future spec.

## Change Request History
- 2026-08-23 | Reworked nav structure to match a reference screenshot of the product's planned sidebar: added Leads, Contacts, Companies, Deals, Tasks to "Workspace"; added a new "Growth" group with an expandable "Ads Manager" submenu (Overview, Campaigns, Analytics, Assets, Account Center) and a "Growth" item; kept the existing admin-only "Organization" (Team) group. Also changed the placeholder approach: items with no page yet are now real, clickable links (not disabled "coming soon" items), per instruction to ship static/navigable UI now and build each module's page later. | Requested to match how the sidebar should look across the product, based on a screenshot shared by the developer | Raj Maisuriya
