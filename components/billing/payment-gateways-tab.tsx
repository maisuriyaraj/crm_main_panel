"use client";

import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToDeletePaymentGateway,
  reqToSavePaymentGateway,
  type PaymentGateway,
} from "@/lib/store/slices/billingSettingsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PROVIDER_LABELS: Record<string, { name: string; keyLabel: string; help: string }> = {
  razorpay: {
    name: "Razorpay",
    keyLabel: "Key id",
    help: "From your Razorpay dashboard, under Settings → API keys.",
  },
  stripe: {
    name: "Stripe",
    keyLabel: "Publishable key",
    help: "From your Stripe dashboard, under Developers → API keys.",
  },
  paypal: {
    name: "PayPal",
    keyLabel: "Client id",
    help: "From your PayPal developer dashboard, under Apps & Credentials.",
  },
};

export function PaymentGatewaysTab({ canManage }: { canManage: boolean }) {
  const { gateways } = useAppSelector((state) => state.billingSettings);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Said plainly, because storing a working key normally means money can move. */}
      <Alert>
        <AlertTitle>Not used yet</AlertTitle>
        <AlertDescription>
          These keys are stored for future payment collection. Nothing charges a card, creates a payment link or takes
          a payment today, and no key is sent to the gateway. You can fill them in now so online payment works the day
          it is switched on.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {gateways.map((gateway) => (
          <GatewayCard key={gateway.provider} gateway={gateway} canManage={canManage} onError={setError} />
        ))}
      </div>
    </div>
  );
}

function GatewayCard({
  gateway,
  canManage,
  onError,
}: {
  gateway: PaymentGateway;
  canManage: boolean;
  onError: (message: string | null) => void;
}) {
  const dispatch = useAppDispatch();
  const { isSaving } = useAppSelector((state) => state.billingSettings);
  const labels = PROVIDER_LABELS[gateway.provider] ?? { name: gateway.provider, keyLabel: "Key id", help: "" };
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [removing, setRemoving] = useState(false);

  const save = async () => {
    onError(null);
    // The secret is never read back, so it is sent only when it was typed: saving the
    // key id alone must not wipe a secret that is already stored.
    const values: { provider: string; key_id?: string; key_secret?: string } = { provider: gateway.provider };
    if (keyId.trim() !== "") values.key_id = keyId.trim();
    if (secret.trim() !== "") values.key_secret = secret.trim();

    if (values.key_id === undefined && values.key_secret === undefined) {
      onError("Enter a key id or a secret key before saving.");
      return;
    }

    const action = await dispatch(reqToSavePaymentGateway({
      data: values,
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't save those keys.")),
    }));
    if (reqToSavePaymentGateway.fulfilled.match(action)) {
      notify(`${labels.name} keys saved.`, { type: "success" });
      setKeyId("");
      setSecret("");
    }
  };

  const toggleActive = async (checked: boolean) => {
    onError(null);
    const action = await dispatch(reqToSavePaymentGateway({
      data: { provider: gateway.provider, active: checked },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't change that gateway.")),
    }));
    if (reqToSavePaymentGateway.fulfilled.match(action)) {
      notify(checked ? `${labels.name} marked ready.` : `${labels.name} turned off.`, { type: "success" });
    }
  };

  const remove = async () => {
    onError(null);
    const action = await dispatch(reqToDeletePaymentGateway({
      data: { provider: gateway.provider },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't remove those keys.")),
    }));
    if (reqToDeletePaymentGateway.fulfilled.match(action)) {
      notify(`${labels.name} keys removed.`, { type: "success" });
    }
    setRemoving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden /> {labels.name}
          {gateway.configured ? <Badge variant="secondary">Keys saved</Badge> : <Badge variant="outline">Not set up</Badge>}
        </CardTitle>
        <CardDescription>{labels.help}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            {labels.keyLabel} on file:{" "}
            <span className="font-mono text-foreground">{gateway.keyIdMasked ?? "none"}</span>
          </p>
          <p className="text-muted-foreground">
            Secret key: {gateway.hasSecret ? "stored, and never shown again" : "not stored"}
          </p>
        </div>

        {canManage && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`key-${gateway.provider}`}>{labels.keyLabel}</Label>
              <Input
                id={`key-${gateway.provider}`}
                value={keyId}
                placeholder={gateway.configured ? "Leave blank to keep the one on file" : ""}
                disabled={isSaving}
                onChange={(event) => setKeyId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`secret-${gateway.provider}`}>Secret key</Label>
              <Input
                id={`secret-${gateway.provider}`}
                type="password"
                autoComplete="off"
                value={secret}
                placeholder={gateway.hasSecret ? "Leave blank to keep the stored secret" : ""}
                disabled={isSaving}
                onChange={(event) => setSecret(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Stored encrypted. Once saved it is never shown again, not even to you — replace it by typing a new one.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <Label htmlFor={`active-${gateway.provider}`}>Ready to use</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Marks these keys as the ones to use once online payment is built.
                </p>
              </div>
              <Switch
                id={`active-${gateway.provider}`}
                checked={gateway.active}
                disabled={isSaving || (!gateway.hasSecret && !gateway.active)}
                onCheckedChange={toggleActive}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {gateway.configured && (
                <Button variant="outline" onClick={() => setRemoving(true)} disabled={isSaving}>
                  <Trash2 className="size-4" aria-hidden /> Remove keys
                </Button>
              )}
              <Button onClick={save} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save keys"}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your {labels.name} keys?</AlertDialogTitle>
            <AlertDialogDescription>
              The key id and the secret are deleted. You would have to enter them again from your {labels.name}
              {" "}dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
