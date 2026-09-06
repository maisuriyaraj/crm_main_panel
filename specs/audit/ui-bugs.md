# UI Bugs

Pure visual/styling defects — see `ux-issues.md` for interaction/comprehension problems (including one accessibility finding that reads similarly, e.g. missing focus indicator on the sign-in form, which is filed there per the audit's category rule since accessibility gaps are explicitly a UX-issue category).

---

### [MEDIUM] U1 — Dark theme is fully built but completely unreachable
- Location: [app/globals.css:112-153](app/globals.css#L112-L153) (the `.dark` block), [app/globals.css:155-176](app/globals.css#L155-L176) (commented-out OS-preference block)
- Flow affected: Entire app (theming)
- Description: `app/globals.css` defines a complete, ~40-token dark palette under a `.dark` class selector. Nothing in the codebase ever adds a `dark` class to `<html>`/`<body>` — confirmed by repo-wide search: no `next-themes`, no `ThemeProvider`/`useTheme`, no `setTheme`, no manual `classList` toggle anywhere. The one other path that could activate dark mode — an OS-preference `@media (prefers-color-scheme: dark)` block — is explicitly commented out (lines 155-176), with a note saying "remove this block to prevent auto dark mode from OS preference" (i.e., it was deliberately disabled, not just unfinished).
- How to reproduce: Switch the OS/browser to dark mode, or inspect the DOM for any `class="dark"` toggle — there is none. The app renders in light mode unconditionally, always.
- Impact: A meaningful design-system investment (a full second palette, tuned per token) currently has zero effect for any user, in any browser/OS setting. Anyone assuming dark mode "just isn't wired to a toggle yet" would be surprised to find the OS-detection path was intentionally switched off too.
- Suggested fix: Either ship a theme toggle (e.g. `next-themes`) that adds/removes the `dark` class, or re-enable the commented-out `prefers-color-scheme` block if OS-driven dark mode is the intended v1 behavior. If dark mode isn't planned soon, consider flagging the `.dark` block as intentionally unused so a future contributor doesn't assume it's live.
- Effort estimate: S (re-enable OS detection) / M (full toggle with persistence)

---

### [MEDIUM] U2 — Lead form dialog's two-column grid has no responsive breakpoint
- Location: [components/leads/lead-form-dialog.tsx:144](components/leads/lead-form-dialog.tsx#L144)
- Flow affected: Leads > New Lead / Edit Lead dialog
- Description: The form's ten fields (Full Name, Company, Designation, Email, Mobile, Website, Stage, Owner, Priority, Temperature, Deal Value, Probability, Lead Score) are laid out with a hard `grid grid-cols-2 gap-4` — no `grid-cols-1 sm:grid-cols-2` responsive variant. The dialog itself (`DialogContent`, [components/ui/dialog.tsx:41](components/ui/dialog.tsx#L41)) is `w-full max-w-2xl` — on a phone-width viewport it spans the full screen width, so the two columns are unconditionally forced side by side no matter how narrow the viewport gets.
- How to reproduce: Open "New Lead" at a ~375px-wide viewport (e.g. browser devtools mobile emulation). Every paired field (e.g. Priority/Temperature, Deal Value/Probability) is squeezed into roughly half the already-narrow dialog width.
- Impact: Number/select inputs become cramped and harder to tap/read accurately on phone-sized screens — the one place in the app most likely to be used from a phone (quickly logging a new lead after a call).
- Suggested fix: Change the wrapper to `grid grid-cols-1 gap-4 sm:grid-cols-2`, keeping the existing `col-span-2` field (Full Name) as-is.
- Effort estimate: S

---

### [LOW] U3 — Loading state for tables is plain text, not the app's own `Skeleton` pattern
- Location: [app/[orgnization]/settings/team/page.tsx:177](app/[orgnization]/settings/team/page.tsx#L177), [app/[orgnization]/leads/page.tsx:601](app/[orgnization]/leads/page.tsx#L601)
- Flow affected: Team list, Leads list, while data is loading
- Description: Both screens pass `emptyMessage={isLoading ? "Loading..." : "..."}` into `DataTable`, which renders it as a single centered text row inside the table body ([components/ui/data-table.tsx:152-158](components/ui/data-table.tsx#L152-L158)). The app already has a real `Skeleton` primitive (`components/ui/skeleton.tsx`) and uses it elsewhere (`app/auth/reset-password/page.tsx` imports it), but the two list screens that actually fetch remote data on mount never use it — they show a plain "Loading..." string where skeleton rows would be expected.
- How to reproduce: Throttle the network and open Leads or Settings > Team; the table header renders immediately with a single "Loading..." text row beneath it instead of placeholder rows.
- Impact: Minor polish gap, but a visible inconsistency against the app's own established loading-state component, on the two screens most likely to be slow (real API calls with real data volume).
- Suggested fix: Add an optional `isLoading`/skeleton-row mode to `DataTable` (or render `Skeleton` rows conditionally above/instead of the table body) instead of overloading `emptyMessage`.
- Effort estimate: S
