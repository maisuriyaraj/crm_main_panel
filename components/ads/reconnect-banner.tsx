"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { providersNeedingReconnect, type AdProviderState } from "@/lib/store/slices/adIntegrationsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Shown wherever an ad platform has stopped working: its token ended, the person
// removed OrbitOps' access at the platform, or a sync was refused. Only the
// workspace can fix it, by connecting again, so the notice always says where.
//
// `linkBack` is for pages other than the connections page itself.
export function AdReconnectBanner({
  providers,
  linkBack = false,
}: {
  providers: AdProviderState[];
  linkBack?: boolean;
}) {
  const params = useParams<{ orgnization: string }>();
  const broken = providersNeedingReconnect(providers);
  if (!broken.length) return null;

  const names = broken.map((entry) => entry.name).join(" and ");
  // Our own words for why, never the platform's error text.
  const reason = broken
    .map((entry) =>
      entry.status === "expired"
        ? `${entry.name}: the connection has ended.`
        : `${entry.name}: ${entry.connection?.last_error || "the connection stopped working."}`,
    )
    .join(" ");

  return (
    <Alert variant="destructive" role="status">
      <CircleAlert aria-hidden />
      <AlertTitle>{names} {broken.length > 1 ? "need" : "needs"} connecting again</AlertTitle>
      <AlertDescription>
        <p>
          {reason} Until then no new figures arrive and campaigns can&apos;t be changed.{" "}
          {linkBack ? (
            <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManager)}>
              Connect again in Ads Manager
            </Link>
          ) : (
            "An owner or admin can connect again below."
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
}
