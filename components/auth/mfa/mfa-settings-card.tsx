"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";

import {
  confirmSetup,
  disableMfa,
  getMfaStatus,
  regenerateRecoveryCodes,
  startSetup,
  type MfaStatus,
} from "@/lib/auth/mfa";
import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToRefreshProfile } from "@/lib/store/slices/authSlice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeForm } from "./code-form";
import { EnrollStep } from "./enroll-step";
import { RecoveryCodes } from "./recovery-codes";

type Panel = null | "setup" | "disable" | "regenerate";

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : null;

// The signed-in member's own multi-factor sign-in: turn it on (QR code, then a code),
// turn it off (a current code; refused while the organization requires it), and new
// recovery codes (a current code; the old ones stop working). The secret and the
// codes live in this component's state only and go when the dialog closes.
export function MfaSettingsCard() {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A new set-up each time the dialog opens, so a remount reuses one start request.
  const [setupRun, setSetupRun] = useState(0);

  const load = useCallback(() => {
    getMfaStatus()
      .then((result) => {
        setStatus(result);
        setLoadError(null);
      })
      .catch((failure) => setLoadError(apiErrorMessage(failure, "Couldn't load your multi-factor sign-in settings.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const close = () => {
    setPanel(null);
    setCodes(null);
    setError(null);
    load();
    dispatch(reqToRefreshProfile({ data: null }));
  };

  const open = (next: Panel) => {
    setError(null);
    setCodes(null);
    if (next === "setup") setSetupRun((n) => n + 1);
    setPanel(next);
  };

  const turnOff = async (code: string) => {
    setError(null);
    try {
      await disableMfa(code);
      notify("Multi-factor sign-in is off.", { type: "success" });
      close();
      return true;
    } catch (failure) {
      setError(apiErrorMessage(failure, "Couldn't turn multi-factor sign-in off."));
      return false;
    }
  };

  const regenerate = async (code: string) => {
    setError(null);
    try {
      setCodes(await regenerateRecoveryCodes(code));
      return true;
    } catch (failure) {
      setError(apiErrorMessage(failure, "Couldn't create new recovery codes."));
      return false;
    }
  };

  const required = !!status?.organization_requires;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="size-5 text-primary" aria-hidden /> Multi-factor sign-in
          {status && <Badge variant={status.enabled ? "secondary" : "outline"}>{status.enabled ? "On" : "Off"}</Badge>}
        </CardTitle>
        <CardDescription>A code from an authenticator app at every sign-in, on top of your password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status && !loadError && <Skeleton className="h-16 w-full" />}
        {loadError && (
          <p role="alert" className="text-sm text-destructive">
            {loadError}{" "}
            <button type="button" className="underline" onClick={load}>Retry</button>
          </p>
        )}

        {status && !status.enabled && (
          <div className="space-y-3">
            {required && (
              <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                Your organization requires multi-factor sign-in. Set it up now, or you&apos;ll be asked to at your next sign-in.
              </p>
            )}
            <Button onClick={() => open("setup")}><ShieldCheck aria-hidden /> Turn on</Button>
          </div>
        )}

        {status && status.enabled && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              On since {formatDate(status.enabled_at) ?? "—"} ·{" "}
              <span className={status.recovery_codes_left <= 2 ? "font-medium text-destructive" : undefined}>
                {status.recovery_codes_left} recovery code{status.recovery_codes_left === 1 ? "" : "s"} left
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => open("regenerate")}><KeyRound aria-hidden /> New recovery codes</Button>
              <Button variant="outline" disabled={required} onClick={() => open("disable")}><ShieldOff aria-hidden /> Turn off</Button>
            </div>
            {required && (
              <p className="text-sm text-muted-foreground">
                You can&apos;t turn it off: your organization requires multi-factor sign-in for every member. An Owner or Admin can change that in Team settings.
              </p>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={panel !== null} onOpenChange={(isOpen) => !isOpen && close()}>
        <DialogContent className="sm:max-w-md">
          {panel === "setup" && (
            <>
              <DialogHeader>
                <DialogTitle>{codes ? "Save your recovery codes" : "Turn on multi-factor sign-in"}</DialogTitle>
                {!codes && <DialogDescription>You&apos;ll stay signed in here.</DialogDescription>}
              </DialogHeader>
              {codes ? (
                <RecoveryCodes codes={codes} continueLabel="Done" onContinue={() => { notify("Multi-factor sign-in is on.", { type: "success" }); close(); }} />
              ) : (
                <EnrollStep startKey={`settings-${setupRun}`} start={startSetup} confirm={confirmSetup} onConfirmed={setCodes} />
              )}
            </>
          )}

          {panel === "disable" && (
            <>
              <DialogHeader>
                <DialogTitle>Turn off multi-factor sign-in?</DialogTitle>
                <DialogDescription>Enter a current code from your authenticator app. A recovery code doesn&apos;t work here.</DialogDescription>
              </DialogHeader>
              <CodeForm label="6-digit code" submitLabel="Turn off" pendingLabel="Turning off…" error={error} onSubmit={turnOff} />
            </>
          )}

          {panel === "regenerate" && (
            <>
              <DialogHeader>
                <DialogTitle>{codes ? "Save your new recovery codes" : "Create new recovery codes"}</DialogTitle>
                {!codes && <DialogDescription>Your old codes stop working as soon as the new ones are made. Enter a current code from your app.</DialogDescription>}
              </DialogHeader>
              {codes ? (
                <RecoveryCodes codes={codes} continueLabel="Done" onContinue={close} />
              ) : (
                <CodeForm label="6-digit code" submitLabel="Create new codes" pendingLabel="Creating…" error={error} onSubmit={regenerate} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
