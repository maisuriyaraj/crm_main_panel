"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { CircleAlert, Rocket } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { setSubscriptionInactiveListener } from "@/lib/axios";
import { isSetupDeferred, subscribeToSetupDeferral, workspacePath } from "@/lib/onboarding";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { isSubscriptionInactive, reqToGetFeatures, subscriptionInactive } from "@/lib/store/slices/featuresSlice";
import { reqToGetOrgSettings } from "@/lib/store/slices/orgSettingsSlice";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// What still works after a subscription ends, as the API allows: team, settings
// and the setup wizard. Every other module answers 403 SUBSCRIPTION_INACTIVE.
// "/settings" covers Billing, which is the point: the invoices that have to be
// settled to get the modules back must stay readable while everything else is shut.
const OPEN_WHEN_INACTIVE = ["/settings", pageRoutes.setup];

const isUnder = (path: string, roots: string[]) => roots.some((root) => path === root || path.startsWith(`${root}/`));

// Runs inside the signed-in shell, after the auth guard (so after the forced
// password reset and any MFA set-up):
// - an organization whose subscription has ended sees one clear screen instead of
//   modules that fail, while team and settings stay usable;
// - an Owner or Admin whose organization has not finished setup is taken to the
//   wizard once; after "Set up later" a small banner offers it again.
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ orgnization: string }>();
  const { user, can } = useAuth();
  const features = useAppSelector((state) => state.features);
  const orgSettings = useAppSelector((state) => state.orgSettings);
  const inactive = isSubscriptionInactive(features);
  const orgSlug = params?.orgnization ?? "";
  const path = workspacePath(pathname);
  const onSetup = isUnder(path, [pageRoutes.setup]);
  const canManageSettings = can("organization.settings.manage");
  const setupDue = !!user?.onboardingPending && canManageSettings;
  const deferred = useSyncExternalStore(subscribeToSetupDeferral, isSetupDeferred, () => false);

  useEffect(() => {
    if (!features.isLoaded && !features.isLoading) dispatch(reqToGetFeatures({}));
  }, [dispatch, features.isLoaded, features.isLoading]);

  // The organization's date format and currency decide how every screen reads a
  // date, so they are loaded once for the whole shell rather than per page. Only
  // members who may manage settings can read them; everyone else keeps the
  // default order until the API carries it on /auth/me for all.
  useEffect(() => {
    if (canManageSettings && !orgSettings.isLoaded && !orgSettings.isLoading && !orgSettings.error) {
      dispatch(reqToGetOrgSettings({ data: null }));
    }
  }, [dispatch, canManageSettings, orgSettings.isLoaded, orgSettings.isLoading, orgSettings.error]);

  useEffect(() => {
    setSubscriptionInactiveListener((status) => dispatch(subscriptionInactive(status)));
    return () => setSubscriptionInactiveListener(null);
  }, [dispatch]);

  useEffect(() => {
    if (setupDue && !deferred && !onSetup) router.replace(buildOrgRoute(orgSlug, pageRoutes.setup));
  }, [setupDue, deferred, onSetup, orgSlug, router]);

  if (setupDue && !deferred && !onSetup) return null;

  if (inactive && !isUnder(path, OPEN_WHEN_INACTIVE)) {
    return <SubscriptionEnded status={features.subscription?.status ?? null} orgSlug={orgSlug} canTeam={can("team.view")} canSetup={can("organization.settings.manage")} />;
  }

  return (
    <>
      {setupDue && deferred && !onSetup && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><Rocket className="size-4 text-primary" aria-hidden /> Your workspace setup isn&apos;t finished.</span>
          <Button asChild size="sm" variant="outline">
            <Link href={buildOrgRoute(orgSlug, pageRoutes.setup)}>Finish setup</Link>
          </Button>
        </div>
      )}
      {children}
    </>
  );
}

function SubscriptionEnded({ status, orgSlug, canTeam, canSetup }: { status: string | null; orgSlug: string; canTeam: boolean; canSetup: boolean }) {
  const cancelled = status === "cancelled";
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <Alert variant="destructive">
        <CircleAlert aria-hidden />
        <AlertTitle className="text-lg">Your subscription has ended</AlertTitle>
        <AlertDescription>
          {cancelled
            ? "Your organization's OrbitOps subscription was cancelled, so Leads, Contacts and the other modules are closed."
            : "Your organization's OrbitOps subscription has expired, so Leads, Contacts and the other modules are closed."}{" "}
          Your data is kept.
        </AlertDescription>
      </Alert>
      <div className="space-y-3 text-sm">
        {canTeam || canSetup ? (
          <p>To renew, contact OrbitOps. Meanwhile you can still manage your team and settings.</p>
        ) : (
          <p>Ask your workspace owner or admin to renew the subscription. You can still manage your own security settings.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {canTeam && (
            <Button asChild><Link href={buildOrgRoute(orgSlug, pageRoutes.settingsTeam)}>Team settings</Link></Button>
          )}
          {canSetup && (
            <Button asChild variant="outline"><Link href={buildOrgRoute(orgSlug, pageRoutes.settingsCompany)}>Company settings</Link></Button>
          )}
          <Button asChild variant="outline"><Link href={buildOrgRoute(orgSlug, pageRoutes.settingsSecurity)}>Security settings</Link></Button>
        </div>
      </div>
    </div>
  );
}
