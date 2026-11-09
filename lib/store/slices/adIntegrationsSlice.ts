import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";

// Meta and Google ad account connections. No token ever reaches the browser: the API
// answers only what a connection is and which accounts it can reach.

export type AdProvider = "meta" | "google";
export type AdConnectionStatus = "not_configured" | "not_connected" | "connected" | "expired" | "revoked" | "error";

export interface AdAccount {
    id: string;
    name: string | null;
    currency: string | null;
    time_zone: string | null;
    status: string | null;
    is_manager: boolean;
    selected: boolean;
}

export interface AdProviderState {
    provider: AdProvider;
    name: string;
    // The plan includes this platform (ads_enabled and ads_meta / ads_google).
    enabled: boolean;
    // OrbitOps has entered its own credentials for this platform.
    configured: boolean;
    status: AdConnectionStatus;
    connection: {
        status: AdConnectionStatus;
        external_user_name: string | null;
        scopes: string[];
        connected_at: string | null;
        expires_at: string | null;
        last_error: string | null;
        accounts: AdAccount[];
    } | null;
}

interface AdIntegrationsState {
    providers: AdProviderState[];
    isLoaded: boolean;
    isLoading: boolean;
    pending: AdProvider | null;
    error: string | null;
}

const initialState: AdIntegrationsState = {
    providers: [],
    isLoaded: false,
    isLoading: false,
    pending: null,
    error: null,
};

type ThunkArg<D, R> = { data: D; onSuccess?: (result: R) => void; onFailure?: (error: unknown) => void };
type Rejection = { rejectValue: { message: string } };
type Overview = { providers: AdProviderState[] };

const rejectMessage = (error: unknown, fallback: string) => ({
    message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback,
});

export const reqToGetAdIntegrations = createAsyncThunk<Overview, ThunkArg<null, Overview>, Rejection>(
    "adIntegrations/reqToGetAdIntegrations",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const result = (await Axios.get(apiRoutes.adIntegrations)).data.data as Overview;
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't load your ad account connections"));
        }
    },
);

// Answers the provider's sign-in page to open; the browser comes back through the API.
export const reqToConnectAdProvider = createAsyncThunk<{ authorization_url: string }, ThunkArg<{ provider: AdProvider; returnTo: "setup" | "settings" }, { authorization_url: string }>, Rejection>(
    "adIntegrations/reqToConnectAdProvider",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const result = (await Axios.post(`${apiRoutes.adIntegrations}/${data.provider}/connect`, { return_to: data.returnTo })).data.data;
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't start connecting"));
        }
    },
);

export const reqToSelectAdAccounts = createAsyncThunk<Overview, ThunkArg<{ provider: AdProvider; accountIds: string[] }, Overview>, Rejection>(
    "adIntegrations/reqToSelectAdAccounts",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const result = (await Axios.put(`${apiRoutes.adIntegrations}/${data.provider}/accounts`, { account_ids: data.accountIds })).data.data as Overview;
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't save the accounts"));
        }
    },
);

export const reqToDisconnectAdProvider = createAsyncThunk<Overview & { revoked_at_provider?: boolean }, ThunkArg<{ provider: AdProvider }, Overview & { revoked_at_provider?: boolean }>, Rejection>(
    "adIntegrations/reqToDisconnectAdProvider",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const result = (await Axios.delete(`${apiRoutes.adIntegrations}/${data.provider}`)).data.data;
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't disconnect"));
        }
    },
);

const adIntegrationsSlice = createSlice({
    name: "adIntegrations",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetAdIntegrations.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetAdIntegrations.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.providers = action.payload.providers;
            state.isLoaded = true;
        });
        builder.addCase(reqToGetAdIntegrations.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
        for (const thunk of [reqToConnectAdProvider, reqToSelectAdAccounts, reqToDisconnectAdProvider]) {
            builder.addCase(thunk.pending, (state, action) => {
                state.pending = action.meta.arg.data.provider;
                state.error = null;
            });
            builder.addCase(thunk.rejected, (state, action) => {
                state.pending = null;
                state.error = action.payload?.message || "An error occurred";
            });
        }
        builder.addCase(reqToConnectAdProvider.fulfilled, (state) => {
            state.pending = null;
        });
        for (const thunk of [reqToSelectAdAccounts, reqToDisconnectAdProvider]) {
            builder.addCase(thunk.fulfilled, (state, action) => {
                state.pending = null;
                state.providers = action.payload.providers;
                state.isLoaded = true;
            });
        }
    },
});

export default adIntegrationsSlice.reducer;
