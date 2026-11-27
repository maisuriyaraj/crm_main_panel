import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  ReceiptText,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { pageRoutes } from "@/lib/constants";

// Every item names the `.view` key that hides it, and the catalog module that
// explains why it is unavailable. UX only; the API is the real gate, and each
// page shows a "no access" state for a typed-in URL.
//
// Only modules with a page today are listed. An item added here before its page
// exists would be a link to Next's not-found page, which reads as a broken app
// rather than a feature that hasn't shipped.
export type NavLink = {
  label: string;
  icon: LucideIcon;
  href: string;
  permission: string;
  module: string;
};

export type NavGroupConfig = {
  label: string;
  items: NavLink[];
};

// The top bar's Settings menu. There is no `/settings` index page, so the gear
// opens the settings pages the member may actually see rather than linking to a
// route that does not exist. `permission: null` means every member may see it.
export type SettingsLink = {
  label: string;
  href: string;
  permission: string | null;
};

export const settingsLinks: SettingsLink[] = [
  { label: "Team", href: pageRoutes.settingsTeam, permission: "team.view" },
  { label: "Billing", href: pageRoutes.settingsBilling, permission: "billing.view" },
  // `/auth/me` drops the invoices keys while billing_enabled is off, so this one
  // permission gates the flag and the role together.
  { label: "Invoice settings", href: pageRoutes.settingsBillingSettings, permission: "invoices.view" },
  { label: "Plan & usage", href: pageRoutes.settingsUsage, permission: null },
  { label: "Security", href: pageRoutes.settingsSecurity, permission: null },
  { label: "Notifications", href: pageRoutes.settingsNotifications, permission: null },
  { label: "Company", href: pageRoutes.settingsCompany, permission: "organization.settings.manage" },
];

export const navGroups: NavGroupConfig[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: pageRoutes.dashboard, permission: "dashboard.view", module: "dashboard" },
      { label: "Leads", icon: UserPlus, href: pageRoutes.leads, permission: "leads.view", module: "leads" },
      { label: "Contacts", icon: Users, href: pageRoutes.contacts, permission: "contacts.view", module: "contacts" },
    ],
  },
  {
    // The two Ads pages with data behind them. The Ad Manager's other tabs
    // (Ad Sets, Creatives, Audiences, A/B testing, Analytics) are reached from
    // the tab strip inside the Ad Manager, not from here: their pages exist but
    // only say the feature is still to come, and a sidebar full of those would
    // promise more than the product does.
    label: "Advertising",
    items: [
      { label: "Ads Manager", icon: Megaphone, href: pageRoutes.adsManager, permission: "ads.view", module: "ads" },
      { label: "Ad campaigns", icon: BarChart3, href: pageRoutes.adsManagerCampaigns, permission: "ads.view", module: "ads" },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Team", icon: UsersRound, href: pageRoutes.settingsTeam, permission: "team.view", module: "team" },
      { label: "Billing", icon: CreditCard, href: pageRoutes.settingsBilling, permission: "billing.view", module: "billing" },
      // How the organization invoices its own clients. Its own invoice screens do
      // not exist yet, so only the settings page is linked.
      { label: "Invoice settings", icon: ReceiptText, href: pageRoutes.settingsBillingSettings, permission: "invoices.view", module: "invoices" },
    ],
  },
];

// The Create (+) menu. Each entry needs its module's `.create` key *and* a page
// that can actually open a create form, so the menu never offers something that
// leads nowhere. `param` is appended as `?<param>=1`; the module page reads it
// once and opens its own create dialog.
export type CreateAction = {
  label: string;
  icon: LucideIcon;
  href: string;
  permission: string;
  module: string;
  param: string;
};

export const createActions: CreateAction[] = [
  { label: "New lead", icon: UserPlus, href: pageRoutes.leads, permission: "leads.create", module: "leads", param: "new" },
  { label: "New contact", icon: Users, href: pageRoutes.contacts, permission: "contacts.create", module: "contacts", param: "new" },
];

export type ModuleOff = { module: string; reason: string } | null;

// Create is a write, so unlike the nav it is never offered on the strength of an
// ended subscription: the API would refuse it. Permission alone decides.
export function visibleCreateActions(
  actions: CreateAction[],
  can: (permission: string) => boolean,
): CreateAction[] {
  return actions.filter((action) => can(action.permission));
}

// True when the member should see the item at all.
//
// `/auth/me` already removes a module's permissions when the plan, a feature flag
// or the subscription closed it, so the permission alone decides most items. The
// one exception is a subscription that has ended: the member keeps the entry and
// the page explains how to get the module back, because hiding the app wholesale
// would leave nothing to act on. A module switched off by plan or flag is not
// shown at all — not shown disabled — since no amount of clicking opens it.
export function isNavItemVisible(
  item: Pick<NavLink, "permission" | "module">,
  can: (permission: string) => boolean,
  moduleOff: (module: string) => ModuleOff,
): boolean {
  if (can(item.permission)) return true;
  return moduleOff(item.module)?.reason === "subscription_inactive";
}

// Drops items the member can't open, then any group left empty.
export function visibleNavGroups(
  groups: NavGroupConfig[],
  can: (permission: string) => boolean,
  moduleOff: (module: string) => ModuleOff,
): NavGroupConfig[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => isNavItemVisible(item, can, moduleOff)) }))
    .filter((group) => group.items.length > 0);
}
