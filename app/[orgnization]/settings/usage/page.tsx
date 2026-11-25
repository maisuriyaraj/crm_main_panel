"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Gauge, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageMeter } from "@/components/usage/usage-meter";
import { HeldLeadsNotice } from "@/components/usage/held-leads-notice";
import { useUsage } from "@/hooks/useUsage";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { formatCount } from "@/lib/usage/mappers";
import { UpgradeRequestDialog } from "@/components/billing/upgrade-request-dialog";

// Every member may see what the plan allows and how much of it is used, so
// nobody is left wondering why something was refused. The API answers for the
// caller's own organization only, and decides the upgrade wording by role.
export default function PlanUsagePage() {
  const { summary, isLoaded, isLoading, error, refresh } = useUsage({ withHeldLeads: true });
  const { formatDateTime } = useDateFormat();
  const params = useParams<{ orgnization: string }>();
  const { can } = useAuth();
  // Invoices from OrbitOps and asking about a plan are the same permission the
  // API checks; without it this page says who to ask instead of hiding it.
  const canSeeBilling = can("billing.view");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Gauge className="size-6 text-primary" aria-hidden /> Plan &amp; usage
          </h1>
          <p className="mt-1 text-muted-foreground">What your plan allows, and how much of it your organization uses.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSeeBilling && <UpgradeRequestDialog planName={summary?.planName ?? null} variant="outline" />}
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCw className="size-4" aria-hidden /> Refresh
          </Button>
        </div>
      </div>

      {error && !isLoaded ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your plan usage</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !summary ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{summary.planName ?? "No plan"}</CardTitle>
              <CardDescription>
                {summary.planName ? "Your current plan." : "Your organization has no plan yet."} {summary.upgradeMessage}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* The invoices themselves need billing.view, which Owner, Admin and
              Accountant hold by default. */}
          {canSeeBilling ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4 text-primary" aria-hidden /> Invoices from OrbitOps
                </CardTitle>
                <CardDescription>
                  Every invoice OrbitOps has issued your organization, with its PDF.{" "}
                  <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.settingsBilling)}>
                    Open billing
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Alert>
              <AlertTitle>Invoices and plan changes</AlertTitle>
              <AlertDescription>
                Invoices from OrbitOps, and asking for a different plan, are open to your workspace&apos;s owner, admins
                and accountant. Ask one of them if you need either.
              </AlertDescription>
            </Alert>
          )}

          <HeldLeadsNotice />

          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>
                Bars turn amber at 80% and red at the limit. At the limit nothing more of that kind can be added; what you
                already have is kept.
                {summary.checkedAt ? ` Counted ${formatDateTime(summary.checkedAt)}.` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {summary.measures.users && <UsageMeter label="Team members" measure={summary.measures.users} />}
              {summary.measures.leads && <UsageMeter label="Leads" measure={summary.measures.leads} />}
              {summary.measures.storage && (
                <UsageMeter label="Storage" measure={summary.measures.storage}>
                  <p className="text-xs text-muted-foreground">
                    {formatCount(summary.measures.storage.files)} file{summary.measures.storage.files === 1 ? "" : "s"} stored
                  </p>
                </UsageMeter>
              )}
              {summary.measures.api && (
                <UsageMeter label="API (busiest minute)" measure={summary.measures.api} unitSuffix="requests a minute">
                  <p className="text-xs text-muted-foreground">
                    The busiest minute of the last {summary.measures.api.peakWindowDays} days, against your per-minute limit.{" "}
                    {formatCount(summary.measures.api.requests30Days)} API requests in the last 30 days;{" "}
                    {formatCount(summary.measures.api.rateLimited30Days)} refused for going over the rate limit.
                  </p>
                </UsageMeter>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
