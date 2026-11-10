"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Shown instead of a module page when /me lacks its `.view` key. Hiding the
// nav entry doesn't stop someone opening the URL; this explains instead of
// showing an empty screen, and the page fires no data request.
// `module` is the catalog module: when it is off for the whole organization,
// the plan or the subscription is the reason, not the member's role.
export function NoAccess({ title, area, module }: { title: string; area: string; module?: string }) {
  const params = useParams<{ orgnization: string }>();
  const { moduleOff } = useAuth();
  const off = module ? moduleOff(module) : null;
  const dashboard = (
    <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.dashboard)}>
      Go to dashboard
    </Link>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {off ? (
        <Alert>
          <AlertTitle>
            {off.reason === "subscription_inactive"
              ? "Your subscription has ended"
              : "This module isn't available on your plan"}
          </AlertTitle>
          <AlertDescription>
            {off.reason === "subscription_inactive"
              ? `${area} is closed until the subscription is renewed. Your data is kept.`
              : `${area} isn't part of your organization's plan, so nobody in your workspace can open it. An owner or admin can contact OrbitOps to change the plan.`}{" "}
            {dashboard}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>You don&apos;t have access to {area}</AlertTitle>
          <AlertDescription>
            Ask an owner or admin if you need it. {dashboard}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
