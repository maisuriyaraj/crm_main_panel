"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowLeft, CircleAlert } from "lucide-react";

import { pageRoutes } from "@/lib/constants";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToResetPasswordWithToken } from "@/lib/store/slices/accountSecuritySlice";
import { authErrorMessage } from "@/lib/auth/errors";
import { newPasswordPairSchema, PASSWORD_MIN } from "@/lib/auth/passwordPolicy";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthSplit } from "@/components/layout/public/AuthSplit";
import { PublicLayout } from "@/components/layout/public/PublicLayout";

type ResetValues = z.infer<typeof newPasswordPairSchema>;

// The emailed link carries the token in the URL fragment (#token=...), which
// browsers never send to any server. Read once, then dropped from the address
// bar so it doesn't linger in history.
const readTokenFromHash = (): string | null => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("token");
  if (token) window.history.replaceState(null, "", window.location.pathname);
  return token;
};

export default function ResetFromEmailPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetValues>({
    resolver: zodResolver(newPasswordPairSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    // Reading the hash needs the browser, so this can't happen during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(readTokenFromHash());
  }, []);

  const onSubmit = async (values: ResetValues) => {
    if (!token) return;
    setFormError(null);
    let failure: unknown = null;
    const action = await dispatch(reqToResetPasswordWithToken({
      data: { token, new_password: values.newPassword },
      onFailure: (error: unknown) => { failure = error; },
    }));
    if (reqToResetPasswordWithToken.rejected.match(action)) {
      setFormError(authErrorMessage(failure, "Couldn't reset your password. Please request a new link."));
      return;
    }
    notify("Password updated. Sign in with your new password.", { type: "success" });
    router.replace(pageRoutes.signin);
  };

  return (
    <PublicLayout>
      <AuthSplit
        eyebrow="Account recovery"
        title={<>Choose a <span className="text-gradient">new password</span></>}
        description="Once it's saved, you'll be signed out everywhere and can sign in again with the new password."
        cardTitle="Set a new password"
        cardDescription={`Use at least ${PASSWORD_MIN} characters.`}
      >
        {token === undefined ? (
          <div className="mt-8 space-y-4" aria-hidden>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : token === null ? (
          <div className="mt-8 space-y-5" role="alert">
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              This link is incomplete. Open the link from your email again, or request a new one.
            </div>
            <Button asChild size="lg" className="w-full">
              <Link href={pageRoutes.forgotPassword}>Request a new link</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              {formError && (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}{" "}
                  <Link href={pageRoutes.forgotPassword} className="font-semibold underline">Request a new link</Link>
                </div>
              )}
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save new password"}
              </Button>
            </form>
          </Form>
        )}

        <Link href={pageRoutes.signin} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to sign in
        </Link>
      </AuthSplit>
    </PublicLayout>
  );
}
