"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, ShieldAlert, TriangleAlert } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToFetchMe } from "@/lib/store/slices/authSlice";
import { rememberSignedInUser } from "@/lib/auth/session";
import { EXCHANGE_FAILED_MESSAGE, exchangeImpersonationCode } from "@/lib/auth/impersonation";
import { AuthLayout } from "@/components/layout/public/AuthLayout";
import { PublicLogo } from "@/components/layout/public/PublicLogo";
import { Skeleton } from "@/components/ui/skeleton";

// The Master Admin panel hands over a link with the code in the URL fragment,
// which browsers never send to any server. It is read once, dropped from the
// address bar and history straight away, used once, and never stored or logged.
const takeCodeFromHash = (): string | null => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = params.get("code");
  // replaceState rather than pushState: the link must not stay in the back stack.
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  return code;
};

export default function ImpersonatePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Strict mode mounts effects twice in development; the code works only once,
  // so the second run must not spend it.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = takeCodeFromHash();
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(EXCHANGE_FAILED_MESSAGE);
      return;
    }

    const run = async () => {
      try {
        await exchangeImpersonationCode(code);
      } catch {
        // Every refusal is the same generic 400, so there is nothing to tell apart.
        setError(EXCHANGE_FAILED_MESSAGE);
        return;
      }

      // The access cookie is already set; /me says who we are now acting as and
      // carries the banner's session details.
      await dispatch(
        reqToFetchMe({
          data: null,
          onSuccess: (body: { data?: { organizationId?: number | string } }) => {
            const organizationId = body?.data?.organizationId;
            if (!organizationId) {
              setError(EXCHANGE_FAILED_MESSAGE);
              return;
            }
            // The proxy routes by this cookie. It holds no token, only the org id.
            rememberSignedInUser({ organizationId });
            router.replace(buildOrgRoute(String(organizationId), pageRoutes.dashboard));
          },
          onFailure: () => setError(EXCHANGE_FAILED_MESSAGE),
        }),
      );
    };

    void run();
  }, [dispatch, router]);

  return (
    <AuthLayout>
      <section className="relative flex flex-1 flex-col px-5 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <PublicLogo />
        </div>

        <div className="mx-auto my-auto w-full max-w-2xl space-y-6 py-10">
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-100 p-5 text-amber-950 dark:bg-amber-950 dark:text-amber-50">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-5 shrink-0" aria-hidden /> OrbitOps support sign-in
            </p>
            <p className="mt-2 text-sm">
              You are about to sign in to a customer&apos;s workspace as one of its members. The
              session lasts at most 30 minutes, every action is recorded, and passwords,
              multi-factor settings, email addresses and API keys cannot be changed.
            </p>
          </div>

          <div className="flex gap-3 rounded-2xl border border-border bg-card p-5 panel-shadow">
            <TriangleAlert className="size-5 shrink-0 text-amber-600" aria-hidden />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">This replaces any OrbitOps sign-in in this browser.</p>
              <p className="text-muted-foreground">
                If you also use OrbitOps as a tenant here, you will be signed out of that account in
                this browser. Opening the link in a private window instead keeps the two apart.
              </p>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive"
            >
              <CircleAlert className="size-5 shrink-0" aria-hidden />
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{error}</p>
                <p>
                  A link works once and for 60 seconds. Start a new session from the Master Admin
                  panel, then open the new link straight away.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-5 panel-shadow" aria-busy>
              <p className="text-sm text-muted-foreground">Signing in to the workspace…</p>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </div>
      </section>
    </AuthLayout>
  );
}
