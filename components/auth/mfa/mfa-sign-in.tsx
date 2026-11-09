"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { confirmEnrollment, startEnrollment, verifySignIn, type MfaChallenge } from "@/lib/auth/mfa";
import { apiErrorCode, apiErrorMessage } from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import { CodeForm } from "./code-form";
import { EnrollStep, endsTheStep } from "./enroll-step";
import { RecoveryCodes } from "./recovery-codes";

type Stage = "code" | "enroll" | "codes";

// The second sign-in step, after a correct password (or an accepted invitation, or
// the forced password reset). The MFA token stays in the caller's state only; once
// the server accepts a code it sets the session cookies and `onSignedIn` runs.
// After a first set-up the recovery codes are shown before continuing.
export function MfaSignIn({
  challenge,
  onSignedIn,
  onStepEnded,
  onCancel,
}: {
  challenge: MfaChallenge;
  onSignedIn: () => void | Promise<void>;
  onStepEnded: (message: string) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<Stage>(challenge.enrollmentRequired ? "enroll" : "code");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (value: string) => {
    setError(null);
    try {
      await verifySignIn(challenge.mfaToken, useRecovery ? { recovery_code: value } : { code: value });
      await onSignedIn();
      return true;
    } catch (failure) {
      if (endsTheStep(failure)) {
        onStepEnded(apiErrorMessage(failure, "Your sign-in step expired. Please sign in again."));
        return true;
      }
      setError(
        useRecovery && apiErrorCode(failure) === "INVALID_CODE"
          ? "That recovery code didn't work. Each one works only once; check you typed it as written."
          : apiErrorMessage(failure, "That code didn't work. Please try again."),
      );
      return false;
    }
  };

  const title = stage === "enroll" ? "Set up multi-factor sign-in" : stage === "codes" ? "Save your recovery codes" : "Enter your authentication code";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5 text-primary" aria-hidden /> {title}</h2>
        {stage === "enroll" && (
          <p className="mt-1 text-sm text-muted-foreground">Your organization requires a code from an authenticator app at every sign-in.</p>
        )}
        {stage === "code" && (
          <p className="mt-1 text-sm text-muted-foreground">
            {useRecovery ? "Enter one of the recovery codes you saved when you set up MFA." : "Open your authenticator app and enter the 6-digit code for OrbitOps."}
          </p>
        )}
      </div>

      {stage === "enroll" && (
        <EnrollStep
          startKey={challenge.mfaToken}
          start={() => startEnrollment(challenge.mfaToken)}
          confirm={(code) => confirmEnrollment(challenge.mfaToken, code)}
          onConfirmed={(recoveryCodes) => {
            setCodes(recoveryCodes);
            setStage("codes");
          }}
          onStepEnded={onStepEnded}
        />
      )}

      {stage === "codes" && codes && (
        <RecoveryCodes
          codes={codes}
          continueLabel="Continue to OrbitOps"
          onContinue={() => {
            setCodes(null);
            void onSignedIn();
          }}
        />
      )}

      {stage === "code" && (
        <>
          <CodeForm
            key={useRecovery ? "recovery" : "totp"}
            kind={useRecovery ? "recovery" : "totp"}
            label={useRecovery ? "Recovery code" : "6-digit code"}
            submitLabel="Sign in"
            error={error}
            onSubmit={verify}
          />
          <div className="flex flex-col items-center gap-1 text-center">
            <Button type="button" variant="link" onClick={() => { setError(null); setUseRecovery((on) => !on); }}>
              {useRecovery ? "Use a code from my app instead" : "Use a recovery code"}
            </Button>
            {!useRecovery && (
              <p className="text-xs text-muted-foreground">Lost your phone and your recovery codes? Ask your workspace admin to reset your MFA.</p>
            )}
          </div>
        </>
      )}

      {stage !== "codes" && (
        <div className="text-center">
          <Button type="button" variant="link" onClick={onCancel}>Sign in as someone else</Button>
        </div>
      )}
    </div>
  );
}
