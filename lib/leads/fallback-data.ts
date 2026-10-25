// Stopgap static data for the Leads form's Stage dropdown, used only when the
// real API returns an empty list (backend not seeded yet for this org).
// `page.tsx` prefers real data and only falls back to this, so once the
// backend catches up it stops being used automatically.
//
// Caveat: these ids don't exist in the real backend. Submitting a lead with
// a fallback stage selected will be rejected — this is a UI-unblocking
// measure, not a working create path.

import type { LeadStage } from "@/lib/leads/types";

export const FALLBACK_LEAD_STATUSES: LeadStage[] = [
  { id: "fallback-new", name: "New", color: "var(--chart-1)", sortOrder: 1 },
  { id: "fallback-contacted", name: "Contacted", color: "var(--chart-2)", sortOrder: 2 },
  { id: "fallback-qualified", name: "Qualified", color: "var(--chart-3)", sortOrder: 3 },
  { id: "fallback-proposal", name: "Proposal", color: "var(--chart-4)", sortOrder: 4 },
  { id: "fallback-won", name: "Won", color: "var(--chart-5)", sortOrder: 5, isWon: true },
  { id: "fallback-lost", name: "Lost", color: "var(--destructive)", sortOrder: 6, isLost: true },
];
