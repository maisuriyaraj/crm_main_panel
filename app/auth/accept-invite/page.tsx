"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, User } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { handleCookieActions, handleLocalStorageActions, notify } from "@/lib/commonFunctions";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  reqToAcceptInvitation,
  reqToFetchMe,
  reqToLogout,
  reqToPreviewInvitation,
} from "@/lib/store/slices/authSlice";
import { mapInvitationPreviewFromApi } from "@/lib/team/mappers";
import type { InvitationPreview } from "@/lib/team/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Same rule as the forced reset form and the server's accept schema.
const acceptSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AcceptValues = z.infer<typeof acceptSchema>;

type PageState =
  | { kind: "loading" }
  | { kind: "invalid"; message?: string }
  | { kind: "signed-in-elsewhere"; preview: InvitationPreview; signedInAs: string }
  | { kind: "ready"; preview: InvitationPreview };

const INVALID_MESSAGE = "This invitation link is no longer valid. Ask your administrator to send a new one.";

// Reads the token from the URL fragment (never sent to any server) and then
// removes it from the address bar and history.
const takeTokenFromHash = () => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  return token;
};

// The `user` cookie is the sign-in page's non-HttpOnly routing hint.
const signedInEmail = (): string | null => {
  try {
    const raw = handleCookieActions("get", "user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.email === "string" ? parsed.email : null;
  } catch {
    return null;
  }
};

export default function AcceptInvitePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [isSigningOut, setIsSigningOut] = useState(false);

  const form = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { fullName: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const token = tokenRef.current ?? takeTokenFromHash();
    tokenRef.current = token;
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }

    dispatch(
      reqToPreviewInvitation({
        data: { token },
        onSuccess: (raw: unknown) => {
          const preview = mapInvitationPreviewFromApi(raw);
          form.reset({ fullName: preview.fullName ?? "", password: "", confirmPassword: "" });

          const current = signedInEmail();
          if (current && current.toLowerCase() !== preview.email.toLowerCase()) {
            setState({ kind: "signed-in-elsewhere", preview, signedInAs: current });
            return;
          }
          setState({ kind: "ready", preview });
        },
        onFailure: (error: any) => {
          // Every invalid-token case is one generic 410; only a server or
          // network failure deserves a different message.
          const status = error?.response?.status;
          const unreachable = !status || status >= 500;
          setState({ kind: "invalid", message: unreachable ? "We couldn't check this invitation. Please try again." : undefined });
        },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Signs the other account out on this device without leaving the page; the
  // token stays in memory for the acceptance that follows.
  const signOutAndContinue = () => {
    if (state.kind !== "signed-in-elsewhere") return;
    const { preview } = state;
    setIsSigningOut(true);
    const done = () => {
      setIsSigningOut(false);
      setState({ kind: "ready", preview });
    };
    dispatch(reqToLogout({ data: null, onSuccess: done, onFailure: done }));
  };

  const onSubmit = (values: AcceptValues) => {
    const token = tokenRef.current;
    if (!token) return;

    return new Promise<void>((resolve) => {
      dispatch(
        reqToAcceptInvitation({
          data: { token, fullName: values.fullName, password: values.password },
          onSuccess: () => {
            dispatch(
              reqToFetchMe({
                data: null,
                onSuccess: (me: { data: any }) => {
                  handleLocalStorageActions("set", "user", me.data);
                  handleCookieActions("set", "user", me.data, { expires: 30 * 24 * 60 * 60 });
                  notify(`Welcome to ${me.data?.organizationName ?? "your new workspace"}!`, { type: "success" });
                  router.replace(buildOrgRoute(String(me.data?.organizationId), pageRoutes.dashboard));
                  resolve();
                },
                onFailure: () => {
                  notify("You've joined. Please sign in to continue.", { type: "info" });
                  router.replace(pageRoutes.signin);
                  resolve();
                },
              }),
            );
          },
          onFailure: (error: any) => {
            const body = error?.response?.data;
            const fieldErrors: Array<{ field: string | null; message: string }> = body?.errors ?? [];
            const formFields: Record<string, keyof AcceptValues> = { full_name: "fullName", password: "password" };

            if (fieldErrors.some((e) => e.field && formFields[e.field])) {
              fieldErrors.forEach((e) => {
                if (e.field && formFields[e.field]) form.setError(formFields[e.field], { message: e.message });
              });
            } else if (body?.code === "INVITATION_INVALID") {
              setState({ kind: "invalid" });
            } else if (body?.code === "ALREADY_MEMBER" || body?.code === "EMAIL_IN_OTHER_ORG") {
              setState({ kind: "invalid", message: body.message });
            } else {
              notify(body?.message || "Something went wrong. Please try again.", { type: "error" });
            }
            resolve();
          },
        }),
      );
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-glass p-8 backdrop-blur-xl panel-shadow">
        {state.kind === "loading" && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {state.kind === "invalid" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Invitation unavailable</h1>
            <p className="text-muted-foreground">{state.message ?? INVALID_MESSAGE}</p>
            <Button asChild className="w-full">
              <Link href={pageRoutes.signin}>Go to sign in</Link>
            </Button>
          </div>
        )}

        {state.kind === "signed-in-elsewhere" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Join {state.preview.organization.name}</h1>
            <p className="text-muted-foreground">
              You&apos;re signed in as <span className="font-medium text-foreground">{state.signedInAs}</span>. This
              invitation is for <span className="font-medium text-foreground">{state.preview.email}</span>.
            </p>
            <Button className="w-full" onClick={signOutAndContinue} disabled={isSigningOut}>
              {isSigningOut ? "Signing out..." : "Sign out and continue"}
            </Button>
          </div>
        )}

        {state.kind === "ready" && (
          <>
            <h1 className="text-3xl font-bold">Join {state.preview.organization.name}</h1>
            <p className="mt-2 text-muted-foreground">
              {state.preview.inviterName ? `${state.preview.inviterName} invited you` : "You've been invited"} to
              OrbitOps as <span className="font-medium text-foreground">{state.preview.roleName}</span>.
            </p>

            <Form {...form}>
              <form onSubmit={(event) => form.handleSubmit(onSubmit)(event)} className="mt-8 space-y-5" noValidate>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Email</p>
                  <Input value={state.preview.email} readOnly disabled aria-label="Email" />
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Your name" className="pl-10" autoComplete="name" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" className="pl-10" autoComplete="new-password" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" className="pl-10" autoComplete="new-password" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Joining..." : "Accept & join"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
