import { useAppSelector } from "@/lib/store/hooks";
import { endSession } from "@/lib/auth/session";

export function useAuth() {
    const { user, isLoading, isAuthChecked, needResetPassword } = useAppSelector((state) => state.auth);

    // Same cleanup as an expired session (backend clears the cookies, client
    // storage and Redux are wiped), but no expiry notice: straight to "/".
    const logout = () => endSession("logout");

    // Gate UI on permissions from /me rather than role-name strings, so every
    // admin-tier role (Owner included) is treated the way the API treats it.
    const permissions = user?.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);

    return {
        user,
        role: user?.role ?? null,
        isAdmin: user?.isAdmin === true,
        can,
        isAuthenticated: !!user,
        isAuthChecked,
        isLoading,
        needResetPassword,
        logout,
    };
}
