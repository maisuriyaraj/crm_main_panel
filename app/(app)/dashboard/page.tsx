"use client";

import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {user?.fullName}</h1>

      <p className="text-muted-foreground">
        You&apos;re signed in as <Badge variant="secondary">{role}</Badge>
      </p>

      <p className="text-sm text-muted-foreground">
        CRM feature screens (leads, deals, pipelines) aren&apos;t built yet — this is just the
        shared landing point after login.
      </p>
    </div>
  );
}
