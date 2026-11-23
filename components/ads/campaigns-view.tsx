"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import {
  RANGE_LABELS,
  describeAgo,
  formatCount,
  formatDay,
  formatMoneyMinor,
  formatPercent,
  rangeForPreset,
  type AdDateRange,
  type AdRangePreset,
} from "@/lib/ads/format";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToGetAdCampaigns,
  type AdCampaign,
  type AdCampaignTotals,
  type AdProvider,
} from "@/lib/store/slices/adIntegrationsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Campaigns and their figures for one platform. Everything here comes from what
// the hourly sync already stored, so no ad platform is called to draw the page.
export function AdCampaignsView({
  platforms,
  initialProvider,
}: {
  platforms: { provider: AdProvider; name: string }[];
  initialProvider?: AdProvider;
}) {
  const dispatch = useAppDispatch();
  const params = useParams<{ orgnization: string }>();
  const { canAll } = useAuth();
  const canRefresh = canAll(["ads.manage", "organization.settings.manage"]);
  const { campaigns, campaignsLoading, campaignsError } = useAppSelector((state) => state.adIntegrations);

  const [provider, setProvider] = useState<AdProvider>(initialProvider ?? platforms[0]?.provider ?? "meta");
  const [preset, setPreset] = useState<AdRangePreset>("30d");
  const [range, setRange] = useState<AdDateRange>(() => rangeForPreset("30d"));
  const [accountId, setAccountId] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  // One request builder for both the automatic load and Try again / after a
  // refresh, so the three can never ask for different things.
  const load = useCallback(() => {
    dispatch(
      reqToGetAdCampaigns({
        data: {
          provider,
          from: range.from,
          to: range.to,
          accountId: accountId === ALL ? undefined : accountId,
          status: status === ALL ? undefined : status,
          page,
          limit: PAGE_SIZE,
        },
      }),
    );
  }, [dispatch, provider, range.from, range.to, accountId, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Only ever the platform on screen: the store holds one page at a time, so a
  // page belonging to the other tab is ignored rather than shown under it. Held
  // in a memo because the filter options below are worked out from it.
  const rows: AdCampaign[] = useMemo(
    () => (campaigns?.provider === provider ? campaigns.campaigns : []),
    [campaigns, provider],
  );
  const totals: AdCampaignTotals[] = campaigns?.provider === provider ? campaigns.totals : [];
  const pagination = campaigns?.provider === provider ? campaigns.pagination : null;
  const connectionStatus = campaigns?.provider === provider ? campaigns.connection_status : null;
  const lastSyncedAt = campaigns?.provider === provider ? campaigns.last_synced_at : null;
  const platformName = platforms.find((entry) => entry.provider === provider)?.name ?? provider;

  // The filters are built from the rows on the page, which is all the API offers
  // here; an account with no campaigns in the range simply isn't listed.
  const accountOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((row) => {
      if (row.account) seen.set(row.account.id, row.account.name || row.account.id);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const statusOptions = useMemo(() => [...new Set(rows.map((row) => row.status).filter((value): value is string => !!value))], [rows]);

  const changePreset = (next: AdRangePreset) => {
    setPreset(next);
    setPage(1);
    if (next !== "custom") setRange(rangeForPreset(next));
  };

  const changeRange = (key: "from" | "to", value: string) => {
    setPreset("custom");
    setPage(1);
    setRange((current) => ({ ...current, [key]: value }));
  };

  const columns: DataTableColumn<AdCampaign>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.name || row.external_id}</p>
          <p className="text-xs text-muted-foreground">
            {[row.objective ? row.objective.replace(/_/g, " ") : null, row.account?.name || row.account?.id].filter(Boolean).join(" · ")}
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

  const needsReconnect = connectionStatus === "expired" || connectionStatus === "error";

  return (
    <div className="space-y-5">
      {platforms.length > 1 && (
        <Tabs value={provider} onValueChange={(value) => { setProvider(value as AdProvider); setPage(1); setAccountId(ALL); setStatus(ALL); }}>
          <TabsList>
            {platforms.map((entry) => (
              <TabsTrigger key={entry.provider} value={entry.provider}>{entry.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {needsReconnect && (
        <Alert variant="destructive" role="status">
          <CircleAlert aria-hidden />
          <AlertTitle>{platformName} needs connecting again</AlertTitle>
          <AlertDescription>
            <p>
              These figures are the last ones OrbitOps could fetch, and no new ones will arrive until
              the platform is connected again.{" "}
              <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManager)}>
                Connect again in Ads Manager
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus === "not_connected" && (
        <Alert role="status">
          <AlertDescription>
            <p>
              {platformName} isn&apos;t connected yet, so there are no campaigns to show.{" "}
              <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManager)}>
                Connect it in Ads Manager
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="ads-range">Date range</Label>
            <Select value={preset} onValueChange={(value) => changePreset(value as AdRangePreset)}>
              <SelectTrigger id="ads-range" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABELS) as AdRangePreset[]).map((key) => (
                  <SelectItem key={key} value={key}>{RANGE_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ads-from">From</Label>
            <Input id="ads-from" type="date" className="w-40" value={range.from} max={range.to} onChange={(event) => changeRange("from", event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ads-to">To</Label>
            <Input id="ads-to" type="date" className="w-40" value={range.to} min={range.from} onChange={(event) => changeRange("to", event.target.value)} />
          </div>
          {accountOptions.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="ads-account">Ad account</Label>
              <Select value={accountId} onValueChange={(value) => { setAccountId(value); setPage(1); }}>
                <SelectTrigger id="ads-account" className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All accounts</SelectItem>
                  {accountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {statusOptions.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="ads-status">Status</Label>
              <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                <SelectTrigger id="ads-status" className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any status</SelectItem>
                  {statusOptions.map((value) => (
                    <SelectItem key={value} value={value}>{statusWord(value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Figures last updated {describeAgo(lastSyncedAt)}
            <span className="block">Updated automatically every hour.</span>
          </p>
          <AdRefreshButton
            provider={provider}
            name={platformName}
            lastSyncedAt={lastSyncedAt}
            canRefresh={canRefresh}
            onSynced={load}
          />
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
          Your ad accounts bill in different currencies, so the figures are kept apart rather than added together.
        </p>
      )}

      {campaignsError ? (
        <div className="space-y-3">
          <Alert variant="destructive" role="status">
            <AlertDescription>{campaignsError}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          pageSize={PAGE_SIZE}
          isLoading={campaignsLoading}
          emptyMessage={
            connectionStatus === "connected"
              ? `No ${platformName} campaigns with results between ${formatDay(range.from)} and ${formatDay(range.to)}.`
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
