"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useVisibleSettingsLinks } from "@/components/layout/settings-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Everything the top bar can't show at this width. Below `md` the Settings gear
// and the profile avatar are hidden and their entries appear here instead, so a
// 360px bar never wraps and never scrolls sideways — it just holds fewer icons.
// Above `md` this button is hidden, because nothing is left over to put in it.
export function MoreMenu() {
  const params = useParams<{ orgnization: string }>();
  const { user, logout } = useAuth();
  const settings = useVisibleSettingsLinks();
  const orgSlug = params?.orgnization ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More" className="md:hidden">
          <MoreHorizontal className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user?.fullName ?? "Signed in"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={buildOrgRoute(orgSlug, pageRoutes.settingsSecurity)}>Account settings &amp; security</Link>
        </DropdownMenuItem>
        {settings.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            {settings.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={buildOrgRoute(orgSlug, link.href)}>{link.label}</Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()}>
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
