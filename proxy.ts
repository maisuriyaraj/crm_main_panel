import { NextRequest, NextResponse } from "next/server";
import { pageRoutes } from "@/lib/constants";

const publicRoutes = [
    pageRoutes.home,
    pageRoutes.signin,
    pageRoutes.signup,
];

const protectedRoutes = [
    pageRoutes.dashboard,
    pageRoutes.settingsTeam,
];

function isPublicRoute(pathname: string) {
    return publicRoutes.some(
        (route) =>
            pathname === route ||
            pathname.startsWith(`${route}/`),
    );
}

function getOrganizationId(request: NextRequest) {
    const userCookie = request.cookies.get("user")?.value;

    if (!userCookie) {
        return null;
    }

    try {
        const user = JSON.parse(userCookie);

        return user?.organizationId ?? null;
    } catch {
        return null;
    }
}

function isProtectedRoute(pathname: string) {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length < 2) {
        return false;
    }

    const routeAfterOrg = `/${segments.slice(1).join("/")}`;

    return protectedRoutes.some(
        (route) =>
            routeAfterOrg === route ||
            routeAfterOrg.startsWith(`${route}/`),
    );
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const accessToken = request.cookies.get("accessToken")?.value;
    const isAuthenticated = Boolean(accessToken);

    // Authenticated user should not access auth/public pages
    if (isAuthenticated && isPublicRoute(pathname)) {
        const organizationId = getOrganizationId(request);

        if (organizationId) {
            const dashboardUrl = new URL(
                `/${organizationId}${pageRoutes.dashboard}`,
                request.url,
            );

            // Avoid redirecting to the same URL
            if (dashboardUrl.pathname !== pathname) {
                return NextResponse.redirect(dashboardUrl);
            }
        }

        return NextResponse.next();
    }

    // Unauthenticated user can access public pages
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // Protected organization route
    if (isProtectedRoute(pathname) && !isAuthenticated) {
        const signinUrl = new URL(
            pageRoutes.signin,
            request.url,
        );

        signinUrl.searchParams.set("redirect", pathname);

        return NextResponse.redirect(signinUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/auth/:path*",
        "/:organization_id/dashboard/:path*",
        "/:organization_id/settings/:path*",
    ],
};