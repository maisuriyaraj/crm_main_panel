import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";

// Password and device management for the signed-in user, plus the public
// forgot/reset-by-email calls.

export interface AuthSessionInfo {
    id: string;
    device: string;
    ip: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    current: boolean;
}

interface AccountSecurityState {
    error: string | null;
    isLoading: boolean;
    sessions: AuthSessionInfo[];
    sessionsLoaded: boolean;
}

const initialState: AccountSecurityState = {
    error: null,
    isLoading: false,
    sessions: [],
    sessionsLoaded: false,
};

type ThunkArg<T> = { data: T; onSuccess?: (result: unknown) => void; onFailure?: (error: unknown) => void };

// The backend's success envelope: { message, status, data? }.
type Envelope<T = undefined> = { message: string; status: boolean; data?: T };
type Rejection = { rejectValue: { message: string } };

const rejectMessage = (error: unknown, fallback: string) => ({
    message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback,
});

export const reqToForgotPassword = createAsyncThunk<Envelope, ThunkArg<{ email: string }>, Rejection>(
    "accountSecurity/reqToForgotPassword",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.forgotPassword, { email: data.email });
            onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't send the reset email"));
        }
    }
);

export const reqToResetPasswordWithToken = createAsyncThunk<Envelope, ThunkArg<{ token: string; new_password: string }>, Rejection>(
    "accountSecurity/reqToResetPasswordWithToken",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.resetPasswordWithToken, data);
            onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't reset the password"));
        }
    }
);

export const reqToChangePassword = createAsyncThunk<Envelope<unknown>, ThunkArg<{ current_password: string; new_password: string }>, Rejection>(
    "accountSecurity/reqToChangePassword",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            // The backend ends every other session and re-issues this
            // browser's cookies, so the current tab stays signed in.
            const response = await Axios.post(apiRoutes.changePassword, data);
            onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't change the password"));
        }
    }
);

export const reqToGetSessions = createAsyncThunk<Envelope<AuthSessionInfo[]>, ThunkArg<null>, Rejection>(
    "accountSecurity/reqToGetSessions",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.sessions);
            onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't load your sessions"));
        }
    }
);

export const reqToRevokeSession = createAsyncThunk<Envelope<{ id: string; current: boolean }>, ThunkArg<{ id: string }>, Rejection>(
    "accountSecurity/reqToRevokeSession",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.delete(`${apiRoutes.sessions}/${encodeURIComponent(data.id)}`);
            onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't sign out that session"));
        }
    }
);

const accountSecuritySlice = createSlice({
    name: "accountSecurity",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        const pending = (state: AccountSecurityState) => {
            state.isLoading = true;
            state.error = null;
        };
        const rejected = (state: AccountSecurityState, action: { payload?: { message: string } }) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        };
        const fulfilled = (state: AccountSecurityState) => {
            state.isLoading = false;
            state.error = null;
        };

        for (const thunk of [reqToForgotPassword, reqToResetPasswordWithToken, reqToChangePassword, reqToRevokeSession]) {
            builder.addCase(thunk.pending, pending);
            builder.addCase(thunk.rejected, rejected);
        }
        builder.addCase(reqToForgotPassword.fulfilled, fulfilled);
        builder.addCase(reqToResetPasswordWithToken.fulfilled, fulfilled);
        builder.addCase(reqToChangePassword.fulfilled, fulfilled);

        builder.addCase(reqToGetSessions.pending, pending);
        builder.addCase(reqToGetSessions.rejected, rejected);
        builder.addCase(reqToGetSessions.fulfilled, (state, action) => {
            fulfilled(state);
            state.sessions = Array.isArray(action.payload?.data) ? action.payload.data : [];
            state.sessionsLoaded = true;
        });
        builder.addCase(reqToRevokeSession.fulfilled, (state, action) => {
            fulfilled(state);
            const id = action.payload?.data?.id;
            state.sessions = state.sessions.filter((session) => session.id !== id);
        });
    },
});

export default accountSecuritySlice.reducer;
