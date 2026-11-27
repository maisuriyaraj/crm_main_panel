"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NoAccess } from "@/components/auth/no-access";
import { AdIntegrationsPanel, callbackMessage } from "@/components/integrations/ad-integrations-panel";
import { AdReconnectBanner } from "@/components/ads/reconnect-banner";
import { WhatsAppCard } from "@/components/ads/whatsapp-card";

export default function AdsManagerPage() {
  return (
    <Suspense fallback={null}>
      <AdsManagerOverview />
    </Suspense>
  );
}

// The Connections tab: which ad platforms are connected, which need connecting
// again, and what the hourly sync last managed to fetch. It is where the
// platform switcher's "Connect" links and every "connect again" notice point.
//
// Reading a connection needs `ads.view` and `organization.settings.manage`,
// which is what the API checks, so a member with only `ads.view` is told where
// the figures are instead of being shown an empty screen and a failed request.
function AdsManagerOverview() {
  const { can, canAll } = useAuth();
  const params = useParams<{ orgnization: string }>();
  const search = useSearchParams();
  const features = useAppSelector((state) => state.features);
  const { providers } = useAppSelector((state) => state.adIntegrations);

  const adsOn = isFeatureOn(features, "ads_enabled");
  const anyPlatform = isFeatureOn(features, "ads_meta") || isFeatureOn(features, "ads_google");
  const whatsappOn = isFeatureOn(features, "ads_whatsapp");
  const canSeeConnections = canAll(["ads.view", "organization.settings.manage"]);
  const result = callbackMessage(search);
  const campaignsHref = buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManagerCampaigns);

  if (!can("ads.view")) return <NoAccess title="Ads Manager" area="Ads Manager" module="ads" />;

  return (
    <div className="space-y-6">
      {result && (
        <Alert variant={result.ok ? "default" : "destructive"} role="status">
          <AlertDescription>{result.text}</AlertDescription>
        </Alert>
      )}

      {canSeeConnections && <AdReconnectBanner providers={providers} />}

      {!features.isLoaded ? null : !adsOn || !anyPlatform ? (
        <p className="text-sm text-muted-foreground">
          Ad platforms aren&apos;t part of your plan, so there is nothing to connect. An owner or admin
          can contact OrbitOps to change the plan.
        </p>
      ) : !canSeeConnections ? (
        <Alert role="status">
          <AlertDescription>
            Ad platform connections are managed by owners and admins. You can still see your campaigns
            and their results.{" "}
            <Link className="underline" href={campaignsHref}>
              Go to campaigns
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Platforms</h2>
            <AdIntegrationsPanel returnTo="settings" showSync />
          </section>
          {whatsappOn && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">WhatsApp</h2>
              <WhatsAppCard meta={providers.find((entry) => entry.provider === "meta")} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
