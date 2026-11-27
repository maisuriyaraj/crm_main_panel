"use client";

import { Suspense } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import type { AdProvider } from "@/lib/store/slices/adIntegrationsSlice";
import { NoAccess } from "@/components/auth/no-access";
import { AdCampaignsView } from "@/components/ads/campaigns-view";

export default function AdCampaignsPage() {
  return (
    <Suspense fallback={null}>
      <AdCampaigns />
    </Suspense>
  );
}

// The Ad Manager's Campaigns tab: what each connected platform's campaigns did
// over the range chosen in the header. Reading the figures needs only
// `ads.view`, so sales, marketing and finance roles can see results without
// being able to change a connection.
//
// The header above (breadcrumb, title, actions, search, platform switcher and
// date range) belongs to the area's layout, so this page is only the table.
function AdCampaigns() {
  const { can } = useAuth();
  const features = useAppSelector((state) => state.features);

  const adsOn = isFeatureOn(features, "ads_enabled");
  const platforms: { provider: AdProvider; name: string }[] = [
    ...(isFeatureOn(features, "ads_meta") ? [{ provider: "meta" as AdProvider, name: "Meta" }] : []),
    ...(isFeatureOn(features, "ads_google") ? [{ provider: "google" as AdProvider, name: "Google" }] : []),
  ];

  if (!can("ads.view")) return <NoAccess title="Ad campaigns" area="Ads Manager" module="ads" />;

  if (!features.isLoaded) return null;

  if (!adsOn || platforms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ad platforms aren&apos;t part of your plan, so there are no campaigns to show. An owner or
        admin can contact OrbitOps to change the plan.
      </p>
    );
  }

  return <AdCampaignsView platforms={platforms} />;
}
