"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAdManagerQuery, type AdPlatformKey } from "@/hooks/useAdManagerQuery";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import {
  describeAgo,
  formatCount,
  formatDay,
  formatMoneyMinor,
  formatPercent,
} from "@/lib/ads/format";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToGetAdCampaigns,
  type AdCampaign,
  type AdCampaignProviderState,
  type AdCampaignScope,
  type AdCampaignTotals,
  type AdProvider,
} from "@/lib/store/slices/adIntegrationsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdRefreshButton } from "@/components/ads/refresh-button";

const PAGE_SIZE = 25;
const ALL = "__all__";

// The provider's own campaign state, said in ordinary words. Anything unexpected
// is shown as the platform wrote it rather than hidden.
const STATUS_WORDS: Record<string, string> = {
  active: "Active",
  enabled: "Active",
  paused: "Paused",
  archived: "Archived",
  deleted: "Removed",
  removed: "Removed",
  ended: "Ended",
  draft: "Draft",
  in_process: "Starting",
  with_issues: "Has issues",
};

const statusWord = (status: string | null) => (status ? STATUS_WORDS[status] ?? status.replace(/_/g, " ") : "—");

const statusVariant = (status: string | null): "secondary" | "outline" | "destructive" =>
  status === "active" || status === "enabled" ? "secondary" : status === "with_issues" ? "destructive" : "outline";

// Campaigns and their figures. Which platform, which date range and which
// search term come from the Ad Manager header through the URL, so this tab and
// the header can never be showing different things.
//
// Everything here comes from what the hourly sync already stored, so no ad
// platform is called to draw the page.
export function AdCampaignsView({ platforms }: { platforms: { provider: AdProvider; name: string }[] }) {
  const dispatch = useAppDispatch();
  const params = useParams<{ orgnization: string }>();
  const { canAll } = useAuth();
  const canRefresh = canAll(["ads.manage", "organization.settings.manage"]);
  const { campaigns, campaignsLoading, campaignsError, platformStates } = useAppSelector((state) => state.adIntegrations);
  const { platform, range, search, page, setPage } = useAdManagerQuery();

  // Both filters belong to one platform: an ad account id means nothing to
  // another platform, and a status is the platform's own word, so Google's
  // "enabled" would match no Meta campaign. They are therefore remembered
  // together with the platform they were chosen for, and read back as "any"
  // once the platform has moved on — rather than being cleared afterwards,
  // which would leave one render asking the new platform for the old filter.
  const [chosen, setChosen] = useState<{ platform: AdPlatformKey; accountId: string; status: string }>({
    platform,
    accountId: ALL,
    status: ALL,
  });
  const mine = chosen.platform === platform;
  const accountId = mine ? chosen.accountId : ALL;
  const status = mine ? chosen.status : ALL;
  const choose = (change: { accountId?: string; status?: string }) => {
    setChosen({ platform, accountId, status, ...change });
    setPage(1);
  };

  // WhatsApp is not a connection of its own: Click-to-WhatsApp ads are Meta ads,
  // so choosing it reads the Meta figures and says so.
  const scope: AdCampaignScope = platform === "all" ? "all" : platform === "whatsapp" ? "meta" : platform;
  const combined = scope === "all";

  // One request builder for both the automatic load and Try again / after a
  // refresh, so the three can never ask for different things.
  const load = useCallback(() => {
    dispatch(
      reqToGetAdCampaigns({
        data: {
          provider: scope,
          from: range.from,
          to: range.to,
          accountId: combined || accountId === ALL ? undefined : accountId,
          status: status === ALL ? undefined : status,
          search: search || undefined,
          page,
          limit: PAGE_SIZE,
        },
      }),
    );
  }, [dispatch, scope, combined, range.from, range.to, accountId, status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Only ever what is on screen: the store holds one page at a time, so a page
  // belonging to another platform is ignored rather than shown under this one.
  const forThisScope = campaigns?.provider === scope;
  const rows: AdCampaign[] = useMemo(() => (forThisScope ? campaigns!.campaigns : []), [forThisScope, campaigns]);
  const totals: AdCampaignTotals[] = forThisScope ? campaigns!.totals : [];
  const pagination = forThisScope ? campaigns!.pagination : null;
  const connectionStatus = forThisScope ? campaigns!.connection_status : null;
  const lastSyncedAt = forThisScope ? campaigns!.last_synced_at : null;

  const platformName = combined
    ? "All platforms"
    : platform === "whatsapp"
      ? "WhatsApp"
      : platforms.find((entry) => entry.provider === scope)?.name ?? scope;

  // On the combined list every platform's state arrives with the figures; on one
  // platform's list the switcher's own check is what we have.
  const states: AdCampaignProviderState[] = forThisScope && campaigns!.providers.length ? campaigns!.providers : platformStates;
  const broken = states.filter((entry) => entry.connection_status === "expired" || entry.connection_status === "error");
  const connectedCount = states.filter((entry) => entry.connection_status === "connected").length;

  // The filters are built from the rows on the page, which is all the API offers
  // here; an account with no campaigns in the range simply isn't listed.
  const accountOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((row) => {
      if (row.account) seen.set(row.account.id, row.account.name || row.account.id);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const statusOptions = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter((value): value is string => !!value))],
    [rows],
  );

  const columns: DataTableColumn<AdCampaign>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.name || row.external_id}</p>
          <p className="text-xs text-muted-foreground">
            {[
              // Which platform a row came from only needs saying when the list
              // holds more than one.
              combined ? row.provider_name : null,
              row.objective ? row.objective.replace(/_/g, " ") : null,
              row.account?.name || row.account?.id,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{statusWord(row.status)}</Badge>,
    },
    {
      key: "budget",
      header: "Budget / day",
      className: "hidden lg:table-cell",
      render: (row) => formatMoneyMinor(row.budget_daily_minor, row.currency),
    },
    { key: "spend", header: "Spend", render: (row) => formatMoneyMinor(row.metrics.spend_minor, row.currency) },
    { key: "impressions", header: "Impressions", className: "hidden md:table-cell", render: (row) => formatCount(row.metrics.impressions) },
    { key: "clicks", header: "Clicks", className: "hidden md:table-cell", render: (row) => formatCount(row.metrics.clicks) },
    { key: "ctr", header: "CTR", className: "hidden lg:table-cell", render: (row) => formatPercent(row.metrics.ctr) },
    { key: "cpc", header: "CPC", className: "hidden xl:table-cell", render: (row) => formatMoneyMinor(row.metrics.cpc_minor, row.currency) },
    {
      key: "leads",
      header: "Leads",
      render: (row) => (
        <span title={row.metrics.leads === null ? "This platform doesn't report a lead count" : undefined}>
          {formatCount(row.metrics.leads)}
        </span>
      ),
    },
  ];

  const connectionsHref = buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManager);
  const singleNeedsReconnect = !combined && (connectionStatus === "expired" || connectionStatus === "error");

  return (
    <div className="space-y-5">
      {platform === "whatsapp" && (
        <Alert role="status">
          <AlertDescription>
            <p>
              Click-to-WhatsApp ads are Meta ads, so these are your Meta campaigns. OrbitOps can&apos;t
              yet tell which of them send people to WhatsApp — that comes with the WhatsApp ads feature.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {singleNeedsReconnect && (
        <Alert variant="destructive" role="status">
          <CircleAlert aria-hidden />
          <AlertTitle>{platformName} needs connecting again</AlertTitle>
          <AlertDescription>
            <p>
              These figures are the last ones OrbitOps could fetch, and no new ones will arrive until
              the platform is connected again.{" "}
              <Link className="underline" href={connectionsHref}>
                Connect again in Ads Manager
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* On the combined list a broken platform is one of several, so it is
          named: the rest of the figures on screen are still current. */}
      {combined && broken.length > 0 && (
        <Alert variant="destructive" role="status">
          <CircleAlert aria-hidden />
          <AlertTitle>
            {broken.map((entry) => entry.provider_name).join(" and ")} {broken.length > 1 ? "need" : "needs"} connecting again
          </AlertTitle>
          <AlertDescription>
            <p>
              Those platforms&apos; figures are the last ones OrbitOps could fetch. The others are up to
              date.{" "}
              <Link className="underline" href={connectionsHref}>
                Connect again in Ads Manager
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!combined && connectionStatus === "not_connected" && (
        <Alert role="status">
          <AlertDescription>
            <p>
              {platformName} isn&apos;t connected yet, so there are no campaigns to show.{" "}
              <Link className="underline" href={connectionsHref}>
                Connect it in Ads Manager
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {combined && connectedCount === 0 && states.length > 0 && (
        <Alert role="status">
          <AlertDescription>
            <p>
              No ad platform is connected yet, so there are no campaigns to show.{" "}
              <Link className="underline" href={connectionsHref}>
                Connect one in Ads Manager
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {!combined && accountOptions.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="ads-account">Ad account</Label>
              <Select value={accountId} onValueChange={(value) => choose({ accountId: value })}>
                <SelectTrigger id="ads-account" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All accounts</SelectItem>
                  {accountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {statusOptions.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="ads-status">Status</Label>
              <Select value={status} onValueChange={(value) => choose({ status: value })}>
                <SelectTrigger id="ads-status" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any status</SelectItem>
                  {statusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusWord(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {search && (
            <p className="pb-2 text-xs text-muted-foreground">
              Showing campaigns matching &ldquo;{search}&rdquo;.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {/* Across platforms this is the stalest one's time, so the line
                never claims figures are fresher than some of them are. */}
            Figures last updated {describeAgo(lastSyncedAt)}
            <span className="block">Updated automatically every hour.</span>
          </p>
          {combined ? (
            states
              .filter((entry) => entry.connection_status !== "not_enabled" && entry.connection_status !== "not_connected" && entry.connection_status !== "not_configured")
              .map((entry) => (
                <AdRefreshButton
                  key={entry.provider}
                  provider={entry.provider}
                  name={entry.provider_name}
                  lastSyncedAt={entry.last_synced_at}
                  canRefresh={canRefresh}
                  onSynced={load}
                />
              ))
          ) : (
            <AdRefreshButton
              provider={scope as AdProvider}
              name={platformName}
              lastSyncedAt={lastSyncedAt}
              canRefresh={canRefresh}
              onSynced={load}
            />
          )}
        </div>
      </div>

      {totals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {totals.map((entry) => (
            <Card key={entry.currency}>
              <CardContent className="space-y-1 pt-6 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {entry.campaigns} campaign{entry.campaigns === 1 ? "" : "s"} · {entry.currency}
                </p>
                <p className="text-xl font-semibold">{formatMoneyMinor(entry.spend_minor, entry.currency)}</p>
                <p className="text-muted-foreground">
                  {formatCount(entry.impressions)} impressions · {formatCount(entry.clicks)} clicks · CTR {formatPercent(entry.ctr)}
                  {entry.leads !== null && ` · ${formatCount(entry.leads)} leads`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {totals.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {combined
            ? "These platforms bill in different currencies, so the figures are kept apart rather than added together."
            : "Your ad accounts bill in different currencies, so the figures are kept apart rather than added together."}
        </p>
      )}

      {campaignsError ? (
        <div className="space-y-3">
          <Alert variant="destructive" role="status">
            <AlertDescription>{campaignsError}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={load}>
            Try again
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pageSize={PAGE_SIZE}
          isLoading={campaignsLoading}
          emptyMessage={
            search
              ? `No campaigns matching "${search}" between ${formatDay(range.from)} and ${formatDay(range.to)}.`
              : connectionStatus === "connected"
                ? `No ${combined ? "" : `${platformName} `}campaigns with results between ${formatDay(range.from)} and ${formatDay(range.to)}.`
                : "No campaigns to show yet."
          }
          manual={{
            total: pagination?.total ?? 0,
            page: pagination?.page ?? page,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
