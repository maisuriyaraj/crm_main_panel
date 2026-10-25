"use client";

import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetTeamAudit } from "@/lib/store/slices/teamAuditSlice";
import { reqToGetMemberOptions } from "@/lib/store/slices/orgUsersSlice";
import { describeAuditEvent } from "@/lib/team/mappers";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 20;
const ALL = "all";

const ACTION_OPTIONS = [
  { value: "team.invitation.created", label: "Invitations sent" },
  { value: "team.invitation.accepted", label: "Invitations accepted" },
  { value: "team.invitation.revoked", label: "Invitations revoked" },
  { value: "team.member.role_changed", label: "Role changes" },
  { value: "team.member.suspended", label: "Suspensions" },
  { value: "team.member.reactivated", label: "Reactivations" },
  { value: "team.member.removed", label: "Removals" },
  { value: "team.ownership.transferred", label: "Ownership transfers" },
  { value: "team.authz.denied", label: "Blocked attempts" },
];

export function ActivityTab({ version }: { version: number }) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const { events, pagination, isLoading, error } = useAppSelector((state) => state.teamAudit);
  const members = useAppSelector((state) => state.orgUsers.memberOptions);

  const [action, setAction] = useState(ALL);
  const [memberId, setMemberId] = useState(ALL);

  const load = useCallback(
    (page: number) => {
      const data: Record<string, unknown> = { page, limit: PAGE_SIZE };
      if (action !== ALL) data.action = action;
      if (memberId !== ALL) data.target_user_id = memberId;
      dispatch(
        reqToGetTeamAudit({
          data,
          onFailure: (failure: unknown) => handleFailure(failure, "Couldn't load team activity."),
        }),
      );
    },
    [dispatch, action, memberId, handleFailure],
  );

  useEffect(() => {
    load(1);
  }, [load, version]);

  useEffect(() => {
    dispatch(reqToGetMemberOptions({ data: null }));
  }, [dispatch]);

  const hasMore = !!pagination && pagination.page < pagination.totalPages;
  const hasFilters = action !== ALL || memberId !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All activity</SelectItem>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={memberId} onValueChange={setMemberId}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by member">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All members</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && !isLoading ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Couldn&apos;t load team activity.</span>
            <Button size="sm" variant="outline" onClick={() => load(1)}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading && events.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          <History className="mx-auto mb-2 h-6 w-6" />
          {hasFilters ? "No activity matches these filters." : "No team activity yet."}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm">{describeAuditEvent(event)}</span>
              <time
                className="shrink-0 text-xs text-muted-foreground"
                dateTime={event.createdAt}
                title={format(new Date(event.createdAt), "PPpp")}
              >
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </time>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load((pagination?.page ?? 1) + 1)} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
