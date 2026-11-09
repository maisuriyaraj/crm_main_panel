"use client";

import { Button } from "@/components/ui/button";

// The wizard's buttons under every step: Back, Skip, and the step's own action.
// With no `submitLabel` the main button is "Continue" and runs `onContinue`.
export function StepActions({
  isSaving,
  onBack,
  onSkip,
  submitLabel,
  onContinue,
  continueLabel = "Continue",
}: {
  isSaving: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  submitLabel?: string;
  onContinue?: () => void;
  continueLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
      <div>
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSaving}>Back</Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip} disabled={isSaving}>Skip for now</Button>
        )}
        {submitLabel ? (
          <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : submitLabel}</Button>
        ) : (
          onContinue && <Button type="button" onClick={onContinue} disabled={isSaving}>{continueLabel}</Button>
        )}
      </div>
    </div>
  );
}
