import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToLogout } from "@/lib/store/slices/authSlice";

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, isLoading, isAuthChecked } = useAppSelector((state) => state.auth);

    const logout = (onDone?: () => void) => {
        dispatch(
            reqToLogout({
                data: null,
                onSuccess: () => onDone?.(),
                onFailure: () => onDone?.(),
            }),
        );
    };

    return {
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isAuthChecked,
        isLoading,
        logout,
    };
}
