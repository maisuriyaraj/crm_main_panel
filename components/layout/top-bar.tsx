"use client";

import { AppBreadcrumb } from "@/components/layout/app-breadcrumb";
import { CreateMenu } from "@/components/layout/create-menu";
import { ModuleSwitcher } from "@/components/layout/module-switcher";
import { MoreMenu } from "@/components/layout/more-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

// The shared top bar. Which icons show is decided by CSS width classes rather
// than by measuring in JavaScript: there is no reflow on first paint and no
// resize listener, and the breakpoints are visible in the markup.
//
// Narrow (360px) keeps only what a phone needs — the sidebar toggle, Create, the
// bell and More. Settings and the profile avatar are hidden there and their
// entries move into More, which is itself hidden from `md` up because nothing is
// left over. Nothing wraps and nothing overflows: the bar simply holds less.
export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
      <SidebarTrigger className="shrink-0" />

      {/* Below `md` the switcher goes: the breadcrumb already says where we are,
          and the sidebar toggle is right there for moving about. */}
      <div className="hidden shrink-0 md:block">
        <ModuleSwitcher />
      </div>

      {/* The one flexible item, so it is what gives up space as the bar narrows. */}
      <div className="min-w-0 flex-1">
        <AppBreadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <CreateMenu />
        <div className="hidden md:block">
          <SettingsMenu />
        </div>
        <NotificationsBell />
        <div className="hidden md:block">
          <ProfileMenu />
        </div>
        <MoreMenu />
      </div>
    </header>
  );
}
