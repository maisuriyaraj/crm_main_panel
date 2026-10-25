"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Pencil } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearActiveMember, reqToGetOrgUser, reqToUpdateOrgUser } from "@/lib/store/slices/orgUsersSlice";
import { reqToGetTeamAudit } from "@/lib/store/slices/teamAuditSlice";
import { describeAuditEvent } from "@/lib/team/mappers";
import type { MemberAction, TeamMember } from "@/lib/team/types";
import { useAuth } from "@/hooks/useAuth";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MemberDialogType } from "@/components/team/member-action-dialogs";
import { MemberStatusBadge } from "@/components/team/member-status-badge";

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm">{value === undefined || value === null || value === "" ? "—" : value}</p>
  </div>
);

const SHEET_ACTIONS: Array<{ action: MemberAction & MemberDialogType; label: string; destructive?: boolean }> = [
  { action: "change_role", label: "Change role" },
  { action: "suspend", label: "Suspend" },
  { action: "reactivate", label: "Reactivate" },
  { action: "transfer_ownership", label: "Make owner" },
  { action: "remove", label: "Remove", destructive: true },
];

interface MemberDetailSheetProps {
  member: TeamMember | null;
  onOpenChange: (open: boolean) => void;
  onAction: (type: MemberDialogType, member: TeamMember) => void;
  onChanged: () => void;
}

export function MemberDetailSheet({ member, onOpenChange, onAction, onChanged }: MemberDetailSheetProps) {
  const dispatch = useAppDispatch();
  const { can } = useAuth();
  const handleFailure = useTeamFailure();
  const detail = useAppSelector((state) => state.orgUsers.activeMember);
  const detailLoading = useAppSelector((state) => state.orgUsers.activeMemberLoading);
  const isSaving = useAppSelector((state) => state.orgUsers.isMutating);
  const events = useAppSelector((state) => state.teamAudit.events);
  const eventsLoading = useAppSelector((state) => state.teamAudit.isLoading);
  const canViewAudit = can("team.audit.view");

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const memberId = member?.id;
  useEffect(() => {
    if (!memberId) return;
    dispatch(reqToGetOrgUser({ data: { id: memberId } }));
    if (canViewAudit) {
      dispatch(reqToGetTeamAudit({ data: { target_user_id: memberId, limit: 10, page: 1 } }));
    }
    return () => {
      dispatch(clearActiveMember());
    };
  }, [dispatch, memberId, canViewAudit]);

  if (!member) return null;

  const current = detail && detail.id === member.id ? detail : null;
  const view = current ?? member;
  const canEditProfile = view.allowedActions.includes("edit_profile");

  const startEdit = () => {
    setFullName(view.fullName);
    setMobile(view.mobile ?? "");
    setEditError(null);
    setEditing(true);
  };

  const saveProfile = () => {
    const name = fullName.trim();
    if (!name) {
      setEditError("Full name is required");
      return;
    }
    dispatch(
      reqToUpdateOrgUser({
        data: { id: member.id, full_name: name, mobile: mobile.trim() || null },
        onSuccess: () => {
          notify("Profile updated.", { type: "success" });
          setEditing(false);
          dispatch(reqToGetOrgUser({ data: { id: member.id } }));
          onChanged();
        },
        onFailure: (error: unknown) => {
          const apiError = handleFailure(error, "Couldn't update the profile.");
          if (apiError) setEditError(apiError.errors?.[0]?.message ?? apiError.message);
        },
      }),
    );
  };

  return (
    <Sheet open={!!member} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>{view.fullName}</SheetTitle>
          <SheetDescription>{view.email}</SheetDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            {view.role && <Badge variant="secondary">{view.role.label}</Badge>}
            <MemberStatusBadge status={view.status} />
            {view.isSelf && <Badge variant="outline">You</Badge>}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {SHEET_ACTIONS.filter(({ action }) => view.allowedActions.includes(action)).map(({ action, label, destructive }) => (
              <Button
                key={action}
                size="sm"
                variant={destructive ? "destructive" : "outline"}
                onClick={() => onAction(action, view)}
              >
                {label}
              </Button>
            ))}
          </div>
        </SheetHeader>

        <Separator />

        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Details</h3>
            {canEditProfile && !editing && (
              <Button size="sm" variant="ghost" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="member-full-name">Full name</Label>
                <Input id="member-full-name" maxLength={255} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-mobile">Mobile</Label>
                <Input id="member-mobile" maxLength={50} value={mobile} onChange={(e) => setMobile(e.target.value)} />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveProfile} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : detailLoading && !current ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mobile" value={view.mobile} />
              <Field label="Joined" value={format(new Date(view.createdAt), "PP")} />
              <Field
                label="Last active"
                value={view.lastLoginAt ? formatDistanceToNow(new Date(view.lastLoginAt), { addSuffix: true }) : "Never"}
              />
              <Field label="Invited by" value={current?.invitedBy?.fullName} />
              {current?.suspendedAt && <Field label="Suspended" value={format(new Date(current.suspendedAt), "PP")} />}
              {current && (
                <Field label="Owned records" value={`${current.ownedRecords.leads} leads · ${current.ownedRecords.contacts} contacts`} />
              )}
            </div>
          )}
        </div>

        {canViewAudit && (
          <>
            <Separator />
            <div className="space-y-3 p-6">
              <h3 className="text-sm font-semibold">Recent activity</h3>
              {eventsLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team activity for this member yet.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event) => (
                    <li key={event.id} className="text-sm">
                      <p>{describeAuditEvent(event)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
