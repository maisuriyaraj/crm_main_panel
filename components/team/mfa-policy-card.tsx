"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { getMfaPolicy, setMfaPolicy, type MfaPolicy } from "@/lib/auth/mfa";
import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

// The organization's rule that every member signs in with an authenticator code.
// Everyone who can see Team sees it; only those who manage members can change it.
export function MfaPolicyCard({ canManage, version }: { canManage: boolean; version: number }) {
  const [policy, setPolicy] = useState<MfaPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getMfaPolicy()
      .then((result) => {
        setPolicy(result);
        setError(null);
      })
      .catch((failure) => setError(apiErrorMessage(failure, "Couldn't load the MFA rule.")));
  }, []);

  // Reloaded with the member list, so the count of members without MFA keeps up.
  useEffect(load, [load, version]);

  const save = async (required: boolean) => {
    setSaving(true);
    try {
      setPolicy(await setMfaPolicy(required));
      notify(required ? "Every member now needs multi-factor sign-in." : "Multi-factor sign-in is now optional.", { type: "success" });
    } catch (failure) {
      notify(apiErrorMessage(failure, "Couldn't change the MFA rule."), { type: "error" });
    } finally {
      setSaving(false);
      setConfirming(null);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 max-w-xl space-y-1">
          <Label htmlFor="require-mfa" className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="size-4 text-primary" aria-hidden /> Require MFA for everyone
          </Label>
          <p className="text-sm text-muted-foreground">
            Every member must use a code from an authenticator app when they sign in. Members already signed in stay signed in until their next sign-in, when anyone without MFA sets it up.
          </p>
          {policy && policy.members_without_mfa > 0 && (
            <p className="text-sm">
              {policy.members_without_mfa} member{policy.members_without_mfa === 1 ? " has" : "s have"} no MFA yet.
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        {policy ? (
          <Switch
            id="require-mfa"
            checked={policy.mfa_required}
            disabled={!canManage || saving}
            onCheckedChange={(next) => setConfirming(next)}
            aria-describedby={canManage ? undefined : "require-mfa-note"}
          />
        ) : (
          !error && <Skeleton className="h-6 w-11" />
        )}
        {!canManage && policy && (
          <p id="require-mfa-note" className="w-full text-xs text-muted-foreground">Only owners and admins can change this.</p>
        )}
      </CardContent>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && !saving && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming ? "Require MFA for everyone?" : "Make MFA optional?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? "Members without MFA will have to set it up at their next sign-in. Nobody is signed out now; to apply it at once, sign members out from their row."
                : "Members can then turn MFA off for themselves. Those who have it keep it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void save(!!confirming); }}>
              {saving ? "Saving…" : confirming ? "Require MFA" : "Make optional"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
