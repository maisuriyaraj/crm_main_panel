import { NextRequest, NextResponse } from "next/server";
import { pageRoutes } from "@/lib/constants";

const protectedRoutes = [pageRoutes.dashboard, pageRoutes.settingsTeam];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasAccessToken = request.cookies.has("accessToken");

    // Protected screens now live under a dynamic org segment
    // ("/acme-inc/dashboard" instead of "/dashboard"), so drop that first
    // segment before matching against the known protected paths.
    const segments = pathname.split("/").filter(Boolean);
    const routeAfterOrg = segments.length > 1 ? `/${segments.slice(1).join("/")}` : "";

    const isProtectedRoute = protectedRoutes.some(
        (route) => routeAfterOrg === route || routeAfterOrg.startsWith(`${route}/`),
    );

    if (isProtectedRoute && !hasAccessToken) {
        return NextResponse.redirect(new URL(pageRoutes.signin, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
