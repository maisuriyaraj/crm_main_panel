"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, LogOut, Monitor, ShieldCheck } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToChangePassword,
  reqToGetSessions,
  reqToRevokeSession,
  type AuthSessionInfo,
} from "@/lib/store/slices/accountSecuritySlice";
import { reqToLogoutAll } from "@/lib/store/slices/authSlice";
import { endSession } from "@/lib/auth/session";
import { authErrorMessage } from "@/lib/auth/errors";
import { newPasswordPairSchema, PASSWORD_MIN } from "@/lib/auth/passwordPolicy";
import { notify } from "@/lib/commonFunctions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PasswordInput } from "@/components/auth/password-input";

// Every signed-in user manages their own password and devices, so this page
// needs no permission: the API only ever acts on the caller's own account.
export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="size-6 text-primary" aria-hidden /> Security
        </h1>
        <p className="mt-1 text-muted-foreground">Change your password and see where you&apos;re signed in.</p>
      </div>
      <ChangePasswordCard />
      <SessionsCard />
    </div>
  );
}

const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password") })
  .and(newPasswordPairSchema)
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordCard() {
  const dispatch = useAppDispatch();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    setFormError(null);
    let failure: unknown = null;
    const action = await dispatch(reqToChangePassword({
      data: { current_password: values.currentPassword, new_password: values.newPassword },
      onFailure: (error: unknown) => { failure = error; },
    }));
    if (reqToChangePassword.rejected.match(action)) {
      if ((failure as { response?: { data?: { code?: string } } })?.response?.data?.code === "CURRENT_PASSWORD_INCORRECT") {
        form.setError("currentPassword", { message: "Current password is incorrect" });
        return;
      }
      setFormError(authErrorMessage(failure, "Couldn't change your password."));
      return;
    }
    form.reset();
    notify("Password changed. You've been signed out on your other devices.", { type: "success" });
    dispatch(reqToGetSessions({ data: null }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="size-5 text-primary" aria-hidden /> Change password</CardTitle>
        <CardDescription>Changing it signs you out everywhere except this browser.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {formError && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</p>
            )}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl><PasswordInput autoComplete="current-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
                    <FormDescription>At least {PASSWORD_MIN} characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Update password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

const formatWhen = (value: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

function SessionsCard() {
  const dispatch = useAppDispatch();
  const { sessions, sessionsLoaded, error } = useAppSelector((state) => state.accountSecurity);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(reqToGetSessions({ data: null }));
  }, [dispatch]);

  const revoke = async (session: AuthSessionInfo) => {
    setPendingId(session.id);
    const action = await dispatch(reqToRevokeSession({ data: { id: session.id } }));
    setPendingId(null);
    if (reqToRevokeSession.rejected.match(action)) {
      notify("Couldn't sign out that device. Please try again.", { type: "error" });
      return;
    }
    if (session.current) {
      void endSession("logout");
      return;
    }
    notify(`Signed out ${session.device}.`, { type: "success" });
  };

  const signOutEverywhere = async () => {
    await dispatch(reqToLogoutAll({ data: null }));
    void endSession("logout");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><Monitor className="size-5 text-primary" aria-hidden /> Where you&apos;re signed in</CardTitle>
          <CardDescription className="mt-1.5">Sign out any device you don&apos;t recognise.</CardDescription>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm"><LogOut className="size-4" aria-hidden /> Sign out everywhere</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of every device?</AlertDialogTitle>
              <AlertDialogDescription>This includes this browser. You&apos;ll need to sign in again everywhere.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={signOutEverywhere}>Sign out everywhere</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent>
        {!sessionsLoaded && !error ? (
          <div className="space-y-3" aria-hidden>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error && !sessionsLoaded ? (
          <p role="alert" className="text-sm text-destructive">
            {error}{" "}
            <button type="button" className="underline" onClick={() => dispatch(reqToGetSessions({ data: null }))}>Retry</button>
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {session.device}
                    {session.current && <Badge variant="secondary">This browser</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {session.ip ? `${session.ip} · ` : ""}Last active {formatWhen(session.lastUsedAt)} · Signed in {formatWhen(session.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === session.id}
                  onClick={() => revoke(session)}
                  aria-label={`Sign out ${session.device}${session.current ? " (this browser)" : ""}`}
                >
                  {pendingId === session.id ? "Signing out…" : "Sign out"}
                </Button>
              </li>
            ))}
            {sessions.length === 0 && <li className="p-4 text-sm text-muted-foreground">No active sessions.</li>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
