import { Suspense, type ReactNode } from "react";

import { AdManagerShell } from "@/components/ads/manager-shell";

// Every Ad Manager tab sits under one header, so the breadcrumb, title, actions,
// campaign search, platform switcher, date range and tab strip are built once
// here instead of in each tab's page.
//
// The shell reads the URL, so it needs the Suspense boundary that
// `useSearchParams` asks for; each tab's page keeps its own as before.
export default function AdsManagerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Suspense fallback={null}>
        <AdManagerShell />
      </Suspense>
      {children}
    </div>
  );
}
