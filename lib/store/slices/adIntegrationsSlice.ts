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

export interface AdConnection {
    status: AdConnectionStatus;
    external_user_name: string | null;
    scopes: string[];
    connected_at: string | null;
    expires_at: string | null;
    last_error: string | null;
    // When the hourly or on-demand sync last finished, and why it last didn't.
    last_synced_at: string | null;
    last_sync_error: string | null;
    syncing: boolean;
    accounts: AdAccount[];
}

export interface AdProviderState {
    provider: AdProvider;
    name: string;
    // The plan includes this platform (ads_enabled and ads_meta / ads_google).
    enabled: boolean;
    // OrbitOps has entered its own credentials for this platform.
    configured: boolean;
    status: AdConnectionStatus;
    connection: AdConnection | null;
}

// What one refresh did. `status` is the platform's answer, not an HTTP failure:
// the connection is still there even when it says `failed`.
export interface AdSyncResult {
    status: "ok" | "failed" | "reconnect_required" | "in_progress";
    reason?: string | null;
    since?: string;
    until?: string;
    accounts?: number;
    campaigns_created?: number;
    campaigns_updated?: number;
    metric_rows?: number;
    no_accounts_selected?: boolean;
}

// Money comes in the ad account's own currency and smallest unit (paise, cents),
// so a figure is only ever shown with the currency beside it.
export interface AdCampaignMetrics {
    impressions: number;
    clicks: number;
    spend_minor: number;
    leads: number | null;
    days: number;
    ctr: number | null;
    cpc_minor: number | null;
    cpm_minor: number | null;
}

export interface AdCampaign {
    id: string;
    external_id: string;
    name: string | null;
    status: string | null;
    objective: string | null;
    currency: string | null;
    budget_daily_minor: number | null;
    budget_lifetime_minor: number | null;
    starts_at: string | null;
    ends_at: string | null;
    last_synced_at: string | null;
    account: { id: string; name: string | null; currency: string | null } | null;
    metrics: AdCampaignMetrics;
}

export interface AdCampaignTotals extends Omit<AdCampaignMetrics, "days" | "leads"> {
    currency: string;
    campaigns: number;
    leads: number | null;
}

export interface AdCampaignPage {
    provider: AdProvider;
    campaigns: AdCampaign[];
    totals: AdCampaignTotals[];
    range: { from: string; to: string };
    last_synced_at: string | null;
    connection_status: AdConnectionStatus;
    pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface AdIntegrationsState {
    providers: AdProviderState[];
    isLoaded: boolean;
    isLoading: boolean;
    pending: AdProvider | null;
    // The platform whose figures are being refreshed right now.
    syncing: AdProvider | null;
    lastSync: { provider: AdProvider; result: AdSyncResult } | null;
    campaigns: AdCampaignPage | null;
    campaignsLoading: boolean;
    campaignsError: string | null;
    error: string | null;
}

const initialState: AdIntegrationsState = {
    providers: [],
    isLoaded: false,
    isLoading: false,
    pending: null,
    syncing: null,
    lastSync: null,
    campaigns: null,
    campaignsLoading: false,
    campaignsError: null,
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

// Refresh: the API syncs inside the request, so the answer already carries the
// result and the fresh overview.
export const reqToSyncAdProvider = createAsyncThunk<
    Overview & { provider: AdProvider; sync: AdSyncResult },
    ThunkArg<{ provider: AdProvider }, Overview & { provider: AdProvider; sync: AdSyncResult }>,
    Rejection
>(
    "adIntegrations/reqToSyncAdProvider",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const result = (await Axios.post(`${apiRoutes.adIntegrations}/${data.provider}/sync`, {})).data.data;
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't refresh the figures"));
        }
    },
);

export interface AdCampaignQuery {
    provider: AdProvider;
    from?: string;
    to?: string;
    accountId?: string;
    status?: string;
    page?: number;
    limit?: number;
}

// The campaigns the sync stored, with the chosen range's figures added up. This
// calls no ad platform, so it answers whether or not they are reachable.
export const reqToGetAdCampaigns = createAsyncThunk<AdCampaignPage, ThunkArg<AdCampaignQuery, AdCampaignPage>, Rejection>(
    "adIntegrations/reqToGetAdCampaigns",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(`${apiRoutes.adIntegrations}/${data.provider}/campaigns`, {
                params: {
                    ...(data.from ? { from: data.from } : {}),
                    ...(data.to ? { to: data.to } : {}),
                    ...(data.accountId ? { account_id: data.accountId } : {}),
                    ...(data.status ? { status: data.status } : {}),
                    ...(data.page ? { page: data.page } : {}),
                    limit: data.limit ?? 25,
                },
            });
            const body = response.data;
            const result: AdCampaignPage = {
                provider: data.provider,
                campaigns: (body.data ?? []) as AdCampaign[],
                totals: (body.totals ?? []) as AdCampaignTotals[],
                range: body.range ?? { from: data.from ?? "", to: data.to ?? "" },
                last_synced_at: body.last_synced_at ?? null,
                connection_status: body.connection_status ?? "not_connected",
                pagination: body.pagination ?? { total: 0, page: 1, limit: data.limit ?? 25, totalPages: 0 },
            };
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't load your campaigns"));
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

        // A refresh has its own pending flag: the connection cards stay usable
        // while the figures are being pulled.
        builder.addCase(reqToSyncAdProvider.pending, (state, action) => {
            state.syncing = action.meta.arg.data.provider;
            state.error = null;
        });
        builder.addCase(reqToSyncAdProvider.fulfilled, (state, action) => {
            state.syncing = null;
            state.providers = action.payload.providers;
            state.isLoaded = true;
            state.lastSync = { provider: action.payload.provider, result: action.payload.sync };
        });
        builder.addCase(reqToSyncAdProvider.rejected, (state, action) => {
            state.syncing = null;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToGetAdCampaigns.pending, (state) => {
            state.campaignsLoading = true;
            state.campaignsError = null;
        });
        builder.addCase(reqToGetAdCampaigns.fulfilled, (state, action) => {
            state.campaignsLoading = false;
            state.campaignsError = null;
            state.campaigns = action.payload;
        });
        builder.addCase(reqToGetAdCampaigns.rejected, (state, action) => {
            state.campaignsLoading = false;
            state.campaignsError = action.payload?.message || "An error occurred";
        });
    },
});

// Platforms whose connection has stopped working, so the member must connect
// again. A platform that was never connected is not one of them.
export const providersNeedingReconnect = (providers: AdProviderState[]) =>
    providers.filter((entry) => entry.enabled && (entry.status === "expired" || entry.status === "error"));

export default adIntegrationsSlice.reducer;
