"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import { Mail, MoreHorizontal } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToCreateInvitation,
  reqToGetInvitations,
  reqToResendInvitation,
  reqToResendLegacyInvitation,
  reqToRevokeInvitation,
} from "@/lib/store/slices/teamInvitationsSlice";
import { reqToDeleteOrgUser } from "@/lib/store/slices/orgUsersSlice";
import type { InvitationDelivery, InvitationListQuery, InvitationStatus, TeamInvitation } from "@/lib/team/types";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InviteLinkDialog } from "@/components/team/invite-link-view";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_OPTIONS: Array<{ value: InvitationStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
  { value: "accepted", label: "Accepted" },
];

const DELIVERY_LABELS: Record<TeamInvitation["deliveryStatus"], string> = {
  sent: "Sent",
  failed: "Failed",
  link_only: "Link only",
};

function ExpiryCell({ invitation }: { invitation: TeamInvitation }) {
  if (invitation.status === "expired") return <Badge variant="outline">Expired</Badge>;
  if (invitation.status !== "pending") return <span className="text-muted-foreground">—</span>;
  if (!invitation.expiresAt) return <span className="text-muted-foreground">No expiry (legacy)</span>;

  const expires = new Date(invitation.expiresAt);
  const soon = differenceInHours(expires, new Date()) < 24;
  return <span className={soon ? "text-destructive" : undefined}>{formatDistanceToNow(expires, { addSuffix: true })}</span>;
}

interface InvitationsTabProps {
  version: number;
  onInvite: () => void;
  canInvite: boolean;
  onChanged: () => void;
}

export function InvitationsTab({ version, onInvite, canInvite, onChanged }: InvitationsTabProps) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const { invitations, pagination, isLoading, error, isMutating } = useAppSelector((state) => state.teamInvitations);

  const [status, setStatus] = useState<InvitationStatus>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [linkResult, setLinkResult] = useState<InvitationDelivery | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TeamInvitation | null>(null);

  const query = useMemo<InvitationListQuery>(() => {
    const next: InvitationListQuery = { status, page, limit: PAGE_SIZE };
    if (search.trim()) next.search = search.trim();
    return next;
  }, [status, page, search]);

  const load = useCallback(() => {
    dispatch(
      reqToGetInvitations({
        data: query,
        onFailure: (failure: unknown) => handleFailure(failure, "Couldn't load invitations."),
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

  const afterDelivery = (result: InvitationDelivery) => {
    onChanged();
    if (result.delivery === "sent") {
      notify(`Invitation resent to ${result.invitation.email}.`, { type: "success" });
      return;
    }
    setLinkResult(result);
  };

  const onActionFailure = (fallback: string) => (failure: unknown) => {
    const apiError = handleFailure(failure, fallback);
    if (apiError) notify(apiError.message, { type: "error" });
    // A conflicting state (already accepted, expired...) means the row is stale.
    if (apiError?.status === 409) onChanged();
  };

  const resend = (invitation: TeamInvitation) => {
    if (invitation.source === "legacy") {
      dispatch(
        reqToResendLegacyInvitation({
          data: { userId: invitation.id },
          onSuccess: afterDelivery,
          onFailure: onActionFailure("Couldn't send the invitation."),
        }),
      );
      return;
    }

    // An expired link can't be revived; resending one creates a fresh invitation.
    if (invitation.status === "expired" && invitation.role) {
      dispatch(
        reqToCreateInvitation({
          data: { email: invitation.email, fullName: invitation.fullName, roleId: invitation.role.id },
          onSuccess: afterDelivery,
          onFailure: onActionFailure("Couldn't send a new invitation."),
        }),
      );
      return;
    }

    dispatch(
      reqToResendInvitation({
        data: { id: invitation.id },
        onSuccess: afterDelivery,
        onFailure: onActionFailure("Couldn't resend the invitation."),
      }),
    );
  };

  const confirmRevoke = () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    const onSuccess = () => {
      notify(`Invitation for ${target.email} revoked.`, { type: "success" });
      setRevokeTarget(null);
      onChanged();
    };
    const onFailure = (failure: unknown) => {
      setRevokeTarget(null);
      onActionFailure("Couldn't revoke the invitation.")(failure);
    };

    // A legacy row is a users record; revoking it removes that record.
    if (target.source === "legacy") {
      dispatch(reqToDeleteOrgUser({ data: { id: target.id }, onSuccess, onFailure }));
    } else {
      dispatch(reqToRevokeInvitation({ data: { id: target.id }, onSuccess, onFailure }));
    }
  };

  const columns: DataTableColumn<TeamInvitation>[] = [
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.email}</p>
          {row.fullName && <p className="truncate text-xs text-muted-foreground">{row.fullName}</p>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <Badge variant="secondary">{row.role?.label ?? "—"}</Badge>,
    },
    {
      key: "invited_by",
      header: "Invited by",
      className: "hidden md:table-cell",
      render: (row) => row.invitedBy?.fullName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "sent",
      header: "Sent",
      className: "hidden md:table-cell",
      render: (row) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{formatDistanceToNow(new Date(row.lastSentAt), { addSuffix: true })}</span>
          </TooltipTrigger>
          <TooltipContent>
            {row.source === "legacy" ? "Created with a temporary password" : `Sent ${row.sendCount} time${row.sendCount === 1 ? "" : "s"}`}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      render: (row) => <ExpiryCell invitation={row} />,
    },
    {
      key: "delivery",
      header: "Delivery",
      className: "hidden lg:table-cell",
      render: (row) => (
        <Badge variant={row.deliveryStatus === "failed" ? "destructive" : "outline"}>{DELIVERY_LABELS[row.deliveryStatus]}</Badge>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (row) => {
        if (row.allowedActions.length === 0) return null;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${row.email}`} disabled={isMutating}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.allowedActions.includes("resend") && (
                  <DropdownMenuItem onSelect={() => resend(row)}>
                    {row.status === "expired" ? "Send a new invitation" : "Resend (new link)"}
                  </DropdownMenuItem>
                )}
                {row.allowedActions.includes("revoke") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setRevokeTarget(row)}>
                      Revoke
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

  const hasSearch = search.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as InvitationStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]" aria-label="Filter by invitation status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {status !== "pending" && (
          <p className="text-xs text-muted-foreground">Showing the last 30 days.</p>
        )}
      </div>

      {error && !isLoading ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Couldn&apos;t load invitations.</span>
            <Button size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={invitations}
          getRowId={(row) => `${row.source}-${row.id}`}
          pageSize={PAGE_SIZE}
          isLoading={isLoading && invitations.length === 0}
          searchPlaceholder="Search email or name..."
          manual={{
            total: pagination?.total ?? 0,
            page,
            onPageChange: setPage,
            search: searchInput,
            onSearchChange: setSearchInput,
          }}
          emptyState={
            hasSearch ? (
              <p>No invitations match this search.</p>
            ) : status === "pending" ? (
              <div className="space-y-1">
                <Mail className="mx-auto h-6 w-6" />
                <p>No pending invitations.</p>
                {canInvite && (
                  <Button variant="link" onClick={onInvite}>
                    Invite member
                  </Button>
                )}
              </div>
            ) : (
              <p>No {status} invitations in the last 30 days.</p>
            )
          }
        />
      )}

      <InviteLinkDialog result={linkResult} onClose={() => setLinkResult(null)} />

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && !isMutating && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation for {revokeTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>The invite link will stop working immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmRevoke} disabled={isMutating}>
              {isMutating ? "Revoking..." : "Revoke"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
