"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ChevronRight, Moon, Rocket, Sun } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { buildOrgRoute, SITE_NAME } from "@/lib/constants";
import { isNavParent, navGroups, visibleNavGroups, type NavParent } from "@/lib/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams<{ orgnization: string }>();
  const { can } = useAuth();
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
        {visibleNavGroups(navGroups, can).map((group) => (
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
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <ThemeToggle />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
      >
        {isDark ? <Moon /> : <Sun />}
        <span>{isDark ? "Dark mode" : "Light mode"}</span>
        <Switch
          checked={isDark}
          onCheckedChange={toggleTheme}
          tabIndex={-1}
          aria-hidden="true"
          className="ml-auto pointer-events-none group-data-[collapsible=icon]:hidden"
        />
      </SidebarMenuButton>
    </SidebarMenuItem>
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
