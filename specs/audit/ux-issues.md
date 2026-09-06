# UX Issues

---

### [HIGH] X1 — Footer links go to the wrong destinations for almost every label
- Location: [app/page.tsx:491](app/page.tsx#L491), [app/page.tsx:495](app/page.tsx#L495), [app/page.tsx:499](app/page.tsx#L499); label arrays at [app/page.tsx:127-129](app/page.tsx#L127-L129)
- Flow affected: Marketing landing page > footer navigation
- Description: Each footer column maps its labels to a single shared `href`, regardless of which label was clicked:
  - "Features", "Pricing", "Integrations", "Documentation" all link to `#features` (only "Features" is actually accurate).
  - "About RJ Industries", "Contact", "Careers", "Partners" all link to `mailto:hello@orbitops.io` (arguably reasonable for "Contact", but "Careers" and "Partners" opening an email compose window instead of a careers/partners page is misleading).
  - "Privacy Policy", "Terms", "Security" all link to `#top` (scrolls to the page header) — none of these legal pages exist or are reachable.
- How to reproduce: Click "Terms" or "Security" in the footer — the page just scrolls to the top instead of showing any policy content.
- Impact: Every footer link whose label implies a distinct destination ("Careers", "Documentation", "Privacy Policy", etc.) is effectively a dead end or a bait-and-switch to an unrelated action. This is the kind of thing a prospective customer notices and loses trust over.
- Suggested fix: Either build the real destination pages/anchors, or (as an interim step) point every one of these at a single honest placeholder ("Coming soon") rather than a misleading anchor/mailto.
- Effort estimate: M (real pages) / S (honest placeholders)

---

### [MEDIUM] X2 — Sign-in form fields have no visible keyboard focus indicator
- Location: [app/auth/signin/page.tsx:164-169](app/auth/signin/page.tsx#L164-L169) (email), [app/auth/signin/page.tsx:190-196](app/auth/signin/page.tsx#L190-L196) (password)
- Flow affected: Sign-in (the only real login entry point in the app)
- Description: Both fields are raw `<input>` elements with `className="... outline-none"` and no replacement focus style. Compare with the shared `Input` primitive (`components/ui/input.tsx:11`), used correctly on the very next screen (`reset-password/page.tsx`), which pairs `focus-visible:outline-none` with `focus-visible:ring-1 focus-visible:ring-ring` — i.e. it removes the default outline but replaces it with a visible ring. The sign-in page only does the removal half.
- How to reproduce: Load `/auth/signin` and tab through the form using only the keyboard. Neither the Email nor Password field shows any visible focus outline/ring as focus moves onto them.
- Impact: A WCAG 2.4.7 (Focus Visible) failure on the single most important page for a new or keyboard-only/screen-reader-adjacent user to interact with correctly. Keyboard users can't tell which field is currently focused.
- Suggested fix: Replace the raw `<input>` elements with the shared `Input` component (also fixes the component-structure rule violation noted in `code-improvements.md`).
- Effort estimate: S

---

### [MEDIUM] X3 — Deep-link redirect target is captured but never used after login
- Location: [proxy.ts:87-94](proxy.ts#L87-L94) (sets `?redirect=`), [app/auth/signin/page.tsx:37-65](app/auth/signin/page.tsx#L37-L65) (never reads it)
- Flow affected: Any protected route bounce-to-login (currently `/dashboard`, `/settings/team`; will affect more routes once B2 is fixed)
- Description: When `proxy.ts` redirects an unauthenticated visitor away from a protected route, it appends the original path as `?redirect=<pathname>` on the sign-in URL. `LoginPage`'s `onSubmit` never reads `useSearchParams()`/`redirect` at all — after a successful login it unconditionally sends the user to `mustResetPassword ? resetPassword : <org>/dashboard`.
- How to reproduce: While logged out, visit `/{orgId}/settings/team` directly. You're bounced to `/auth/signin?redirect=%2F123%2Fsettings%2Fteam`. Log in successfully — you land on the Dashboard, not back on Team settings.
- Impact: Minor but real friction on every deep-link/bookmark/shared-link scenario — the user has to manually re-navigate to wherever they were originally headed.
- Suggested fix: Read `redirect` from `useSearchParams()` in `signin/page.tsx` and use it (after validating it's a same-origin, org-scoped path) as the post-login destination instead of always going to the dashboard.
- Effort estimate: S

---

### [MEDIUM] X4 — Leads list "select all" silently selects rows the user can't see
- Location: [app/[orgnization]/leads/page.tsx:334-341](app/[orgnization]/leads/page.tsx#L334-L341)
- Flow affected: Leads > List view > bulk stage-change / bulk assign / bulk delete
- Description: The header checkbox's `onCheckedChange` does `setSelectedIds(checked ? new Set(filteredLeads.map((l) => l.id)) : new Set())` — `filteredLeads` is every lead matching the current filters, not just the rows on the current page. `DataTable` paginates client-side at 10 rows/page by default (`components/ui/data-table.tsx:49`). Checking "select all" while looking at page 1 of a 50-lead filtered result selects all 50, even though only 10 rows visually show a checked box.
- How to reproduce: With more than 10 leads matching the active filters, go to the List view, click the header "select all" checkbox, then open the bulk action bar's Delete confirmation — it reports the true (larger) count, e.g. "Delete 50 lead(s)?", which will surprise a user who only saw 10 rows check themselves.
- Impact: A user can bulk-delete or bulk-reassign far more leads than they intended, based on a checkbox interaction that visually only seemed to affect the current page. This is exactly the kind of surprising bulk-destructive-action gap that causes real data loss.
- Suggested fix: Either scope "select all" to the rows on the current page only (requires `DataTable` to expose its current page's row set to column render props — already noted as a known gap in `specs/leads/leads-ui.md`), or keep "select all across filters" but make the count/scope explicit in the checkbox's own label/tooltip before the user commits to a destructive bulk action.
- Effort estimate: M

---

### [LOW] X5 — Kanban cards block native touch scrolling on mobile/touch devices
- Location: [components/leads/kanban-card.tsx:48-51](components/leads/kanban-card.tsx#L48-L51)
- Flow affected: Leads > Kanban view, on touch devices
- Description: Every draggable lead card has `touch-none` in its class list (`"cursor-grab touch-none py-3 ..."`), which sets `touch-action: none` — this disables all native touch gestures, including page/column scrolling, whenever a touch starts on the card itself. `specs/leads/leads-ui.md`'s own Design section flagged this exact area as "worth a manual check once built," but no such check/fix appears to have happened.
- How to reproduce: On a touch device (or Chrome DevTools' touch emulation), try to scroll a Kanban column vertically by starting the drag gesture on top of a lead card rather than the empty column background.
- Impact: On a board with more leads in a column than fit on one screen, a touch user who instinctively starts scrolling from on top of a card (very likely, since cards fill most of the column) gets nothing — the card tries to become a drag instead, and the page doesn't scroll.
- Suggested fix: Scope `touch-none` more narrowly (e.g. only while `isDragging` is true, or on drag-handle real estate only) rather than the entire card at all times.
- Effort estimate: S
