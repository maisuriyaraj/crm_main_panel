"use client";

import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute } from "@/lib/constants";
import { createActions, visibleCreateActions } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Quick create. Each entry needs its module's `.create` key, so a member who may
// only read sees no button at all rather than one that fails on submit. Links
// carry `?new=1`; the module page opens its own create dialog and drops the param.
export function CreateMenu() {
  const router = useRouter();
  const params = useParams<{ orgnization: string }>();
  const { can } = useAuth();
  const actions = visibleCreateActions(createActions, can);

  if (actions.length === 0) return null;

  const orgSlug = params?.orgnization ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Create">
          <Plus className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onSelect={() => router.push(`${buildOrgRoute(orgSlug, action.href)}?${action.param}=1`)}
          >
            <action.icon className="size-4" aria-hidden />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
