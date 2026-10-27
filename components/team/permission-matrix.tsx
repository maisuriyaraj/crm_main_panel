"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";

import { indexCatalog, moduleSelection, toggleKey, toggleModule, type SelectionChange } from "@/lib/roles/matrix";
import type { PermissionModule } from "@/lib/team/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PermissionMatrixProps {
  modules: PermissionModule[];
  selected: Set<string>;
  onChange: (change: SelectionChange) => void;
  disabled?: boolean;
}

const checkboxId = (key: string) => `perm-${key.replace(/[._]/g, "-")}`;

// One card per catalog module. Ticking an action also ticks what it needs
// (e.g. View); unticking View clears what depends on it. Reserved permissions
// are shown, locked, so admins can see why a custom role can't have them.
export function PermissionMatrix({ modules, selected, onChange, disabled = false }: PermissionMatrixProps) {
  const index = useMemo(() => indexCatalog(modules), [modules]);

  return (
    <div className="space-y-3">
      {modules.map((group) => (
        <ModuleCard
          key={group.module}
          group={group}
          selected={selected}
          disabled={disabled}
          onToggleKey={(key, on) => onChange(toggleKey(selected, key, on, index))}
          onToggleModule={() => onChange({ next: toggleModule(group, selected, index), alsoAdded: [], alsoRemoved: [] })}
        />
      ))}
    </div>
  );
}

interface ModuleCardProps {
  group: PermissionModule;
  selected: Set<string>;
  disabled: boolean;
  onToggleKey: (key: string, on: boolean) => void;
  onToggleModule: () => void;
}

function ModuleCard({ group, selected, disabled, onToggleKey, onToggleModule }: ModuleCardProps) {
  const planned = group.status === "planned";
  const [open, setOpen] = useState(!planned);
  const selection = moduleSelection(group, selected);
  const locked = group.permissions.length - selection.selectable;
  const allId = `perm-module-${group.module}`;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={allId}
            checked={selection.state}
            onCheckedChange={onToggleModule}
            disabled={disabled || selection.selectable === 0}
            aria-label={`Select all ${group.label} permissions`}
          />
          <label htmlFor={allId} className="text-sm font-semibold">
            {group.label}
          </label>
          {planned && <Badge variant="outline">Coming soon</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {selection.selected} of {selection.selectable}
            {locked > 0 ? ` · ${locked} locked` : ""}
          </span>
          <CollapsibleTrigger
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
          >
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        {planned && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            This module isn&apos;t available yet. These permissions apply when it launches.
          </p>
        )}
        <ul>
          {group.permissions.map((permission) => {
            const id = checkboxId(permission.key);
            return (
              <li
                key={permission.key}
                className={cn("flex items-start gap-3 border-t px-3 py-2.5", permission.reserved && "bg-muted/30")}
              >
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  checked={!permission.reserved && selected.has(permission.key)}
                  disabled={disabled || permission.reserved}
                  onCheckedChange={(checked) => onToggleKey(permission.key, checked === true)}
                />
                <label htmlFor={id} className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{permission.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {permission.description}
                    {permission.reserved ? " · Only Owner and Admin can have this." : ""}
                  </span>
                </label>
                {permission.reserved && <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Locked" />}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
