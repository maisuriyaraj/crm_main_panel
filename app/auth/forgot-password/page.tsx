"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MailCheck, Mail } from "lucide-react";

import { pageRoutes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToForgotPassword } from "@/lib/store/slices/accountSecuritySlice";
import { authErrorMessage } from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthSplit } from "@/components/layout/public/AuthSplit";
import { AuthLayout } from "@/components/layout/public/AuthLayout";

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email").max(255),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  // The API answers the same whether or not the email has an account, so the
  // confirmation below never says whether one exists.
  const onSubmit = async (values: ForgotValues) => {
    setFormError(null);
    let failure: unknown = null;
    const action = await dispatch(reqToForgotPassword({ data: values, onFailure: (error: unknown) => { failure = error; } }));
    if (reqToForgotPassword.rejected.match(action)) {
      setFormError(authErrorMessage(failure, "Couldn't send the reset email. Please try again."));
      return;
    }
    setSentTo(values.email);
  };

  return (
    <AuthLayout>
      <AuthSplit
        eyebrow="Account recovery"
        title={<>Forgot your <span className="text-gradient">password?</span></>}
        description="No problem. Enter the email you sign in with and we'll send you a link to choose a new one."
        cardTitle={sentTo ? "Check your email" : "Reset your password"}
        cardDescription={sentTo ? "If an account exists, the link is on its way." : "We'll email you a secure, one-time link."}
      >
        {sentTo ? (
          <div className="mt-8 space-y-5" role="status" aria-live="polite">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
              <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">
                If <strong className="text-foreground">{sentTo}</strong> has an OrbitOps account, you&apos;ll get an email with a
                link to reset your password. It works once and expires in 30 minutes. Check your spam folder if it doesn&apos;t arrive.
              </p>
            </div>
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => { setSentTo(null); form.reset(); }}>
              Use a different email
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              {formError && (
                <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}
                </p>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="name@company.com"
                          className="h-auto rounded-xl border-border bg-background py-3 pl-10 pr-4 text-base"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </Form>
        )}

        <Link href={pageRoutes.signin} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to sign in
        </Link>
      </AuthSplit>
    </AuthLayout>
  );
}
