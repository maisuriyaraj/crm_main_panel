"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { BarChart3, Megaphone } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import type { AdProvider } from "@/lib/store/slices/adIntegrationsSlice";
import { Button } from "@/components/ui/button";
import { NoAccess } from "@/components/auth/no-access";
import { AdCampaignsView } from "@/components/ads/campaigns-view";

export default function AdCampaignsPage() {
  return (
    <Suspense fallback={null}>
      <AdCampaigns />
    </Suspense>
  );
}

// What each connected platform's campaigns did over a date range. Reading the
// figures needs only `ads.view`, so sales, marketing and finance roles can see
// results without being able to change a connection.
function AdCampaigns() {
  const { can } = useAuth();
  const params = useParams<{ orgnization: string }>();
  const search = useSearchParams();
  const features = useAppSelector((state) => state.features);

  const adsOn = isFeatureOn(features, "ads_enabled");
  const platforms: { provider: AdProvider; name: string }[] = [
    ...(isFeatureOn(features, "ads_meta") ? [{ provider: "meta" as AdProvider, name: "Meta" }] : []),
    ...(isFeatureOn(features, "ads_google") ? [{ provider: "google" as AdProvider, name: "Google" }] : []),
  ];
  const asked = search.get("provider");
  const initial = platforms.find((entry) => entry.provider === asked)?.provider;

  if (!can("ads.view")) return <NoAccess title="Ad campaigns" area="Ads Manager" module="ads" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="size-6 text-primary" aria-hidden /> Ad campaigns
          </h1>
          <p className="mt-1 text-muted-foreground">
            What your campaigns spent and brought in, pulled from each ad platform.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManager)}>
            <Megaphone aria-hidden /> Platforms
          </Link>
        </Button>
      </div>

      {!features.isLoaded ? null : !adsOn || platforms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ad platforms aren&apos;t part of your plan, so there are no campaigns to show. An owner or
          admin can contact OrbitOps to change the plan.
        </p>
      ) : (
        <AdCampaignsView platforms={platforms} initialProvider={initial} />
      )}
    </div>
  );
}
