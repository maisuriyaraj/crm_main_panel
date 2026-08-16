import { Axios } from "@/lib/axios";
import { clearAccessToken, setAccessToken } from "@/lib/axios/tokenStore";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";

export interface AuthUser {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    fullName: string;
    mustResetPassword: boolean;
}

interface AuthState {
    error: string | null;
    isLoading: boolean;
    user: AuthUser | null;
    isAuthChecked: boolean;
}

const initialState: AuthState = {
    error: null,
    isLoading: false,
    user: null,
    isAuthChecked: false,
};

export const reqToLogin = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "auth/reqToLogin",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.login, data);

            if (response.data?.accessToken) {
                setAccessToken(response.data.accessToken);
            }

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
    { rejectValue: { message: string } }
>(
    "auth/reqToFetchMe",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.me);

            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to fetch account",
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

            onSuccess?.(response.data);

            return response.data;
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

            clearAccessToken();
            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            clearAccessToken();
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

            clearAccessToken();
            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            clearAccessToken();
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
            state.isAuthChecked = true;
        },
    },
    extraReducers: (builder) => {
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
        });
        builder.addCase(reqToFetchMe.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.user = action.payload;
            state.isAuthChecked = true;
        });
        builder.addCase(reqToFetchMe.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
            state.user = null;
            state.isAuthChecked = true;
        });

        builder.addCase(reqToResetPassword.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToResetPassword.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
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
