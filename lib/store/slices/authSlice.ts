import { Axios } from "@/lib/axios";
import { clearClientSession, isSessionEnded } from "@/lib/auth/session";
import { createAction, createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";

export interface AuthUser {
    id: number;
    email: string;
    role: string;
    organizationId: number;
    fullName: string;
    mustResetPassword: boolean;
}

interface AuthState {
    error: string | null;
    isLoading: boolean;
    user: AuthUser | null;
    isAuthChecked: boolean;
    needResetPassword: boolean;
    // /me failed for a reason that says nothing about the session (offline,
    // 5xx). The guard offers a retry instead of signing the user out.
    sessionCheckFailed: boolean;
}

const initialState: AuthState = {
    error: null,
    isLoading: false,
    user: null,
    isAuthChecked: false,
    needResetPassword: false,
    sessionCheckFailed: false,
};

// Dispatched by lib/auth/session when the session ends; the root reducer
// resets every slice on it so no previous user's data stays in memory.
export const sessionEnded = createAction("auth/sessionEnded");

export const reqToLogin = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "auth/reqToLogin",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            // Tokens arrive as HttpOnly cookies; nothing to store client-side.
            const response = await Axios.post(apiRoutes.login, data);

            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Login failed",
            });
        }
    }
);

export const reqToFetchMe = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string; needResetPassword?: boolean; sessionCheckFailed?: boolean } }
>(
    "auth/reqToFetchMe",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.me);

            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            onFailure?.(error);

            // Backend flags a first-login temp password this way: /me itself
            // 400s instead of succeeding, with needResetPassword in the body
            // (seen either flat or nested under `data`, so check both).
            const errorBody = error?.response?.data;
            const needResetPassword =
                error?.response?.status === 400 &&
                !!(errorBody?.needResetPassword || errorBody?.data?.needResetPassword);

            // 401/403/404 mean this session or user is gone. Anything else
            // (no response, 5xx, 429) is inconclusive and must not log out.
            const status = error?.response?.status;
            const isDefinitive = isSessionEnded() || status === 401 || status === 403 || status === 404;

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to fetch account",
                needResetPassword,
                sessionCheckFailed: !isDefinitive && !needResetPassword,
            });
        }
    }
);

export const reqToResetPassword = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "auth/reqToResetPassword",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.resetPassword, data);
            // Like login, the backend re-issues both tokens as HttpOnly
            // cookies, which the shared Axios instance resends for us.
            const result = response.data?.data;

            onSuccess?.(result);

            return result;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to reset password",
            });
        }
    }
);

export const reqToLogout = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "auth/reqToLogout",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.logout);

            clearClientSession();
            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            clearClientSession();
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Logout failed",
            });
        }
    }
);

export const reqToLogoutAll = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "auth/reqToLogoutAll",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.logoutAll);

            clearClientSession();
            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            clearClientSession();
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Logout failed",
            });
        }
    }
);

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<AuthUser>) => {
            state.user = action.payload;
        },
        clearAuth: (state) => {
            state.user = null;
            state.needResetPassword = false;
            state.isAuthChecked = true;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(sessionEnded, () => ({ ...initialState, isAuthChecked: true }));

        builder.addCase(reqToLogin.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToLogin.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
        });
        builder.addCase(reqToLogin.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToFetchMe.pending, (state) => {
            state.isLoading = true;
            state.error = null;
            state.sessionCheckFailed = false;
        });
        builder.addCase(reqToFetchMe.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            // The backend wraps this in { message, status, data: {...} },
            // same envelope as reset-password — store the inner user object.
            state.user = action.payload?.data ?? action.payload;
            state.needResetPassword = false;
            state.isAuthChecked = true;
        });
        builder.addCase(reqToFetchMe.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
            state.needResetPassword = !!action.payload?.needResetPassword;
            state.sessionCheckFailed = !!action.payload?.sessionCheckFailed;
            // A temp-password 400 isn't a real logout — keep going with the
            // existing token so the user can reset their password with it.
            if (!state.needResetPassword) {
                state.user = null;
            }
            state.isAuthChecked = true;
        });

        builder.addCase(reqToResetPassword.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToResetPassword.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.needResetPassword = false;
            if (action.payload?.user) {
                state.user = action.payload.user;
            }
        });
        builder.addCase(reqToResetPassword.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToLogout.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToLogout.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
            state.user = null;
        });
        builder.addCase(reqToLogout.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
            state.user = null;
        });

        builder.addCase(reqToLogoutAll.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToLogoutAll.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
            state.user = null;
        });
        builder.addCase(reqToLogoutAll.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
            state.user = null;
        });
    }
});

export const { setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
