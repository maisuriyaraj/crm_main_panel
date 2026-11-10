import { useAppSelector } from "@/lib/store/hooks";
import { endSession } from "@/lib/auth/session";

export function useAuth() {
    const { user, isLoading, isAuthChecked, needResetPassword } = useAppSelector((state) => state.auth);

    // Same cleanup as an expired session (backend clears the cookies, client
    // storage and Redux are wiped), but no expiry notice: straight to "/".
    const logout = () => endSession("logout");

    // Gate UI on permissions from /me, never on role names or isAdmin: custom
    // roles carry any mix of keys, and the API checks the same keys.
    const permissions = user?.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const canAll = (keys: string[]) => keys.every(can);
    // Why a whole module is unavailable to everyone, or null when it is on.
    const moduleOff = (module: string) => user?.disabledModules?.find((entry) => entry.module === module) ?? null;

    return {
        user,
        // Display only (e.g. "signed in as"). Never branch on it.
        role: user?.role ?? null,
        can,
        canAll,
        moduleOff,
        isAuthenticated: !!user,
        isAuthChecked,
        isLoading,
        needResetPassword,
        logout,
    };
}
