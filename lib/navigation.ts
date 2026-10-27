import {
  Building2,
  Briefcase,
  LayoutDashboard,
  Megaphone,
  SquareCheck,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { pageRoutes } from "@/lib/constants";

// Every item names the `.view` key that hides it. UX only; the API is the
// real gate, and each page shows a "no access" state for a typed-in URL.
export type NavLink = {
  label: string;
  icon: LucideIcon;
  href: string;
  permission: string;
};

export type NavSubLink = {
  label: string;
  href: string;
};

export type NavParent = {
  label: string;
  icon: LucideIcon;
  permission: string;
  children: NavSubLink[];
};

export type NavEntry = NavLink | NavParent;

export type NavGroupConfig = {
  label: string;
  items: NavEntry[];
};

export const navGroups: NavGroupConfig[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: pageRoutes.dashboard, permission: "dashboard.view" },
      { label: "Leads", icon: UserPlus, href: pageRoutes.leads, permission: "leads.view" },
      { label: "Contacts", icon: Users, href: pageRoutes.contacts, permission: "contacts.view" },
      { label: "Companies", icon: Building2, href: pageRoutes.companies, permission: "companies.view" },
      { label: "Deals", icon: Briefcase, href: pageRoutes.deals, permission: "deals.view" },
      { label: "Tasks", icon: SquareCheck, href: pageRoutes.tasks, permission: "tasks.view" },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Ads Manager",
        icon: Megaphone,
        permission: "ads.view",
        children: [
          { label: "Overview", href: pageRoutes.adsManagerOverview },
          { label: "Campaigns", href: pageRoutes.adsManagerCampaigns },
          { label: "Analytics", href: pageRoutes.adsManagerAnalytics },
          { label: "Assets", href: pageRoutes.adsManagerAssets },
          { label: "Account Center", href: pageRoutes.adsManagerAccountCenter },
        ],
      },
      { label: "Growth", icon: TrendingUp, href: pageRoutes.growth, permission: "growth.view" },
    ],
  },
  {
    label: "Organization",
    items: [{ label: "Team", icon: UsersRound, href: pageRoutes.settingsTeam, permission: "team.view" }],
  },
];

export function isNavParent(item: NavEntry): item is NavParent {
  return "children" in item;
}

// Drops items the user can't open, then any group left empty.
export function visibleNavGroups(groups: NavGroupConfig[], can: (permission: string) => boolean): NavGroupConfig[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0);
}
