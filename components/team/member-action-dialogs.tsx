"use client";

import { useEffect, useState, type ReactNode } from "react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToDeleteOrgUser,
  reqToGetMemberOptions,
  reqToGetOrgUser,
  reqToReactivateOrgUser,
  reqToRevokeOrgUserSessions,
  reqToSuspendOrgUser,
  reqToTransferOwnership,
  reqToUpdateOrgUser,
} from "@/lib/store/slices/orgUsersSlice";
import { reqToRefreshProfile } from "@/lib/store/slices/authSlice";
import type { TeamMember } from "@/lib/team/types";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MemberDialogType =
  | "change_role"
  | "suspend"
  | "reactivate"
  | "revoke_sessions"
  | "remove"
  | "transfer_ownership";

interface DialogProps {
  member: TeamMember;
  orgName: string;
  onClose: () => void;
  onDone: () => void;
}

// Confirm dialogs stay open while the request runs, so a refusal (last owner,
// seat limit...) is shown in place instead of being lost with the dialog.
function ConfirmShell({
  title,
  description,
  children,
  error,
  confirmLabel,
  pendingLabel,
  destructive,
  disabled,
  isPending,
  onConfirm,
  onClose,
}: {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  error: string | null;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={disabled || isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Runs a member mutation and routes its outcome: success closes and refreshes,
// a handled failure (session ended, permissions changed) just closes, any other
// failure is shown inside the dialog.
function useMemberAction(onClose: () => void, onDone: () => void) {
  const handleFailure = useTeamFailure();
  const isPending = useAppSelector((state) => state.orgUsers.isMutating);
  const [error, setError] = useState<string | null>(null);

  const callbacks = (successMessage: string, fallback: string, after?: () => void) => ({
    onSuccess: () => {
      notify(successMessage, { type: "success" });
      after?.();
      onDone();
      onClose();
    },
    onFailure: (failure: unknown) => {
      const apiError = handleFailure(failure, fallback);
      if (!apiError) {
        onClose();
        return;
      }
      setError(apiError.message);
    },
  });

  return { isPending, error, setError, callbacks };
}

export function ChangeRoleDialog({ member, onClose, onDone }: DialogProps) {
  const dispatch = useAppDispatch();
  const roles = useAppSelector((state) => state.teamRoles.roles);
  const { isPending, error, callbacks } = useMemberAction(onClose, onDone);
  const [roleId, setRoleId] = useState(member.role?.id ?? "");

  const assignable = roles.filter((role) => role.assignable);
  const current = roles.find((role) => role.id === member.role?.id);
  const next = roles.find((role) => role.id === roleId);
  const isDemotion = !!current && !!next && next.rank < current.rank && current.isAdmin;

  return (
    <ConfirmShell
      title={`Change ${member.fullName}'s role`}
      description={<p>Current role: {member.role?.label ?? "—"}. The change applies within a few minutes on their devices.</p>}
      error={error}
      confirmLabel="Save role"
      pendingLabel="Saving..."
      disabled={!roleId || roleId === member.role?.id}
      isPending={isPending}
      onClose={onClose}
      onConfirm={() =>
        dispatch(
          reqToUpdateOrgUser({
            data: { id: member.id, role_id: roleId },
            ...callbacks("Role updated.", "Couldn't update the role. Try again."),
          }),
        )
      }
    >
      <div className="space-y-2">
        <Label htmlFor="member-role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger id="member-role">
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            {assignable.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDemotion && (
          <p className="text-xs text-destructive">
            {member.fullName} will lose {current?.label} access, including team management.
          </p>
        )}
      </div>
    </ConfirmShell>
  );
}

export function SuspendDialog({ member, orgName, onClose, onDone }: DialogProps) {
  const dispatch = useAppDispatch();
  const { isPending, error, callbacks } = useMemberAction(onClose, onDone);
  const [reason, setReason] = useState("");

  return (
    <ConfirmShell
      title={`Suspend ${member.fullName}?`}
      description={
        <p>
          They&apos;ll be signed out and can&apos;t access {orgName} until reactivated. Their records stay assigned
          to them.
        </p>
      }
      error={error}
      confirmLabel="Suspend"
      pendingLabel="Suspending..."
      destructive
      isPending={isPending}
      onClose={onClose}
      onConfirm={() =>
        dispatch(
          reqToSuspendOrgUser({
            data: { id: member.id, reason: reason.trim() || undefined },
            ...callbacks(`${member.fullName} suspended.`, "Couldn't suspend this member. Try again."),
          }),
        )
      }
    >
      <div className="space-y-2">
        <Label htmlFor="suspend-reason">Reason (optional)</Label>
        <Textarea
          id="suspend-reason"
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Visible to admins in team activity"
        />
      </div>
    </ConfirmShell>
  );
}

export function ReactivateDialog({ member, onClose, onDone }: DialogProps) {
  const dispatch = useAppDispatch();
  const { isPending, error, callbacks } = useMemberAction(onClose, onDone);

  return (
    <ConfirmShell
      title={`Reactivate ${member.fullName}?`}
      description={<p>They&apos;ll regain access with the {member.role?.label ?? "same"} role.</p>}
      error={error}
      confirmLabel="Reactivate"
      pendingLabel="Reactivating..."
      isPending={isPending}
      onClose={onClose}
      onConfirm={() =>
        dispatch(
          reqToReactivateOrgUser({
            data: { id: member.id },
            ...callbacks(`${member.fullName} reactivated.`, "Couldn't reactivate this member. Try again."),
          }),
        )
      }
    />
  );
}

export function RevokeSessionsDialog({ member, onClose, onDone }: DialogProps) {
  const dispatch = useAppDispatch();
  const { isPending, error, callbacks } = useMemberAction(onClose, onDone);

  return (
    <ConfirmShell
      title={`Sign ${member.fullName} out everywhere?`}
      description={<p>They&apos;ll need to sign in again on every device. Their access is not changed.</p>}
      error={error}
      confirmLabel="Sign out everywhere"
      pendingLabel="Signing out..."
      isPending={isPending}
      onClose={onClose}
      onConfirm={() =>
        dispatch(
          reqToRevokeOrgUserSessions({
            data: { id: member.id },
            ...callbacks(`${member.fullName} was signed out of all devices.`, "Couldn't sign this member out. Try again."),
          }),
        )
      }
    />
  );
}

const LEAVE_UNASSIGNED = "unassigned";

export function RemoveMemberDialog({ member, orgName, onClose, onDone }: DialogProps) {
  const dispatch = useAppDispatch();
  const { isPending, error, callbacks } = useMemberAction(onClose, onDone);
  const detail = useAppSelector((state) => state.orgUsers.activeMember);
  const options = useAppSelector((state) => state.orgUsers.memberOptions);
  const [reassignTo, setReassignTo] = useState(LEAVE_UNASSIGNED);
  const [confirmEmail, setConfirmEmail] = useState("");

  useEffect(() => {
    dispatch(reqToGetOrgUser({ data: { id: member.id } }));
    dispatch(reqToGetMemberOptions({ data: null }));
  }, [dispatch, member.id]);

  const owned = detail && detail.id === member.id ? detail.ownedRecords : null;
  const hasRecords = !!owned && owned.leads + owned.contacts > 0;
  const candidates = options.filter((option) => option.id !== member.id);
  const emailMatches = confirmEmail.trim().toLowerCase() === member.email.toLowerCase();

  return (
    <ConfirmShell
      title={`Remove ${member.fullName} from ${orgName}?`}
      description={<p>This permanently removes their access. Their activity history is kept.</p>}
      error={error}
      confirmLabel="Remove member"
      pendingLabel="Removing..."
      destructive
      disabled={!emailMatches}
      isPending={isPending}
      onClose={onClose}
      onConfirm={() =>
        dispatch(
          reqToDeleteOrgUser({
            data: { id: member.id, reassignToUserId: reassignTo === LEAVE_UNASSIGNED ? undefined : reassignTo },
            ...callbacks(`${member.fullName} removed from ${orgName}.`, "Couldn't remove this member. Try again."),
          }),
        )
      }
    >
      <div className="space-y-4">
        {hasRecords && (
          <div className="space-y-2">
            <Label htmlFor="reassign-to">
              Reassign their {owned.leads} lead{owned.leads === 1 ? "" : "s"} and {owned.contacts} contact
              {owned.contacts === 1 ? "" : "s"} to
            </Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger id="reassign-to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LEAVE_UNASSIGNED}>Keep them as owner (shown as inactive)</SelectItem>
                {candidates.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="confirm-email">
            Type <span className="font-medium text-foreground">{member.email}</span> to confirm
          </Label>
          <Input
            id="confirm-email"
            autoComplete="off"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
          />
        </div>
      </div>
    </ConfirmShell>
  );
}

export function TransferOwnershipDialog({ member, onClose, onDone }: DialogProps) {
  const dispatch = useAppDispatch();
  const roles = useAppSelector((state) => state.teamRoles.roles);
  const { isPending, error, callbacks } = useMemberAction(onClose, onDone);
  const nonOwnerRoles = roles.filter((role) => role.rank < 100);
  const [demote, setDemote] = useState(false);
  const [demoteRoleId, setDemoteRoleId] = useState(
    () => roles.find((role) => role.name === "Admin")?.id ?? nonOwnerRoles[0]?.id ?? "",
  );

  return (
    <ConfirmShell
      title={`Make ${member.fullName} an owner?`}
      description={<p>They&apos;ll get full control of the workspace, including managing other owners and you.</p>}
      error={error}
      confirmLabel="Transfer ownership"
      pendingLabel="Transferring..."
      disabled={demote && !demoteRoleId}
      isPending={isPending}
      onClose={onClose}
      onConfirm={() =>
        dispatch(
          reqToTransferOwnership({
            data: { targetUserId: member.id, demoteSelfToRoleId: demote ? demoteRoleId : undefined },
            // The caller may have just lost owner-only permissions.
            ...callbacks(`${member.fullName} is now an owner.`, "Couldn't transfer ownership. Try again.", () =>
              dispatch(reqToRefreshProfile({ data: null })),
            ),
          }),
        )
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox id="demote-self" checked={demote} onCheckedChange={(checked) => setDemote(checked === true)} />
          <Label htmlFor="demote-self">Change my role after the transfer</Label>
        </div>
        {demote && (
          <Select value={demoteRoleId} onValueChange={setDemoteRoleId}>
            <SelectTrigger aria-label="My new role">
              <SelectValue placeholder="Choose your new role" />
            </SelectTrigger>
            <SelectContent>
              {nonOwnerRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </ConfirmShell>
  );
}

export function MemberActionDialog({
  type,
  ...props
}: DialogProps & { type: MemberDialogType }) {
  switch (type) {
    case "change_role":
      return <ChangeRoleDialog {...props} />;
    case "suspend":
      return <SuspendDialog {...props} />;
    case "reactivate":
      return <ReactivateDialog {...props} />;
    case "revoke_sessions":
      return <RevokeSessionsDialog {...props} />;
    case "remove":
      return <RemoveMemberDialog {...props} />;
    case "transfer_ownership":
      return <TransferOwnershipDialog {...props} />;
    default:
      return null;
  }
}
