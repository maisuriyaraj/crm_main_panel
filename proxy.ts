import { NextRequest, NextResponse } from "next/server";
import { pageRoutes } from "@/lib/constants";

const protectedRoutes = [pageRoutes.dashboard, pageRoutes.settingsTeam];
const authRoutes = [pageRoutes.signin];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasAccessToken = request.cookies.has("accessToken");

    const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    const isAuthRoute = authRoutes.some((route) => pathname === route);

    if (isProtectedRoute && !hasAccessToken) {
        return NextResponse.redirect(new URL(pageRoutes.signin, request.url));
    }

    if (isAuthRoute && hasAccessToken) {
        return NextResponse.redirect(new URL(pageRoutes.dashboard, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
