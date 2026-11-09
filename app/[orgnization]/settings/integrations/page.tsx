"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plug } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NoAccess } from "@/components/auth/no-access";
import { AdIntegrationsPanel, callbackMessage } from "@/components/integrations/ad-integrations-panel";

export default function IntegrationsSettingsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsSettings />
    </Suspense>
  );
}

// Connecting Meta and Google ad accounts, for Owners and Admins, and only when the plan
// includes Ads. The API checks both again on every request.
function IntegrationsSettings() {
  const { can } = useAuth();
  const search = useSearchParams();
  const features = useAppSelector((state) => state.features);
  const adsOn = isFeatureOn(features, "ads_enabled") && (isFeatureOn(features, "ads_meta") || isFeatureOn(features, "ads_google"));
  const result = callbackMessage(search);

  if (!can("organization.settings.manage")) return <NoAccess title="Integrations" area="integrations" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Plug className="size-6 text-primary" aria-hidden /> Integrations</h1>
        <p className="mt-1 text-muted-foreground">Connect your ad platforms so OrbitOps can work with your ad accounts.</p>
      </div>
      {result && (
        <Alert variant={result.ok ? "default" : "destructive"} role="status">
          <AlertDescription>{result.text}</AlertDescription>
        </Alert>
      )}
      {!features.isLoaded ? null : adsOn ? (
        <AdIntegrationsPanel returnTo="settings" />
      ) : (
        <p className="text-sm text-muted-foreground">Ad platforms aren&apos;t part of your plan, so there is nothing to connect.</p>
      )}
    </div>
  );
}
