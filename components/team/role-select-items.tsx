"use client";

import type { TeamRole } from "@/lib/team/types";
import { useAuth } from "@/hooks/useAuth";
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";

const describe = (role: TeamRole) =>
  [role.description, `${role.permissionCount} permission${role.permissionCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ");

// Role options grouped Built-in / Custom for the invite and change-role
// pickers. Roles the caller can't assign stay visible but disabled, so it is
// clear they exist; the API refuses them anyway.
export function RoleSelectItems({ roles }: { roles: TeamRole[] }) {
  // Admin-tier access would outlive a 30-minute support session, so the API
  // refuses it while OrbitOps support is signed in as a member. The option
  // stays visible, with the reason, rather than quietly disappearing.
  const { isImpersonating } = useAuth();
  const builtIn = roles.filter((role) => role.isSystem);
  const custom = roles.filter((role) => !role.isSystem);

  const item = (role: TeamRole) => {
    const blockedForSupport = isImpersonating && role.isAdmin;
    const note = blockedForSupport
      ? "Support sessions can't give admin access"
      : role.assignable
        ? describe(role)
        : "You can't assign this role";

    return (
      <SelectItem key={role.id} value={role.id} disabled={!role.assignable || blockedForSupport}>
        {role.label}
        <span className="ml-2 text-xs text-muted-foreground">{note}</span>
      </SelectItem>
    );
  };

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
