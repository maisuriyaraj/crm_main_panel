import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function OrgLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={sidebarState !== "false"}>
        <AppSidebar />
        {/* min-w-0 lets this flex item shrink below its content's width, so
            wide children (the Kanban board) scroll themselves instead of
            stretching the page horizontally. */}
        <SidebarInset className="min-w-0">
          <header className="flex h-14 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger />
          </header>

          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
