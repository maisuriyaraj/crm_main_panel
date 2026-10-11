import { useAppSelector } from "@/lib/store/hooks";
import { endSession } from "@/lib/auth/session";

export function useAuth() {
    const { user, isLoading, isAuthChecked, needResetPassword } = useAppSelector((state) => state.auth);

    // Same cleanup as an expired session (backend clears the cookies, client
    // storage and Redux are wiped), but no expiry notice: straight to "/".
    const logout = () => endSession("logout");

    return {
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isAuthChecked,
        isLoading,
        needResetPassword,
        logout,
    };
}
