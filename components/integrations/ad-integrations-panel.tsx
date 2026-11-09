"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Link2, Unplug } from "lucide-react";

import { API_ERROR_MESSAGES, apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToConnectAdProvider,
  reqToDisconnectAdProvider,
  reqToGetAdIntegrations,
  reqToSelectAdAccounts,
  type AdConnectionStatus,

  type AdProviderState,
} from "@/lib/store/slices/adIntegrationsSlice";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StepAlert } from "@/components/auth/mfa/code-form";

const STATUS_LABEL: Record<AdConnectionStatus, string> = {
  not_configured: "Not configured by OrbitOps yet",
  not_connected: "Not connected",
  connected: "Connected",
  expired: "Expired",
  revoked: "Not connected",
  error: "Error",
};

const STATUS_VARIANT: Record<AdConnectionStatus, "secondary" | "outline" | "destructive"> = {
  not_configured: "outline",
  not_connected: "outline",
  connected: "secondary",
  expired: "destructive",
  revoked: "outline",
  error: "destructive",
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : null;

// What the provider's redirect back put in the URL: ?provider=meta&result=connected or
// &error=CODE. Shown once, in plain words, never the raw code alone.
export const callbackMessage = (search: URLSearchParams): { ok: boolean; text: string } | null => {
  const provider = search.get("provider");
  if (provider !== "meta" && provider !== "google") return null;
  const name = provider === "meta" ? "Meta" : "Google";
  if (search.get("result") === "connected") return { ok: true, text: `${name} is connected. Choose the ad accounts OrbitOps may use.` };
  const code = search.get("error");
  if (!code) return null;
  return { ok: false, text: `${name} wasn't connected. ${API_ERROR_MESSAGES[code] ?? API_ERROR_MESSAGES.PROVIDER_ERROR}` };
};

// The Meta and Google cards: status, Connect, choose accounts, Disconnect. Only
// providers in the organization's plan are shown. `returnTo` is where the provider's
// redirect lands afterwards.
export function AdIntegrationsPanel({ returnTo, compact = false }: { returnTo: "setup" | "settings"; compact?: boolean }) {
  const dispatch = useAppDispatch();
  const { providers, isLoaded, isLoading, error } = useAppSelector((state) => state.adIntegrations);

  useEffect(() => {
    dispatch(reqToGetAdIntegrations({ data: null }));
  }, [dispatch]);

  if (!isLoaded) {
    return error && !isLoading ? (
      <div className="space-y-3">
        <StepAlert message={error} />
        <Button variant="outline" onClick={() => dispatch(reqToGetAdIntegrations({ data: null }))}>Try again</Button>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const shown = providers.filter((entry) => entry.enabled);
  if (!shown.length) {
    return <p className="text-sm text-muted-foreground">Ad platforms aren&apos;t part of your plan, so there is nothing to connect.</p>;
  }

  return (
    <div className={compact ? "space-y-4" : "grid gap-4 lg:grid-cols-2"}>
      {shown.map((entry) => (
        // Keyed by the connection, so a new connection starts with its own selection.
        <ProviderCard key={`${entry.provider}-${entry.connection?.connected_at ?? "none"}`} entry={entry} returnTo={returnTo} />
      ))}
    </div>
  );
}

function ProviderCard({ entry, returnTo }: { entry: AdProviderState; returnTo: "setup" | "settings" }) {
  const dispatch = useAppDispatch();
  const pending = useAppSelector((state) => state.adIntegrations.pending) === entry.provider;
  const connection = entry.connection;
  const accounts = useMemo(() => connection?.accounts ?? [], [connection]);
  const [chosen, setChosen] = useState<string[]>(() => accounts.filter((account) => account.selected).map((account) => account.id));
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const status = entry.status;
  const savedSelection = accounts.filter((account) => account.selected).map((account) => account.id).sort().join(",");
  const selectionChanged = [...chosen].sort().join(",") !== savedSelection;

  const connect = async () => {
    setLocalError(null);
    await dispatch(reqToConnectAdProvider({
      data: { provider: entry.provider, returnTo },
      onSuccess: ({ authorization_url }) => {
        // Only the providers' own sign-in pages, never a URL from anywhere else.
        const url = new URL(authorization_url);
        const allowed = entry.provider === "meta" ? url.hostname === "www.facebook.com" : url.hostname === "accounts.google.com";
        if (url.protocol !== "https:" || !allowed) {
          setLocalError(API_ERROR_MESSAGES.PROVIDER_ERROR);
          return;
        }
        window.location.assign(url.toString());
      },
      onFailure: (failure) => setLocalError(apiErrorMessage(failure, "Couldn't start connecting.")),
    }));
  };

  const save = () => {
    setLocalError(null);
    dispatch(reqToSelectAdAccounts({
      data: { provider: entry.provider, accountIds: chosen },
      onSuccess: () => notify(`${entry.name} accounts saved.`, { type: "success" }),
      onFailure: (failure) => setLocalError(apiErrorMessage(failure, "Couldn't save the accounts.")),
    }));
  };

  const disconnect = () => {
    setLocalError(null);
    dispatch(reqToDisconnectAdProvider({
      data: { provider: entry.provider },
      onSuccess: (result) => {
        setConfirmDisconnect(false);
        notify(
          result.revoked_at_provider
            ? `${entry.name} is disconnected and OrbitOps' access was removed there too.`
            : `${entry.name} is disconnected. OrbitOps no longer keeps any access; you can also remove OrbitOps in your ${entry.name} account settings.`,
          { type: "success" },
        );
      },
      onFailure: (failure) => {
        setConfirmDisconnect(false);
        setLocalError(apiErrorMessage(failure, "Couldn't disconnect."));
      },
    }));
  };

  const toggle = (id: string, on: boolean) => setChosen((current) => (on ? [...new Set([...current, id])] : current.filter((value) => value !== id)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {entry.name}
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </CardTitle>
        <CardDescription>
          {entry.provider === "meta" ? "Facebook and Instagram ad accounts." : "Google Ads accounts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "not_configured" && (
          <p className="text-sm text-muted-foreground">OrbitOps hasn&apos;t finished setting up the {entry.name} connection yet. You&apos;ll be able to connect here as soon as it&apos;s ready.</p>
        )}

        {status === "not_connected" && (
          <p className="text-sm text-muted-foreground">Connect to let OrbitOps see your {entry.name} ad accounts. You&apos;ll sign in at {entry.name} and choose what to allow.</p>
        )}

        {(status === "expired" || status === "error") && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {status === "expired" ? `The ${entry.name} connection has ended. Connect again to keep using these accounts.` : connection?.last_error || "The connection stopped working. Connect again."}
          </p>
        )}

        {connection && status === "connected" && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
              Connected{connection.external_user_name ? ` as ${connection.external_user_name}` : ""}{connection.connected_at ? ` on ${formatDate(connection.connected_at)}` : ""}.
            </p>
            {connection.expires_at && (
              <p className="text-xs text-muted-foreground">Meta connections last about 60 days; this one ends on {formatDate(connection.expires_at)}. We&apos;ll email your admins a week before.</p>
            )}
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">This {entry.name} login can&apos;t reach any ad accounts.</p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Ad accounts OrbitOps may use</legend>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-border p-3">
                  {accounts.map((account) => (
                    <li key={account.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`${entry.provider}-${account.id}`}
                        checked={chosen.includes(account.id)}
                        disabled={account.is_manager || pending}
                        onCheckedChange={(value) => toggle(account.id, value === true)}
                      />
                      <Label htmlFor={`${entry.provider}-${account.id}`} className="text-sm font-normal leading-snug">
                        <span className="font-medium">{account.name || account.id}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[account.id, account.currency, account.time_zone, account.is_manager ? "manager account" : account.status && account.status !== "active" && account.status !== "enabled" ? "not active" : null].filter(Boolean).join(" · ")}
                        </span>
                      </Label>
                    </li>
                  ))}
                </ul>
                <Button size="sm" onClick={save} disabled={!selectionChanged || pending}>{pending ? "Saving…" : "Save accounts"}</Button>
              </fieldset>
            )}
          </div>
        )}

        <StepAlert message={localError} />

        <div className="flex flex-wrap gap-2">
          {status !== "not_configured" && status !== "connected" && (
            <Button onClick={connect} disabled={pending}><Link2 aria-hidden /> {pending ? "Opening…" : status === "not_connected" ? `Connect ${entry.name}` : `Connect ${entry.name} again`}</Button>
          )}
          {connection && (
            <Button variant="outline" onClick={() => setConfirmDisconnect(true)} disabled={pending}><Unplug aria-hidden /> Disconnect</Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmDisconnect} onOpenChange={(open) => !open && !pending && setConfirmDisconnect(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {entry.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              OrbitOps removes its access at {entry.name} where it can, and deletes the stored access. The chosen accounts are cleared. You can connect again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); disconnect(); }}>
              {pending ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

