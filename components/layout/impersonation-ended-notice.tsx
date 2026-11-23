"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { registerImpersonationEndedNotice } from "@/lib/auth/session";
import { endReasonText } from "@/lib/auth/impersonation";

// Mounted once in the root layout. By the time it shows, the session has already
// been stopped: every request is cancelled and Redux is wiped. There is nothing
// to sign back in to from here, so it offers no action — the tab is finished.
export function ImpersonationEndedNotice() {
  const [reason, setReason] = useState<string | null | undefined>(undefined);

  useEffect(() => registerImpersonationEndedNotice((next) => setReason(next)), []);

  if (reason === undefined) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center panel-shadow">
        <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden />
        <h1 className="text-xl font-bold">The support session has ended</h1>
        <p className="text-muted-foreground">{endReasonText(reason)}</p>
        <p className="text-sm text-muted-foreground">
          Session ended. You can close this tab. To carry on helping this workspace, start a new
          session from the Master Admin panel.
        </p>
      </div>
    </div>
  );
}
