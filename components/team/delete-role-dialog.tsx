"use client";

import { useState } from "react";
import Link from "next/link";

import { notify } from "@/lib/commonFunctions";
import type { TeamRole } from "@/lib/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToDeleteTeamRole } from "@/lib/store/slices/teamRolesSlice";
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
import { Button } from "@/components/ui/button";

interface DeleteRoleDialogProps {
  role: TeamRole | null;
  onClose: () => void;
  onDeleted: () => void;
  membersHref: (roleId: string) => string;
  invitationsHref: string;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// A role still held by anyone (members of any status, or pending invitations)
// cannot be deleted; the dialog then points at who holds it instead of
// offering a button the API would refuse.
export function DeleteRoleDialog({ role, onClose, onDeleted, membersHref, invitationsHref }: DeleteRoleDialogProps) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const isSaving = useAppSelector((state) => state.teamRoles.isSaving);
  // Counts the server reported when a delete raced with an assignment.
  const [inUse, setInUse] = useState<{ members: number; invitations: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members = inUse?.members ?? role?.memberCount ?? 0;
  const invitations = inUse?.invitations ?? role?.pendingInvitationCount ?? 0;
  const blocked = members + invitations > 0;

  const close = () => {
    setInUse(null);
    setError(null);
    onClose();
  };

  const confirm = () => {
    if (!role) return;
    setError(null);
    dispatch(
      reqToDeleteTeamRole({
        data: { id: role.id },
        onSuccess: () => {
          notify(`Role "${role.name}" deleted.`, { type: "success" });
          onDeleted();
          close();
        },
        onFailure: (failure: unknown) => {
          const apiError = handleFailure(failure, "Couldn't delete the role. Try again.");
          if (!apiError) return close();
          if (apiError.code === "ROLE_IN_USE") {
            setInUse({ members: Number(apiError.data?.members ?? 0), invitations: Number(apiError.data?.pending_invitations ?? 0) });
            return;
          }
          setError(apiError.message);
        },
      }),
    );
  };

  return (
    <AlertDialog open={!!role} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        {role && blocked ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{role.name} is still in use</AlertDialogTitle>
              <AlertDialogDescription>
                {[members ? plural(members, "member", "members") : null, invitations ? plural(invitations, "pending invitation", "pending invitations") : null]
                  .filter(Boolean)
                  .join(" and ")}{" "}
                {members + invitations === 1 ? "uses" : "use"} this role. Move them to another role first, then delete it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-wrap gap-2">
              {members > 0 && (
                <Button asChild variant="outline">
                  <Link href={membersHref(role.id)} onClick={close}>View members</Link>
                </Button>
              )}
              {invitations > 0 && (
                <Button asChild variant="outline">
                  <Link href={invitationsHref} onClick={close}>View invitations</Link>
                </Button>
              )}
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : role ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete role &quot;{role.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                No one uses this role. It will disappear from role pickers and its name can be reused. The activity log keeps a
                record of its permissions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={confirm} disabled={isSaving}>
                {isSaving ? "Deleting..." : "Delete role"}
              </Button>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
