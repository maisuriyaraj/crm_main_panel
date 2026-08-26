// Stopgap static data for the Leads form's Stage/Owner dropdowns, used only
// when the real API returns an empty list (backend not seeded yet for this
// org, or the assignable-users endpoint isn't ready). `page.tsx` prefers real
// data and only falls back to this, so once the backend catches up these
// stop being used automatically — no code change needed then.
//
// Caveat: these ids don't exist in the real backend. Submitting a lead with
// a fallback stage/owner selected will fail (or be rejected) once the form
// actually posts to a real, unseeded org — this is a UI-unblocking measure,
// not a working create/assign path.

import type { LeadOwner, LeadStage } from "@/lib/leads/types";

export const FALLBACK_LEAD_STATUSES: LeadStage[] = [
  { id: "fallback-new", name: "New", color: "var(--chart-1)", sortOrder: 1 },
  { id: "fallback-contacted", name: "Contacted", color: "var(--chart-2)", sortOrder: 2 },
  { id: "fallback-qualified", name: "Qualified", color: "var(--chart-3)", sortOrder: 3 },
  { id: "fallback-proposal", name: "Proposal", color: "var(--chart-4)", sortOrder: 4 },
  { id: "fallback-won", name: "Won", color: "var(--chart-5)", sortOrder: 5, isWon: true },
  { id: "fallback-lost", name: "Lost", color: "var(--destructive)", sortOrder: 6, isLost: true },
];

export const FALLBACK_OWNERS: LeadOwner[] = [
  { id: "fallback-owner-1", fullName: "Unassigned Pool" },
];
