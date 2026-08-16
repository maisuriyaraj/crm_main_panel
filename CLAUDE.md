@AGENTS.md

## What This Is

OrbitOps (this repo: `main-panel`) is the public-facing front end for a unified business-growth platform — a CRM, sales pipeline, marketing automation, ad campaign management, billing/invoicing, and analytics combined into one product. This repo currently holds the marketing landing page and the auth/demo-booking entry points. See `PRODUCT_OVERVIEW.md` for the full non-technical product description.

## Stack

- Next.js 16.2.6, App Router (`app/`)
- React 19, TypeScript, strict mode
- Tailwind CSS v4, CSS-first theming (no `tailwind.config` colors)
- Redux Toolkit + `react-redux` for client state
- Axios for HTTP calls
- Formik + Yup, and separately react-hook-form + zod (`@hookform/resolvers`) — two form patterns coexist, see `.claude/rules/component-structure.md`
- Radix UI primitives + `class-variance-authority`, shadcn/ui-style components in `components/ui/`
- `framer-motion` (animation), `lucide-react` (icons), `sonner` (toasts)

## Key Commands

```bash
npm run dev      # start dev server (Turbopack) at localhost:3000
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

No test runner is configured in this project.

## Folder Map

- `app/` — Next.js App Router routes, root layout, global styles
- `app/auth/` — sign-in and demo-booking pages
- `components/ui/` — shadcn/ui-style component library (Radix + CVA)
- `hooks/` — shared React hooks
- `lib/store/` — Redux Toolkit store, typed hooks, slices
- `lib/axios/` — shared Axios client
- `lib/constants.ts` — centralized route paths (`pageRoutes`) and API paths (`apiRoutes`)
- `public/` — static assets
- `specs/` — spec-driven-development files: `WORKFLOW.md`, `TEMPLATE.md`, `INDEX.md`, and per-feature specs grouped in subfolders
- `.claude/rules/` — durable coding rules for Claude
- `.claude/skills/` — SDD slash-command definitions

## Naming Rules

- `app/auth/signup/page.tsx` is named "signup" but its component (`BookDemo`) implements a **book-a-demo** form, not account registration. `pageRoutes.signup` is used the same way, for "Start free trial" CTAs. If a task refers to "signup", confirm which behavior is actually meant before assuming a registration flow exists.

## Undocumented Architecture

This file is read in full every session, every line here is a fixed cost paid on every task. Keep this section lean; a feature-specific invariant belongs in that feature's own spec, not here.

- This repo is pinned to `next@16.2.6`, a version ahead of general training data. Local docs are vendored at `node_modules/next/dist/docs/` — see `AGENTS.md` (imported at the top of this file) for when to consult them.
- `lib/axios/index.ts` hardcodes its `baseURL`; `.env`'s `API_URL` is currently unused. See `.claude/rules/api-conventions.md`.
- `app/layout.tsx` loads Geist/Geist Mono fonts, but `app/globals.css` actually applies Manrope/Sora as the live font tokens — Geist currently has no visible effect. See `.claude/rules/theming.md`.
- In `next@16.2.6`, `middleware.ts` is deprecated and renamed to `proxy.ts` (function name `proxy`, same capability). This repo's project-root route-gating file is `proxy.ts`, not `middleware.ts` — see `specs/auth/auth-flow.md`.

## Rules

Durable coding conventions live in `.claude/rules/`. Feature history and current work live in `specs/`. Check both before writing code in an unfamiliar area.

## Session Startup

At the start of every session:
1. Read this file (`CLAUDE.md`).
2. Read `specs/WORKFLOW.md`.
3. Read `specs/INDEX.md` to know what specs exist — names, paths, and one-line descriptions only, not full spec contents.
4. Wait for a task. Only open a specific spec file when a relevant task comes in.

Available commands:
- `/sdd-audit` — read and report on a module, touch nothing
- `/sdd-spec` — create a new spec for a new feature
- `/sdd-change` — update an existing spec when requirements change
- `/sdd-implement` — implement an approved spec
- `/sdd-cleanup` — repo-wide housekeeping pass, run occasionally, not part of daily work

## Communication

Always respond in plain, simple English. Avoid technical jargon where possible. Keep responses short and clear unless the task genuinely needs detail.
