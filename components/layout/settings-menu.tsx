"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Settings } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute } from "@/lib/constants";
import { settingsLinks } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Which settings pages this member may open. There is no `/settings` index page,
// so the gear lists the real ones instead of linking to a route that would 404.
export function useVisibleSettingsLinks() {
  const { can } = useAuth();
  return settingsLinks.filter((link) => link.permission === null || can(link.permission));
}

export function SettingsMenu() {
  const params = useParams<{ orgnization: string }>();
  const links = useVisibleSettingsLinks();
  const orgSlug = params?.orgnization ?? "";

  if (links.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={buildOrgRoute(orgSlug, link.href)}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
