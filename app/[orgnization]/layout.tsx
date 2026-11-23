import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { ImpersonationFrame } from "@/components/layout/impersonation-frame";
import { WorkspaceGate } from "@/components/layout/workspace-gate";
import { TopBar } from "@/components/layout/top-bar";
import { UsageBanner } from "@/components/usage/usage-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Signed-in workspace pages are private, so keep them out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;

  return (
    <AuthGuard>
      {/* Above the shell, so a support session is unmistakable on every page
          and at every width; the frame tints the edges to match. */}
      <ImpersonationBanner />
      <ImpersonationFrame>
        <SidebarProvider defaultOpen={sidebarState !== "false"}>
          <AppSidebar />
          {/* min-w-0 lets this flex item shrink below its content's width, so
              wide children (the Kanban board) scroll themselves instead of
              stretching the page horizontally. */}
          <SidebarInset className="min-w-0">
            <TopBar />

            <UsageBanner />

            {/* A narrow phone can't spare 24px of gutter on each side, so the
                padding only opens up once there is room for it. */}
            <div className="min-w-0 flex-1 p-4 sm:p-6">
              <WorkspaceGate>{children}</WorkspaceGate>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ImpersonationFrame>
    </AuthGuard>
  );
}
