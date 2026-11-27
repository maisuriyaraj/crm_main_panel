"use client";

import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import { tabByKey, type AdManagerTabKey } from "@/lib/ads/manager-tabs";
import { NoAccess } from "@/components/auth/no-access";
import { AdComingSoonPanel } from "@/components/ads/coming-soon";

// The body of an Ad Manager tab whose feature hasn't been built. It answers the
// same three questions in the same order as the two tabs that do have data, so
// a member is never told a feature is "coming soon" when the real reason they
// cannot use it is their role or their organization's plan.
export function AdTabPlaceholder({ tab }: { tab: AdManagerTabKey }) {
  const { can } = useAuth();
  const features = useAppSelector((state) => state.features);
  const entry = tabByKey(tab);
  const label = entry?.label ?? "Ad Manager";

  if (!can("ads.view")) return <NoAccess title={label} area="Ads Manager" module="ads" />;

  if (!features.isLoaded) return null;

  if (!isFeatureOn(features, "ads_enabled")) {
    return (
      <p className="text-sm text-muted-foreground">
        Ad platforms aren&apos;t part of your plan, so there is nothing to show here. An owner or
        admin can contact OrbitOps to change the plan.
      </p>
    );
  }

  return <AdComingSoonPanel title={label} blurb={entry?.blurb} />;
}
