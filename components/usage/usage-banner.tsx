"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUsage } from "@/hooks/useUsage";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { measuresNeedingAttention } from "@/lib/usage/mappers";

const REFRESH_MS = 5 * 60 * 1000;

const listOf = (labels: string[]) =>
  labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

// Across the workspace, for admins only (the API says who is one): any measure
// at 80% or at its limit, with a link to Plan & usage. Usage is re-read every few
// minutes, so the banner clears once room is made.
export function UsageBanner() {
  const params = useParams<{ orgnization: string }>();
  const pathname = usePathname();
  const { summary, refresh } = useUsage();

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const usageHref = buildOrgRoute(params?.orgnization ?? "", pageRoutes.settingsUsage);
  if (!summary?.isAdmin || pathname === usageHref) return null;

  const attention = measuresNeedingAttention(summary);
  if (!attention.length) return null;

  const full = attention.filter((item) => item.state === "full").map((item) => item.label);
  const warning = attention.filter((item) => item.state === "warning").map((item) => item.label);
  const parts = [
    full.length ? `You've reached your plan's limit for ${listOf(full)}.` : null,
    warning.length ? `You've used 80% or more of your plan's ${listOf(warning)}.` : null,
  ].filter(Boolean);

  return (
    <div className="px-6 pt-4">
      <Alert variant={full.length ? "destructive" : "warning"}>
        <AlertTriangle className="size-4" aria-hidden />
        <AlertDescription>
          {parts.join(" ")} {summary.upgradeMessage}{" "}
          <Link className="font-medium underline" href={usageHref}>
            See Plan &amp; usage
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
}
