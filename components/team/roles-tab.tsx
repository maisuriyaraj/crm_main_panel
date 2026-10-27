"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Plus } from "lucide-react";

import { MAX_CUSTOM_ROLES } from "@/lib/roles/schema";
import type { TeamRole } from "@/lib/team/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteRoleDialog } from "@/components/team/delete-role-dialog";

interface RolesTabProps {
  roles: TeamRole[];
  isLoading: boolean;
  error: string | null;
  canManage: boolean;
  onRetry: () => void;
  onChanged: () => void;
  roleHref: (roleId: string) => string;
  newRoleHref: (fromRoleId?: string) => string;
  membersHref: (roleId: string) => string;
  invitationsHref: string;
}

export function RolesTab({
  roles,
  isLoading,
  error,
  canManage,
  onRetry,
  onChanged,
  roleHref,
  newRoleHref,
  membersHref,
  invitationsHref,
}: RolesTabProps) {
  const [deleting, setDeleting] = useState<TeamRole | null>(null);
  const customCount = roles.filter((role) => !role.isSystem).length;
  const atLimit = customCount >= MAX_CUSTOM_ROLES;

  const columns: DataTableColumn<TeamRole>[] = [
    {
      key: "name",
      header: "Role",
      render: (role) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={roleHref(role.id)} className="font-medium hover:underline">
            {role.label}
          </Link>
          {role.isSystem && <Badge variant="secondary">Built-in</Badge>}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "hidden md:table-cell",
      render: (role) => <span className="text-muted-foreground">{role.description ?? "—"}</span>,
    },
    {
      key: "members",
      header: "Members",
      render: (role) => (
        <span className="tabular-nums">
          {role.memberCount > 0 ? (
            <Link href={membersHref(role.id)} className="hover:underline">
              {role.memberCount}
            </Link>
          ) : (
            0
          )}
          {role.pendingInvitationCount > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">+{role.pendingInvitationCount} invited</span>
          )}
        </span>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      className: "hidden sm:table-cell",
      render: (role) => <span className="tabular-nums">{role.permissionCount}</span>,
    },
    {
      key: "updated",
      header: "Last updated",
      className: "hidden lg:table-cell",
      render: (role) => (
        <span className="text-muted-foreground">
          {role.isSystem || !role.updatedAt ? "—" : formatDistanceToNow(new Date(role.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (role) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${role.label}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={roleHref(role.id)}>{role.editable ? "Edit" : "View"}</Link>
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem asChild disabled={atLimit}>
                <Link href={newRoleHref(role.id)}>Duplicate</Link>
              </DropdownMenuItem>
            )}
            {role.editable && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleting(role)}
              >
                {role.deletable ? "Delete" : "Delete…"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (error && !roles.length) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>Couldn&apos;t load roles. {error}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          {customCount} of {MAX_CUSTOM_ROLES} custom roles
        </p>
        {canManage &&
          (atLimit ? (
            <Button disabled title={`You've reached the limit of ${MAX_CUSTOM_ROLES} custom roles`}>
              <Plus />
              Create role
            </Button>
          ) : (
            <Button asChild>
              <Link href={newRoleHref()}>
                <Plus />
                Create role
              </Link>
            </Button>
          ))}
      </div>

      {!isLoading && customCount === 0 && (
        <Alert>
          <AlertDescription>
            Create a custom role to give people exactly the access they need. Built-in roles can&apos;t be changed, but you can
            duplicate one as a starting point.
          </AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={roles}
        getRowId={(role) => role.id}
        isLoading={isLoading && !roles.length}
        searchKeys={["label", "description"]}
        searchPlaceholder="Search roles..."
        emptyMessage="No roles found."
      />

      <DeleteRoleDialog
        role={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onChanged}
        membersHref={membersHref}
        invitationsHref={invitationsHref}
      />
    </div>
  );
}
