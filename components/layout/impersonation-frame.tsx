"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";

// A coloured strip down each side of the workspace while OrbitOps support is
// signed in, so the screen never looks like an ordinary session even when the
// banner has scrolled behind something.
export function ImpersonationFrame({ children }: { children: ReactNode }) {
  const { isImpersonating } = useAuth();

  if (!isImpersonating) return <>{children}</>;

  return (
    <div className="min-h-screen border-x-4 border-amber-500">
      {children}
    </div>
  );
}
