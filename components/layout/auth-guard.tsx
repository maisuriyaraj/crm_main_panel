"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { pageRoutes } from "@/lib/constants";
import { clearAccessToken } from "@/lib/axios/tokenStore";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToFetchMe } from "@/lib/store/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isAuthChecked, needResetPassword } = useAuth();

  useEffect(() => {
    if (!isAuthChecked) {
      dispatch(reqToFetchMe({ data: null }));
    }
  }, [dispatch, isAuthChecked]);

  useEffect(() => {
    if (!isAuthChecked) return;

    if (!user) {
      // Drop the stale auth cookies first. Without this the proxy still reads
      // us as signed in and redirects /auth/signin back to the dashboard,
      // which lands here again — the reload loop.
      clearAccessToken();
      router.replace(pageRoutes.signin);
      return;
    }

    if (needResetPassword) {
      router.replace(pageRoutes.resetPassword);
    }
  }, [isAuthChecked, user, needResetPassword, router]);

  if (!isAuthChecked || !user || needResetPassword) {
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
