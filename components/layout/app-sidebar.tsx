"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Bell, Building2, CreditCard, Gauge, LogOut, Moon, Plug, Rocket, ShieldCheck, Sun } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import { OrgLogo } from "@/components/layout/org-logo";
import { useTheme } from "@/hooks/useTheme";
import { buildOrgRoute, pageRoutes, SITE_NAME } from "@/lib/constants";
import { navGroups, visibleNavGroups } from "@/lib/navigation";
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
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams<{ orgnization: string }>();
  const { user, can, moduleOff, logout } = useAuth();
  // Known after the setup wizard loads; changes when an admin uploads a new logo.
  const logoVersion = useAppSelector(
    (state) => state.orgSettings.settings?.logo.updated_at ?? state.onboarding.state?.values.logo.updated_at ?? null,
  );
  const orgName = user?.organizationName || SITE_NAME;
  // Only when the plan has an ad platform to connect; the API checks the same flags.
  const adsOn = useAppSelector((state) => isFeatureOn(state.features, "ads_enabled") && (isFeatureOn(state.features, "ads_meta") || isFeatureOn(state.features, "ads_google")));
  const orgSlug = params?.orgnization ?? "";

  const buildHref = (route: string) => buildOrgRoute(orgSlug, route);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <OrgLogo
            version={logoVersion}
            alt={`${orgName} logo`}
            className="size-8 shrink-0 rounded-lg"
            fallback={
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Rocket className="size-4" />
              </span>
            }
          />
          <span className="truncate font-display text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            {orgName}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleNavGroups(navGroups, can, moduleOff).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {can("organization.settings.manage") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Company settings" isActive={isActive(buildHref(pageRoutes.settingsCompany))}>
                <Link href={buildHref(pageRoutes.settingsCompany)}>
                  <Building2 />
                  <span>Company</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {adsOn && can("organization.settings.manage") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Integrations" isActive={isActive(buildHref(pageRoutes.settingsIntegrations))}>
                <Link href={buildHref(pageRoutes.settingsIntegrations)}>
                  <Plug />
                  <span>Integrations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* Every member may see the plan's limits and usage. */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Plan & usage" isActive={isActive(buildHref(pageRoutes.settingsUsage))}>
              <Link href={buildHref(pageRoutes.settingsUsage)}>
                <Gauge />
                <span>Plan &amp; usage</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* The invoices OrbitOps sends: the same permission the API checks. */}
          {can("billing.view") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Billing" isActive={isActive(buildHref(pageRoutes.settingsBilling))}>
                <Link href={buildHref(pageRoutes.settingsBilling)}>
                  <CreditCard />
                  <span>Billing</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {/* Everyone chooses their own notices. */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Notifications" isActive={isActive(buildHref(pageRoutes.settingsNotifications))}>
              <Link href={buildHref(pageRoutes.settingsNotifications)}>
                <Bell />
                <span>Notifications</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Security" isActive={isActive(buildHref(pageRoutes.settingsSecurity))}>
              <Link href={buildHref(pageRoutes.settingsSecurity)}>
                <ShieldCheck />
                <span>Security</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <ThemeToggle />
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={() => logout()}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
