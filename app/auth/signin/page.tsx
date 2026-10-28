"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowRight } from "lucide-react";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToFetchMe, reqToLogin } from "@/lib/store/slices/authSlice";
import { rememberSignedInUser } from "@/lib/auth/session";
import { authErrorMessage } from "@/lib/auth/errors";
import { signInPasswordField } from "@/lib/auth/passwordPolicy";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthSplit } from "@/components/layout/public/AuthSplit";
import { AuthLayout } from "@/components/layout/public/AuthLayout";

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: signInPasswordField,
});

type SignInValues = z.infer<typeof signInSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  // Returns the promise so react-hook-form keeps isSubmitting true (and the
  // button disabled) until sign-in has fully finished.
  const onSubmit = async (values: SignInValues) => {
    setFormError(null);

    // The thunk's onFailure carries the raw error (status + code); the
    // rejected action only has a message.
    let failure: unknown = null;
    const login = await dispatch(reqToLogin({ data: values, onFailure: (error: unknown) => { failure = error; } }));
    if (reqToLogin.rejected.match(login)) {
      setFormError(authErrorMessage(failure, "Invalid email or password."));
      return;
    }

    const meAction = await dispatch(reqToFetchMe({ data: null }));
    const profile: { organizationId: number; mustResetPassword: boolean; email: string } | undefined =
      reqToFetchMe.fulfilled.match(meAction) ? meAction.payload?.data : undefined;
    if (!profile) {
      setFormError("Signed in, but couldn't load your account. Please try again.");
      return;
    }

    rememberSignedInUser(profile);

    if (profile.mustResetPassword) {
      router.replace(pageRoutes.resetPassword);
      return;
    }

    const orgId = String(profile.organizationId);
    const redirect = searchParams.get("redirect");
    // Only honor same-origin, org-scoped redirects — never let an arbitrary
    // "redirect" query param send the user off-app.
    const isSafeRedirect = redirect && redirect.startsWith(`/${orgId}/`) && !redirect.startsWith("//");

    router.replace(isSafeRedirect ? redirect : buildOrgRoute(orgId, pageRoutes.dashboard));
  };

  return (
    <AuthLayout>
      <AuthSplit
        eyebrow="Welcome back"
        title={<>Your growth hub, <span className="text-gradient">all in one place</span></>}
        description="CRM, Sales, Marketing, Billing, Automation, Analytics and Ads Management unified into a single growth platform."
        cardTitle="Sign in"
        cardDescription="Sign in to access your OrbitOps workspace."
        aside={
          <div className="hidden max-w-lg rounded-3xl border border-border bg-glass p-6 backdrop-blur-xl panel-shadow lg:block" aria-hidden>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Revenue</span>
              <span className="font-semibold text-primary">+32%</span>
            </div>
            <div className="text-4xl font-bold">$124,820</div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <div className="text-sm text-muted-foreground">Leads</div>
                <div className="mt-2 text-2xl font-bold">8,294</div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <div className="text-sm text-muted-foreground">Deals</div>
                <div className="mt-2 text-2xl font-bold">427</div>
              </div>
            </div>
          </div>
        }
      >
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href={pageRoutes.forgotPassword} className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
              <ArrowRight />
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href={pageRoutes.signup} className="font-semibold text-primary">
            Start Free Trial
          </Link>
        </div>
      </AuthSplit>
    </AuthLayout>
  );
}
