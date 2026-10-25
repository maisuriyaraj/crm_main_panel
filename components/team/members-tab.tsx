"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, UserPlus, Users } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetOrgUsers } from "@/lib/store/slices/orgUsersSlice";
import type { MemberAction, MemberListQuery, TeamMember } from "@/lib/team/types";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn, type SortDirection } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberActionDialog, type MemberDialogType } from "@/components/team/member-action-dialogs";
import { MemberDetailSheet } from "@/components/team/member-detail-sheet";
import { MemberStatusBadge } from "@/components/team/member-status-badge";

const PAGE_SIZE = 20;
const ALL = "all";
const SEARCH_DEBOUNCE_MS = 350;

type SortKey = NonNullable<MemberListQuery["sort"]>;

const ROW_ACTIONS: Array<{ action: MemberAction & MemberDialogType; label: string }> = [
  { action: "change_role", label: "Change role" },
  { action: "suspend", label: "Suspend" },
  { action: "reactivate", label: "Reactivate" },
  { action: "revoke_sessions", label: "Sign out everywhere" },
  { action: "transfer_ownership", label: "Make owner" },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

interface MembersTabProps {
  orgName: string;
  version: number;
  canInvite: boolean;
  onInvite: () => void;
  onChanged: () => void;
}

export function MembersTab({ orgName, version, canInvite, onInvite, onChanged }: MembersTabProps) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const { users, pagination, isLoading, error } = useAppSelector((state) => state.orgUsers);
  const roles = useAppSelector((state) => state.teamRoles.roles);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDirection }>({ key: "created_at", dir: "desc" });

  const [detailMember, setDetailMember] = useState<TeamMember | null>(null);
  const [dialog, setDialog] = useState<{ type: MemberDialogType; member: TeamMember } | null>(null);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ALL || roleFilter !== ALL;

  const query = useMemo<MemberListQuery>(() => {
    const next: MemberListQuery = { page, limit: PAGE_SIZE, sort: sort.key, order: sort.dir };
    if (search.trim()) next.search = search.trim();
    if (statusFilter !== ALL) next.status = statusFilter as MemberListQuery["status"];
    if (roleFilter !== ALL) next.role_id = roleFilter;
    return next;
  }, [page, search, statusFilter, roleFilter, sort]);

  const load = useCallback(() => {
    dispatch(
      reqToGetOrgUsers({
        data: query,
        onFailure: (failure: unknown) => handleFailure(failure, "Couldn't load your team."),
      }),
    );
  }, [dispatch, query, handleFailure]);

  useEffect(() => {
    load();
  }, [load, version]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter(ALL);
    setRoleFilter(ALL);
    setPage(1);
  };

  const openAction = (type: MemberDialogType, member: TeamMember) => {
    setDetailMember(null);
    setDialog({ type, member });
  };

  const columns: DataTableColumn<TeamMember>[] = [
    {
      key: "full_name",
      header: "Member",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials(row.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="truncate font-medium hover:underline"
                onClick={() => setDetailMember(row)}
              >
                {row.fullName}
              </button>
              {row.isSelf && <Badge variant="outline">You</Badge>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (row) => <Badge variant="secondary">{row.role?.label ?? "—"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <MemberStatusBadge status={row.status} />,
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) => format(new Date(row.createdAt), "PP"),
    },
    {
      key: "last_login_at",
      header: "Last active",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) =>
        row.lastLoginAt ? formatDistanceToNow(new Date(row.lastLoginAt), { addSuffix: true }) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (row) => {
        const available = ROW_ACTIONS.filter(({ action }) => row.allowedActions.includes(action));
        const canRemove = row.allowedActions.includes("remove");

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${row.fullName}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDetailMember(row)}>View details</DropdownMenuItem>
                {available.map(({ action, label }) => (
                  <DropdownMenuItem key={action} onSelect={() => openAction(action, row)}>
                    {label}
                  </DropdownMenuItem>
                ))}
                {canRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => openAction("remove", row)}>
                      Remove from team
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const onlySelf = !hasActiveFilters && !isLoading && users.length === 1 && users[0].isSelf;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && !isLoading ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Couldn&apos;t load your team.</span>
            <Button size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          getRowId={(row) => row.id}
          pageSize={PAGE_SIZE}
          isLoading={isLoading && users.length === 0}
          searchPlaceholder="Search name or email..."
          manual={{
            total: pagination?.total ?? 0,
            page,
            onPageChange: setPage,
            sortKey: sort.key,
            sortDir: sort.dir,
            onSortChange: (key, dir) => {
              setSort({ key: key as SortKey, dir });
              setPage(1);
            },
            search: searchInput,
            onSearchChange: setSearchInput,
          }}
          emptyState={
            hasActiveFilters ? (
              <div className="space-y-1">
                <Users className="mx-auto h-6 w-6" />
                <p>No members match these filters.</p>
                <Button variant="link" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <p>No team members yet.</p>
            )
          }
        />
      )}

      {onlySelf && canInvite && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm">It&apos;s just you so far. Invite your first teammate.</p>
          <Button variant="link" onClick={onInvite}>
            Invite member
          </Button>
        </div>
      )}

      {/* Keyed so opening another member starts with fresh local state. */}
      <MemberDetailSheet
        key={detailMember?.id ?? "none"}
        member={detailMember}
        onOpenChange={(open) => !open && setDetailMember(null)}
        onAction={openAction}
        onChanged={onChanged}
      />

      {dialog && (
        <MemberActionDialog
          type={dialog.type}
          member={dialog.member}
          orgName={orgName}
          onClose={() => setDialog(null)}
          onDone={onChanged}
        />
      )}
    </div>
  );
}
