import { NextRequest, NextResponse } from "next/server";
import { pageRoutes } from "@/lib/constants";

const publicRoutes = [
    pageRoutes.home,
    pageRoutes.signin,
    pageRoutes.signup,
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

    // Every /{organizationId}/* screen is a protected app route by default,
    // so a newly added module page can't ship without route-level protection.
    // Non-org paths ("/", "/auth/*") are handled by isPublicRoute instead.
    if (segments.length < 1 || segments[0] === "auth") {
        return false;
    }

    return true;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const accessToken = request.cookies.get("token")?.value;
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
        // Runs on every route except Next's own static/internal assets and
        // metadata files — without this exclusion, a pattern broad enough to
        // cover every /{organizationId}/* screen also matches paths like
        // /_next/static/css/*.css (its first segment looks like an org id),
        // which then get redirected instead of served.
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};