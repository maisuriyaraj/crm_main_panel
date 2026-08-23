"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Building2,
  Briefcase,
  ChevronRight,
  LayoutDashboard,
  Megaphone,
  Rocket,
  SquareCheck,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes, SITE_NAME } from "@/lib/constants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavLink = {
  label: string;
  icon: LucideIcon;
  href: string;
};

type NavSubLink = {
  label: string;
  href: string;
};

type NavParent = {
  label: string;
  icon: LucideIcon;
  children: NavSubLink[];
};

type NavEntry = NavLink | NavParent;

type NavGroupConfig = {
  label: string;
  roles?: string[];
  items: NavEntry[];
};

const navGroups: NavGroupConfig[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: pageRoutes.dashboard },
      { label: "Leads", icon: UserPlus, href: pageRoutes.leads },
      { label: "Contacts", icon: Users, href: pageRoutes.contacts },
      { label: "Companies", icon: Building2, href: pageRoutes.companies },
      { label: "Deals", icon: Briefcase, href: pageRoutes.deals },
      { label: "Tasks", icon: SquareCheck, href: pageRoutes.tasks },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Ads Manager",
        icon: Megaphone,
        children: [
          { label: "Overview", href: pageRoutes.adsManagerOverview },
          { label: "Campaigns", href: pageRoutes.adsManagerCampaigns },
          { label: "Analytics", href: pageRoutes.adsManagerAnalytics },
          { label: "Assets", href: pageRoutes.adsManagerAssets },
          { label: "Account Center", href: pageRoutes.adsManagerAccountCenter },
        ],
      },
      { label: "Growth", icon: TrendingUp, href: pageRoutes.growth },
    ],
  },
  {
    label: "Organization",
    roles: ["org_admin"],
    items: [{ label: "Team", icon: UsersRound, href: pageRoutes.settingsTeam }],
  },
];

function isNavParent(item: NavEntry): item is NavParent {
  return "children" in item;
}

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams<{ orgnization: string }>();
  const { role } = useAuth();
  const orgSlug = params?.orgnization ?? "";

  const buildHref = (route: string) => buildOrgRoute(orgSlug, route);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="size-4" />
          </span>
          <span className="font-display text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            {SITE_NAME}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          if (group.roles && !group.roles.includes(role ?? "")) {
            return null;
          }

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) =>
                    isNavParent(item) ? (
                      <AdsManagerNavItem
                        key={item.label}
                        item={item}
                        buildHref={buildHref}
                        isActive={isActive}
                      />
                    ) : (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(buildHref(item.href))}
                          tooltip={item.label}
                        >
                          <Link href={buildHref(item.href)}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

function AdsManagerNavItem({
  item,
  buildHref,
  isActive,
}: {
  item: NavParent;
  buildHref: (route: string) => string;
  isActive: (href: string) => boolean;
}) {
  const hasActiveChild = item.children.some((child) => isActive(buildHref(child.href)));

  return (
    <Collapsible defaultOpen={hasActiveChild} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={hasActiveChild} tooltip={item.label}>
            <item.icon />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => {
              const href = buildHref(child.href);

              return (
                <SidebarMenuSubItem key={child.label}>
                  <SidebarMenuSubButton asChild isActive={isActive(href)}>
                    <Link href={href}>{child.label}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
