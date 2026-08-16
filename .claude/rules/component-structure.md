# Component Structure

## UI library (`components/ui/`)

- These are shadcn/ui-style components built on Radix primitives + `class-variance-authority` (CVA) — e.g. `button.tsx`, `badge.tsx`, `card.tsx`. Treat them as a generated library: extend by adding a CVA variant, not by restructuring the component or hand-editing its internals.
- Always compose class names with `cn()` from `lib/utils.ts` (`clsx` + `tailwind-merge`). Never string-concatenate className props.
- For polymorphic components, follow the existing `asChild` + Radix `Slot` pattern used in `button.tsx`.
- Design tokens and color/spacing rules for these components: see `.claude/rules/theming.md`.

## Client vs. server components

- Any page/component using state, effects, event handlers, or `framer-motion` must start with `"use client"` (see `app/page.tsx`, `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx`, `lib/store/StoreProvider.tsx`). Don't add client-only hooks to a file without that directive.

## Forms — two patterns coexist, do not mix them in one form

- **Formik + Yup**: used for the demo-booking form in `app/auth/signup/page.tsx` (`Formik`, `Yup.object().shape(...)`, `<Field>`/`<ErrorMessage>`).
- **react-hook-form + zod**: wired into `components/ui/form.tsx` (`FormProvider`, `Controller`, `@hookform/resolvers`) for components built on that primitive.
- When editing an existing form, keep using whichever pattern that file already uses. For a brand-new form, prefer react-hook-form + zod since that's the pattern the shared `components/ui/form.tsx` primitive is built for.

## Icons & animation

- Icons: `lucide-react`, imported individually per icon (see the large import list in `app/page.tsx`).
- Scroll-triggered fade-ins use the shared `fade` motion variant defined in `app/page.tsx` (`opacity`/`y` animate on viewport entry via `framer-motion`). Reuse this variant shape for new sections instead of inventing a new one.

## Routing

- Never hardcode a route string in a component. Use the `pageRoutes` constants from `lib/constants.ts` with `next/navigation`'s `useRouter()` or `next/link`.
