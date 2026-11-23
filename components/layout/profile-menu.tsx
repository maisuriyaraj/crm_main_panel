"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Gauge, LogOut, ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialsOf = (name: string | undefined) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

// Who is signed in, and the few things that belong to the person rather than the
// workspace. "Account settings" and "Security" are the same page — password and
// MFA live there and there is no separate profile page — so it is listed once
// rather than twice pointing at one place.
export function ProfileMenu() {
  const params = useParams<{ orgnization: string }>();
  const { user, role, logout } = useAuth();
  const orgSlug = params?.orgnization ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Your account">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initialsOf(user?.fullName)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user?.fullName ?? "Signed in"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
          {role && <p className="mt-1 truncate text-xs text-muted-foreground">{role}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={buildOrgRoute(orgSlug, pageRoutes.settingsSecurity)}>
            <ShieldCheck className="size-4" aria-hidden />
            Account settings &amp; security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={buildOrgRoute(orgSlug, pageRoutes.settingsUsage)}>
            <Gauge className="size-4" aria-hidden />
            Plan &amp; usage
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()}>
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
