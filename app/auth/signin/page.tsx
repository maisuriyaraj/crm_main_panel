"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToFetchMe, reqToLogin } from "@/lib/store/slices/authSlice";
import { handleCookieActions, handleLocalStorageActions, notify } from "@/lib/commonFunctions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
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

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: SignInValues) => {
    dispatch(
      reqToLogin({
        data: values,
        onSuccess: () => {
          dispatch(
            reqToFetchMe({
              data: null,
              onSuccess: (me: { data: any }) => {
                handleLocalStorageActions("set", "user", me.data);
                handleCookieActions("set", "user", me.data, { expires: 3600 });

                if (me?.data?.mustResetPassword) {
                  router.replace(pageRoutes.resetPassword);
                  return;
                }

                const orgId = String(me?.data?.organizationId);
                const redirect = searchParams.get("redirect");
                // Only honor same-origin, org-scoped redirects — never let an
                // arbitrary "redirect" query param send the user off-app.
                const isSafeRedirect =
                  redirect &&
                  redirect.startsWith(`/${orgId}/`) &&
                  !redirect.startsWith("//");

                router.replace(
                  isSafeRedirect ? redirect : buildOrgRoute(orgId, pageRoutes.dashboard),
                );
              },
              onFailure: () => {
                notify("Signed in, but couldn't load your account. Please try again.", {
                  type: "error",
                });
              },
            }),
          );
        },
        onFailure: () => {
          notify("Invalid email or password.", { type: "error" });
        },
      }),
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[140px]" />

        <div className="absolute bottom-20 right-20 h-[450px] w-[450px] rounded-full bg-cyan-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">

        {/* Left */}
        <div className="hidden lg:flex flex-col justify-between p-16">
          <div>
            <div className="text-4xl font-bold text-gradient">
              OrbitOps
            </div>

            <p className="mt-4 max-w-md text-muted-foreground">
              CRM, Sales, Marketing, Billing, Automation,
              Analytics and Ads Management unified into a
              single growth platform.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Monthly Revenue
              </span>

              <span className="text-green-500 font-semibold">
                +32%
              </span>
            </div>

            <div className="text-4xl font-bold">
              $124,820
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="text-sm text-muted-foreground">
                  Leads
                </div>

                <div className="mt-2 text-2xl font-bold">
                  8,294
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="text-sm text-muted-foreground">
                  Deals
                </div>

                <div className="mt-2 text-2xl font-bold">
                  427
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Powered by RJ Industries
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center justify-center px-6 py-12">

          <div className="w-full max-w-md rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
            <h1 className="text-3xl font-bold">
              Welcome Back
            </h1>

            <p className="mt-2 text-muted-foreground">
              Sign in to access your OrbitOps workspace.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <label className="mb-2 block text-sm">
                        Email
                      </label>

                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

                          <Input
                            type="email"
                            placeholder="name@company.com"
                            className="h-auto rounded-xl border-border bg-background pl-10 pr-4 py-3 text-base"
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
                      <label className="mb-2 block text-sm">
                        Password
                      </label>

                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="h-auto rounded-xl border-border bg-background pl-10 pr-4 py-3 text-base"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {form.formState.isSubmitting ? "Signing In..." : "Sign In"}
                  <ArrowRight size={16} />
                </button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <Link
                href={pageRoutes.forgotPassword}
                className="text-primary"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="mt-6 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href={pageRoutes.signup}
                className="font-semibold text-primary"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}