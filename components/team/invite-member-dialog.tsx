"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToCreateInvitation, reqToResendInvitation } from "@/lib/store/slices/teamInvitationsSlice";
import { mapTeamFieldErrors } from "@/lib/team/mappers";
import type { InvitationDelivery, TeamApiError } from "@/lib/team/types";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleSelectItems } from "@/components/team/role-select-items";
import { InviteLinkView } from "@/components/team/invite-link-view";

const inviteSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(255),
  fullName: z.string().trim().max(255).optional(),
  roleId: z.string().min(1, "Choose a role"),
});

type InviteValues = z.infer<typeof inviteSchema>;

const API_FIELDS: Record<string, string> = { email: "email", full_name: "fullName", role_id: "roleId" };

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatsFull: boolean;
  seatsLimit: number | null;
  onInvited: () => void;
}

export function InviteMemberDialog({ open, onOpenChange, seatsFull, seatsLimit, onInvited }: InviteMemberDialogProps) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const roles = useAppSelector((state) => state.teamRoles.roles);
  const isSubmitting = useAppSelector((state) => state.teamInvitations.isMutating);
  const assignable = roles.filter((role) => role.assignable);

  const [banner, setBanner] = useState<TeamApiError | null>(null);
  const [linkResult, setLinkResult] = useState<InvitationDelivery | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", fullName: "", roleId: "" },
  });

  // Default to the lowest-ranked assignable role, so a quick invite never
  // grants more than intended.
  const defaultRoleId = [...assignable].sort((a, b) => a.rank - b.rank)[0]?.id ?? "";
  useEffect(() => {
    if (open) form.reset({ email: "", fullName: "", roleId: defaultRoleId });
  }, [open, defaultRoleId, form]);

  // Cleared on close so the next open starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setBanner(null);
      setLinkResult(null);
    }
    onOpenChange(next);
  };

  const finish = (result: InvitationDelivery) => {
    onInvited();
    if (result.delivery === "sent") {
      notify(`Invitation sent to ${result.invitation.email}.`, { type: "success" });
      handleOpenChange(false);
      return;
    }
    setLinkResult(result);
  };

  const onSubmit = (values: InviteValues) => {
    setBanner(null);
    dispatch(
      reqToCreateInvitation({
        data: { email: values.email, fullName: values.fullName, roleId: values.roleId },
        onSuccess: finish,
        onFailure: (error: unknown) => {
          const apiError = handleFailure(error, "Couldn't create the invitation. Try again.");
          if (!apiError) return;

          const fieldErrors = mapTeamFieldErrors(apiError.errors, API_FIELDS);
          if (fieldErrors.length) {
            fieldErrors.forEach(({ field, message }) =>
              form.setError(field as keyof InviteValues, { message }),
            );
            return;
          }

          if (apiError.code === "ALREADY_MEMBER" || apiError.code === "EMAIL_IN_OTHER_ORG") {
            form.setError("email", { message: apiError.message });
            return;
          }

          setBanner(apiError);
        },
      }),
    );
  };

  const resendPending = () => {
    const invitationId = banner?.data?.invitation_id;
    if (!invitationId) return;
    dispatch(
      reqToResendInvitation({
        data: { id: invitationId },
        onSuccess: finish,
        onFailure: (error: unknown) => {
          const apiError = handleFailure(error, "Couldn't resend the invitation.");
          if (apiError) setBanner(apiError);
        },
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{linkResult ? "Invitation created" : "Invite team member"}</DialogTitle>
          {!linkResult && (
            <DialogDescription>They&apos;ll get a link to set a password and join your workspace.</DialogDescription>
          )}
        </DialogHeader>

        {linkResult ? (
          <>
            <InviteLinkView result={linkResult} />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {seatsFull && (
                <Alert variant="destructive">
                  <AlertDescription>
                    You&apos;ve used all {seatsLimit} seats on your plan. Remove a member or contact support to add seats.
                  </AlertDescription>
                </Alert>
              )}

              {banner && (
                <Alert variant="destructive">
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span>{banner.message}</span>
                    {banner.code === "INVITATION_PENDING" && banner.data?.invitation_id && (
                      <Button type="button" size="sm" variant="outline" onClick={resendPending} disabled={isSubmitting}>
                        Resend instead
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@company.com" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormDescription>They can change it when they accept.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <RoleSelectItems roles={roles} />
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || seatsFull}>
                  {isSubmitting ? "Sending..." : "Send invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
