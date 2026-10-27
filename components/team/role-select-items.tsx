"use client";

import type { TeamRole } from "@/lib/team/types";
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";

const describe = (role: TeamRole) =>
  [role.description, `${role.permissionCount} permission${role.permissionCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ");

// Role options grouped Built-in / Custom for the invite and change-role
// pickers. Roles the caller can't assign stay visible but disabled, so it is
// clear they exist; the API refuses them anyway.
export function RoleSelectItems({ roles }: { roles: TeamRole[] }) {
  const builtIn = roles.filter((role) => role.isSystem);
  const custom = roles.filter((role) => !role.isSystem);

  const item = (role: TeamRole) => (
    <SelectItem key={role.id} value={role.id} disabled={!role.assignable}>
      {role.label}
      <span className="ml-2 text-xs text-muted-foreground">
        {role.assignable ? describe(role) : "You can't assign this role"}
      </span>
    </SelectItem>
  );

  return (
    <>
      <SelectGroup>
        <SelectLabel>Built-in</SelectLabel>
        {builtIn.map(item)}
      </SelectGroup>
      {custom.length > 0 && (
        <>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Custom</SelectLabel>
            {custom.map(item)}
          </SelectGroup>
        </>
      )}
    </>
  );
}
