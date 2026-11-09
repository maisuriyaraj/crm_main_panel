"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import type { Enrollment } from "@/lib/auth/mfa";
import { apiErrorCode, apiErrorMessage } from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeForm, StepAlert } from "./code-form";

// "ABCD EFGH ..." is easier to type into an app than one long run of letters.
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

// Each start makes a new secret on the server and only the last one counts. A screen
// mounted twice (React does this in development) must share one request, or the key
// shown could be one the server already replaced. Entries go as soon as the request
// settles, so no secret is kept here.
const inFlight = new Map<string, Promise<Enrollment>>();
const startOnce = (key: string, start: () => Promise<Enrollment>) => {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const request = start().finally(() => {
    setTimeout(() => inFlight.delete(key), 0);
  });
  inFlight.set(key, request);
  return request;
};

// Setting up an authenticator app: QR code drawn here in the browser (the secret is
// never sent anywhere else), the key to type by hand, then a code to prove it works.
// Used at sign-in (with the MFA token) and from the Security page (signed in).
export function EnrollStep({
  startKey,
  start,
  confirm,
  onConfirmed,
  onStepEnded,
  confirmLabel = "Turn on MFA",
}: {
  // Names this setup, so a remount reuses the same start request.
  startKey: string;
  start: () => Promise<Enrollment>;
  confirm: (code: string) => Promise<string[]>;
  onConfirmed: (recoveryCodes: string[]) => void;
  // The sign-in step expired or the account stopped working: only a new sign-in helps.
  onStepEnded?: (message: string) => void;
  confirmLabel?: string;
}) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    startOnce(`${startKey}:${attempt}`, start)
      .then((result) => {
        if (!live) return;
        setEnrollment(result);
        setError(null);
      })
      .catch((failure: unknown) => {
        if (!live) return;
        if (endsTheStep(failure) && onStepEnded) onStepEnded(apiErrorMessage(failure, "Please sign in again."));
        else setError(apiErrorMessage(failure, "Couldn't start the setup. Please try again."));
      });
    return () => {
      live = false;
    };
    // A new secret each attempt; the start function is fixed for this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, startKey]);

  useEffect(() => {
    if (!enrollment) return;
    let live = true;
    QRCode.toDataURL(enrollment.otpauth_url, { margin: 1, width: 192, errorCorrectionLevel: "M" })
      .then((url) => live && setQr(url))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [enrollment]);

  const submit = async (code: string) => {
    setError(null);
    try {
      const codes = await confirm(code);
      // The secret is no longer needed once the codes are on screen.
      setEnrollment(null);
      setQr(null);
      onConfirmed(codes);
      return true;
    } catch (failure) {
      if (endsTheStep(failure) && onStepEnded) {
        onStepEnded(apiErrorMessage(failure, "Please sign in again."));
        return true;
      }
      if (apiErrorCode(failure) === "ENROLLMENT_NOT_STARTED") {
        setEnrollment(null);
        setAttempt((n) => n + 1);
        return false;
      }
      setError(apiErrorMessage(failure, "That code didn't work. Please try again."));
      return false;
    }
  };

  if (!enrollment) {
    return error ? (
      <div className="space-y-4">
        <StepAlert message={error} />
        <Button type="button" className="w-full" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </div>
    ) : (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="mx-auto size-48" />
        <p className="text-center text-sm text-muted-foreground">Preparing your setup code…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password or similar), then enter the 6-digit code it shows.
      </p>
      <div className="flex flex-col items-center gap-3">
        {qr ? (
          // A data URL drawn in the browser; next/image adds nothing for it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code to add OrbitOps to your authenticator app" width={192} height={192} className="rounded-lg border border-border bg-white p-1" />
        ) : (
          <div className="flex size-48 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">Drawing the QR code…</div>
        )}
        <div className="w-full text-center">
          <p className="text-xs text-muted-foreground">Can&apos;t scan it? Enter this key in your app instead ({enrollment.account}):</p>
          <code className="mt-1 block select-all break-all font-mono text-sm">{grouped(enrollment.secret)}</code>
        </div>
      </div>
      <CodeForm label="6-digit code" submitLabel={confirmLabel} error={error} onSubmit={submit} />
    </div>
  );
}

// The MFA token works once and for 5 minutes, and a disabled account stops here.
export const endsTheStep = (failure: unknown) => {
  const status = (failure as { response?: { status?: number } } | undefined)?.response?.status;
  const code = apiErrorCode(failure);
  return code === "MFA_TOKEN_INVALID" || code === "MFA_TOKEN_MISSING" || code === "MFA_WRONG_STEP" || code === "ACCOUNT_DISABLED" || status === 401;
};
