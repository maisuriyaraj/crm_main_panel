"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Shown instead of a module page when /me lacks its `.view` key. Hiding the
// nav entry doesn't stop someone opening the URL; this explains instead of
// showing an empty screen, and the page fires no data request.
export function NoAccess({ title, area }: { title: string; area: string }) {
  const params = useParams<{ orgnization: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Alert>
        <AlertTitle>You don&apos;t have access to {area}</AlertTitle>
        <AlertDescription>
          Ask an owner or admin if you need it.{" "}
          <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.dashboard)}>
            Go to dashboard
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
}
