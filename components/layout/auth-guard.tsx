"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { endSession } from "@/lib/auth/session";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToFetchMe, reqToRefreshProfile } from "@/lib/store/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const PROFILE_REFRESH_INTERVAL_MS = 60 * 1000;

export function AuthGuard({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ orgnization?: string }>();
  const { user, isAuthChecked, needResetPassword } = useAuth();
  const sessionCheckFailed = useAppSelector((state) => state.auth.sessionCheckFailed);

  // `user` comes from /me, i.e. the server-verified JWT, so this is the
  // check that the URL's org is actually the signed-in user's org.
  const isWrongOrg =
    !!user && !!params?.orgnization && params.orgnization !== String(user.organizationId);

  useEffect(() => {
    if (!isAuthChecked) {
      dispatch(reqToFetchMe({ data: null }));
    }
  }, [dispatch, isAuthChecked]);

  // A role change made by an admin elsewhere reaches this tab's menus when
  // the user comes back to it, at most once a minute.
  const hasUser = !!user;
  useEffect(() => {
    if (!hasUser) return;
    let lastRefresh = Date.now();

    const onFocus = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < PROFILE_REFRESH_INTERVAL_MS) return;
      lastRefresh = Date.now();
      dispatch(reqToRefreshProfile({ data: null }));
    };

    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [dispatch, hasUser]);

  useEffect(() => {
    if (!isAuthChecked) return;

    if (!user) {
      if (needResetPassword) {
        router.replace(pageRoutes.resetPassword);
        return;
      }
      // Offline / 5xx says nothing about the session; the retry UI below
      // handles it instead of signing the user out.
      if (sessionCheckFailed) return;

      // The session is definitively gone (refresh already failed, or the
      // token was rejected outright). endSession clears cookies via the
      // backend and lands on "/", which the proxy never bounces back.
      void endSession();
      return;
    }

    if (needResetPassword) {
      router.replace(pageRoutes.resetPassword);
      return;
    }

    if (isWrongOrg) {
      router.replace(buildOrgRoute(String(user.organizationId), pageRoutes.dashboard));
    }
  }, [isAuthChecked, user, needResetPassword, sessionCheckFailed, isWrongOrg, router]);

  if (isAuthChecked && !user && sessionCheckFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-muted-foreground">
            We couldn&apos;t reach the server to load your workspace.
          </p>
          <button
            type="button"
            onClick={() => dispatch(reqToFetchMe({ data: null }))}
            className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthChecked || !user || needResetPassword || isWrongOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
