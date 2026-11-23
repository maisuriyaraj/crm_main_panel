"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, TriangleAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { endImpersonation } from "@/lib/auth/impersonation";
import { setImpersonationRestrictedListener } from "@/lib/axios";
import { notify } from "@/lib/commonFunctions";
import { Button } from "@/components/ui/button";

// Below this the staff member needs to wrap up: the session is never extended.
const WARN_BELOW_MS = 5 * 60 * 1000;

const twoDigits = (value: number) => String(value).padStart(2, "0");

const countdown = (msLeft: number) => {
  const total = Math.max(Math.floor(msLeft / 1000), 0);
  return `${twoDigits(Math.floor(total / 60))}:${twoDigits(total % 60)}`;
};

// Sits above the whole workspace and cannot be dismissed, so nobody can forget
// that OrbitOps support — not the member — is the one clicking. The staff
// member's name is never shown: the API does not send it.
export function ImpersonationBanner() {
  const { user, impersonation } = useAuth();
  const expiresAt = impersonation?.expiresAt ?? null;
  const [msLeft, setMsLeft] = useState<number>(() =>
    expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0,
  );
  const [ending, setEnding] = useState(false);

  // Mounted on every workspace page, so it is the one place that can explain a
  // refusal the screens did not already hide.
  useEffect(() => {
    setImpersonationRestrictedListener((message) => notify(message, { type: "error" }));
    return () => setImpersonationRestrictedListener(null);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setMsLeft(new Date(expiresAt).getTime() - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!impersonation) return null;

  const warning = msLeft <= WARN_BELOW_MS;

  const end = async () => {
    setEnding(true);
    try {
      await endImpersonation();
    } catch {
      // endImpersonation closes this tab's session either way; nothing to retry.
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full border-b-2 border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm">
        <ShieldAlert className="size-5 shrink-0" aria-hidden />
        <p className="min-w-0 font-semibold">
          Impersonating {user?.fullName ?? "this member"}
          {user?.organizationName ? ` at ${user.organizationName}` : ""}
        </p>
        <p className="text-amber-900/80 dark:text-amber-100/80">
          {impersonation.adminDisplay} · every action is recorded
        </p>

        <span
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-semibold tabular-nums ${
            warning
              ? "bg-destructive text-white"
              : "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-50"
          }`}
        >
          {warning && <TriangleAlert className="size-3.5" aria-hidden />}
          {countdown(msLeft)} left
        </span>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={ending}
          onClick={end}
          className="shrink-0 border-amber-700 bg-transparent text-amber-950 hover:bg-amber-200 dark:border-amber-300 dark:text-amber-50 dark:hover:bg-amber-900"
        >
          {ending ? "Ending…" : "End session"}
        </Button>
      </div>

      {warning && (
        <p className="border-t border-amber-500/60 px-4 py-1.5 text-xs font-medium">
          Less than 5 minutes left. The session ends on its own and cannot be extended — start a new one from Master Admin if you need longer.
        </p>
      )}
    </div>
  );
}
