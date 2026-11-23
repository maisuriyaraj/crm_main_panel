"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { countdownText, refreshWaitSeconds } from "@/lib/ads/format";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToSyncAdProvider, type AdProvider, type AdSyncResult } from "@/lib/store/slices/adIntegrationsSlice";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// What one refresh did, in plain words. The API's own `reason` is already plain
// English written for the member, so it is shown as it comes.
const resultText = (name: string, result: AdSyncResult) => {
  if (result.status === "ok") {
    if (result.no_accounts_selected) return `${name} has no chosen ad accounts, so there was nothing to refresh.`;
    const campaigns = (result.campaigns_created ?? 0) + (result.campaigns_updated ?? 0);
    return `${name} figures updated: ${campaigns} campaign${campaigns === 1 ? "" : "s"} and ${result.metric_rows ?? 0} day${result.metric_rows === 1 ? "" : "s"} of results.`;
  }
  if (result.status === "reconnect_required") return `${name} needs connecting again, so no figures could be fetched.`;
  if (result.status === "in_progress") return `A ${name} refresh is already running. The figures will update in a moment.`;
  return result.reason || `${name} couldn't be refreshed. It is tried again automatically within the hour.`;
};

// Refresh the figures now. The platforms are read every hour anyway, and the API
// refuses a second refresh of the same platform within five minutes, so the
// button counts down rather than failing when it is pressed again.
export function AdRefreshButton({
  provider,
  name,
  lastSyncedAt,
  canRefresh,
  size = "sm",
  onSynced,
}: {
  provider: AdProvider;
  name: string;
  lastSyncedAt: string | null;
  canRefresh: boolean;
  size?: "sm" | "default";
  onSynced?: () => void;
}) {
  const dispatch = useAppDispatch();
  const syncing = useAppSelector((state) => state.adIntegrations.syncing) === provider;
  // The countdown is worked out from the last sync and the current second, so a
  // new last-synced time is reflected at once without copying it into state.
  const [now, setNow] = useState(() => Date.now());
  const wait = refreshWaitSeconds(lastSyncedAt, now);

  // One timer while the gap is still running; it stops itself at zero so the
  // page is not re-rendered every second for nothing.
  useEffect(() => {
    if (refreshWaitSeconds(lastSyncedAt) === 0) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (refreshWaitSeconds(lastSyncedAt) === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncedAt]);

  const refresh = () => {
    dispatch(
      reqToSyncAdProvider({
        data: { provider },
        onSuccess: (payload) => {
          notify(resultText(name, payload.sync), { type: payload.sync.status === "ok" ? "success" : "info" });
          onSynced?.();
        },
        onFailure: (error) => notify(apiErrorMessage(error, `Couldn't refresh ${name}.`), { type: "error" }),
      }),
    );
  };

  const blocked = wait > 0;
  const button = (
    <Button variant="outline" size={size} onClick={refresh} disabled={!canRefresh || syncing || blocked}>
      <RefreshCw className={syncing ? "animate-spin" : undefined} aria-hidden />
      {syncing ? "Refreshing…" : blocked ? `Refresh in ${countdownText(wait)}` : "Refresh"}
    </Button>
  );

  if (canRefresh && !blocked) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        {/* A disabled button fires no pointer events, so the reason needs a wrapper. */}
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent>
          {!canRefresh
            ? "Only an owner or admin who manages ad platforms can refresh."
            : `${name} was refreshed moments ago. Figures also update by themselves every hour.`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
