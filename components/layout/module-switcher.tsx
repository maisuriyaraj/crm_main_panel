"use client";

import { useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute } from "@/lib/constants";
import { navGroups, visibleNavGroups } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Jump between modules without opening the sidebar. Built on command.tsx, so it
// is keyboard-driven for free: type to filter, arrow keys to move, Enter to go.
// It lists exactly what the sidebar lists — same config, same visibility rule —
// so the two can never disagree about what this member may open.
export function ModuleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ orgnization: string }>();
  const { can, moduleOff } = useAuth();
  const [open, setOpen] = useState(false);

  const orgSlug = params?.orgnization ?? "";
  const groups = visibleNavGroups(navGroups, can, moduleOff);
  const current = groups
    .flatMap((group) => group.items)
    .find((item) => {
      const href = buildOrgRoute(orgSlug, item.href);
      return pathname === href || pathname.startsWith(`${href}/`);
    });

  if (groups.length === 0) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(buildOrgRoute(orgSlug, href));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Switch module"
          className="max-w-44 justify-between gap-2"
        >
          <span className="truncate">{current?.label ?? "Go to…"}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Go to module…" />
          <CommandList>
            <CommandEmpty>No module found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem key={item.label} value={item.label} onSelect={() => go(item.href)}>
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
