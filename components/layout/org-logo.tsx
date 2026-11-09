"use client";

import { useState, type ReactNode } from "react";

import { Axios } from "@/lib/axios";
import { apiRoutes, apiUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

// The organization's logo, through the API's logo route. That route answers with a
// redirect to a fresh link that lasts a few minutes, so no link is ever stored here.
// The image request carries the session cookie; if it fails once (an access token
// that just expired), one signed-in call refreshes the session and the image is
// tried again. Anything else shows the fallback (no logo yet, offline, ...).
type OrgLogoProps = {
  // Changes when the logo changes, so the browser asks again.
  version?: string | number | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
};

// Keyed by the version, so a new logo starts with a fresh try.
export function OrgLogo(props: OrgLogoProps) {
  return <LogoImage key={String(props.version ?? "")} {...props} />;
}

function LogoImage({ version, alt, className, fallback }: OrgLogoProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  const query = new URLSearchParams();
  if (version) query.set("v", String(version));
  if (attempt) query.set("r", String(attempt));
  const src = `${apiUrl(apiRoutes.organizationLogo)}${query.size ? `?${query}` : ""}`;

  const onError = async () => {
    if (attempt > 0) {
      setFailed(true);
      return;
    }
    try {
      // Any signed-in request does: the shared client refreshes an expired session.
      await Axios.get(apiRoutes.mfaStatus);
      setAttempt(1);
    } catch {
      setFailed(true);
    }
  };

  return (
    // A redirect to a short-lived private link; next/image would try to optimise
    // (and cache) it on the server, which has no session.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("object-contain", className)} onError={() => void onError()} />
  );
}
