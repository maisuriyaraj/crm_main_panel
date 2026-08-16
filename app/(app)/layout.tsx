"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Users } from "lucide-react";

import { pageRoutes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToFetchMe } from "@/lib/store/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navItems = [
  { href: pageRoutes.dashboard, label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: pageRoutes.settingsTeam, label: "Team", icon: Users, adminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isAuthChecked, logout } = useAuth();

  useEffect(() => {
    if (!isAuthChecked) {
      dispatch(reqToFetchMe({ data: null }));
    }
  }, [dispatch, isAuthChecked]);

  useEffect(() => {
    if (!isAuthChecked) return;

    if (!user) {
      router.replace(pageRoutes.signin);
      return;
    }

    if (user.mustResetPassword && pathname !== pageRoutes.resetPassword) {
      router.replace(pageRoutes.resetPassword);
    }
  }, [isAuthChecked, user, pathname, router]);

  if (!isAuthChecked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (user.mustResetPassword) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-1 text-lg font-bold text-gradient">OrbitOps</div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {navItems
              .filter((item) => !item.adminOnly || role === "org_admin")
              .map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <div className="px-2 text-sm text-muted-foreground">{user.fullName}</div>
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => logout()}>
            <LogOut />
            Log out
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
        </header>

        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
