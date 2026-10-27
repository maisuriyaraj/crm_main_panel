"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";

interface CanProps {
  // One key, or several that must all be granted.
  permission: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

// Renders children only when /me grants the permission. UX only: the API
// re-checks every request, so this never replaces a server check.
export function Can({ permission, fallback = null, children }: CanProps) {
  const { canAll } = useAuth();
  const keys = Array.isArray(permission) ? permission : [permission];
  return <>{canAll(keys) ? children : fallback}</>;
}
