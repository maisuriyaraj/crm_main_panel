// What a notification looks like in the bell, and where clicking it goes.
//
// Kept out of the component so the icon set and the routing are in one place: the
// API sends a record kind, never a panel URL, so turning a kind into a route is this
// panel's own job and belongs with its route constants.

import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CreditCard,
  Gauge,
  Megaphone,
  PlugZap,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import type { NotificationLink } from "@/lib/usage/types";

// The icon and its tone per notification type. The tone is a semantic token, never a
// raw colour, and it carries no meaning on its own: every entry also has its words,
// so an icon is decoration for people who can see it and nothing is lost without it.
interface Look {
  Icon: LucideIcon;
  tone: string;
}

const LOOKS: Record<string, Look> = {
  "lead.assigned": { Icon: UserPlus, tone: "text-primary" },
  "lead.followup_due": { Icon: CalendarClock, tone: "text-primary" },
  "billing.invoice_paid": { Icon: ReceiptText, tone: "text-primary" },
  "billing.invoice_overdue": { Icon: AlertTriangle, tone: "text-destructive" },
  "ads.campaign_paused": { Icon: Megaphone, tone: "text-muted-foreground" },
  "ads.campaign_budget_exhausted": { Icon: Megaphone, tone: "text-destructive" },
  "usage.limit_warning": { Icon: Gauge, tone: "text-primary" },
  "usage.limit_reached": { Icon: Gauge, tone: "text-destructive" },
  "usage.leads_held": { Icon: Gauge, tone: "text-destructive" },
  "subscription.invoice_issued": { Icon: CreditCard, tone: "text-primary" },
  "subscription.trial_ending": { Icon: CalendarClock, tone: "text-destructive" },
  "team.invitation_accepted": { Icon: Users, tone: "text-primary" },
  "integration.reconnect_required": { Icon: PlugZap, tone: "text-destructive" },
  "security.password_changed": { Icon: ShieldCheck, tone: "text-primary" },
  "security.mfa_reset": { Icon: ShieldCheck, tone: "text-primary" },
};

const FALLBACK: Look = { Icon: Bell, tone: "text-muted-foreground" };

// A type the API gains later still gets an icon rather than a gap, and the family
// prefix is enough to pick a fitting one.
export const lookOf = (type: string): Look => {
  if (LOOKS[type]) return LOOKS[type];
  if (type.startsWith("lead.")) return { Icon: UserPlus, tone: "text-primary" };
  if (type.startsWith("usage.")) return { Icon: Gauge, tone: "text-primary" };
  if (type.startsWith("billing.") || type.startsWith("subscription.")) return { Icon: CreditCard, tone: "text-primary" };
  if (type.startsWith("ads.")) return { Icon: Megaphone, tone: "text-muted-foreground" };
  if (type.startsWith("security.")) return { Icon: ShieldCheck, tone: "text-primary" };
  if (type.startsWith("integration.")) return { Icon: PlugZap, tone: "text-destructive" };
  return FALLBACK;
};

// The page each record kind belongs on. No record here has a page of its own: a lead,
// an invoice and a campaign are each shown on a list. A kind carries a query parameter
// only where that list can actually open the one record — today just the lead sheet.
// An invoice or a campaign therefore lands on its list, and the notice's own words
// name which one it is about.
//
// A kind this panel has no screen for is left out on purpose, so the bell marks the
// entry read and stays where it is rather than going somewhere that does not exist.
// `client` is one of those: the tenant's own Billing & Invoices module is not built.
const KIND_ROUTES: Record<string, { route: string; param?: string }> = {
  lead: { route: pageRoutes.leads, param: "lead" },
  invoice: { route: pageRoutes.settingsBilling },
  campaign: { route: pageRoutes.adsManagerCampaigns },
  usage: { route: pageRoutes.settingsUsage },
  subscription: { route: pageRoutes.settingsUsage },
  // A connection that stopped working is fixed from the Ads Manager overview, which
  // is where the ad platforms are connected.
  integrations: { route: pageRoutes.adsManager },
  team: { route: pageRoutes.settingsTeam },
  profile: { route: pageRoutes.settingsSecurity },
};

/**
 * Where to go when a notification is clicked, or null when there is nowhere: an
 * older row with no link, a kind this panel has no screen for, or a link the API
 * could not work out. The caller then marks it read and leaves the list open.
 */
export const hrefForLink = (link: NotificationLink | null, orgSlug: string): string | null => {
  if (!link) return null;
  // An absolute link is not followed: only this panel's own paths are, so a value
  // from the API can never send someone off the site.
  if (link.url) return link.url.startsWith("/") ? link.url : null;
  if (!link.kind) return null;
  const target = KIND_ROUTES[link.kind];
  if (!target) return null;
  const path = buildOrgRoute(orgSlug, target.route);
  if (!link.id || !target.param) return path;
  return `${path}?${target.param}=${encodeURIComponent(link.id)}`;
};
