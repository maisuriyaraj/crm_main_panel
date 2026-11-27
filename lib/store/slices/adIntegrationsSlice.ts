import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";

// Meta and Google ad account connections. No token ever reaches the browser: the API
// answers only what a connection is and which accounts it can reach.

export type AdProvider = "meta" | "google";
// What the campaign list is being asked for: one platform, or every connected
// one at once (the platform switcher's "All").
export type AdCampaignScope = AdProvider | "all";
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
    // Which platform the campaign came from. The API sends it on every row, so
    // a combined list can label each one without matching ids to a connection.
    provider: AdProvider;
    provider_name: string;
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

// One platform's state inside the combined list. It comes back with the figures,
// so the platform switcher knows what is connected without the overview call,
// which needs the organization settings permission the campaigns route doesn't.
export interface AdCampaignProviderState {
    provider: AdProvider;
    provider_name: string;
    enabled: boolean;
    connection_status: AdConnectionStatus | "not_enabled";
    last_synced_at: string | null;
    last_sync_error: string | null;
}

export interface AdCampaignPage {
    provider: AdCampaignScope;
    campaigns: AdCampaign[];
    totals: AdCampaignTotals[];
    range: { from: string; to: string };
    // On the combined list this is the stalest platform's time, and null while
    // one of them has never synced: claiming the newest would say the figures
    // are fresher than some of them are.
    last_synced_at: string | null;
    // Only meaningful for one platform; the combined list answers "connected"
    // when at least one platform is, and carries the detail in `providers`.
    connection_status: AdConnectionStatus;
    providers: AdCampaignProviderState[];
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
    // What the platform switcher needs and nothing more: which platforms the
    // plan allows and which are connected. Kept apart from `providers` because
    // that comes from the overview call, which needs the organization settings
    // permission the campaigns screens don't ask for.
    platformStates: AdCampaignProviderState[];
    platformStatesLoaded: boolean;
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
    platformStates: [],
    platformStatesLoaded: false,
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

// Just the platform states, for a tab that shows no campaign figures of its own
// (the unbuilt tabs, and the connections page for a member who may not read the
// overview). It asks the combined campaign list for a single row, because that
// is the only answer carrying connection status that needs `ads.view` alone.
export const reqToGetAdPlatformStates = createAsyncThunk<AdCampaignProviderState[], ThunkArg<null, AdCampaignProviderState[]>, Rejection>(
    "adIntegrations/reqToGetAdPlatformStates",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const body = (await Axios.get(apiRoutes.adCampaignsCombined, { params: { limit: 1 } })).data;
            const result = (body.providers ?? []) as AdCampaignProviderState[];
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, "Couldn't check which ad platforms are connected"));
        }
    },
);

export interface AdCampaignQuery {
    provider: AdCampaignScope;
    from?: string;
    to?: string;
    // Only one platform at a time can be asked about an ad account, so the
    // combined list ignores it.
    accountId?: string;
    status?: string;
    // Campaign name, a "contains" match the API runs over stored names.
    search?: string;
    page?: number;
    limit?: number;
}

// The campaigns the sync stored, with the chosen range's figures added up. This
// calls no ad platform, so it answers whether or not they are reachable.
export const reqToGetAdCampaigns = createAsyncThunk<AdCampaignPage, ThunkArg<AdCampaignQuery, AdCampaignPage>, Rejection>(
    "adIntegrations/reqToGetAdCampaigns",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const combined = data.provider === "all";
            const url = combined ? apiRoutes.adCampaignsCombined : `${apiRoutes.adIntegrations}/${data.provider}/campaigns`;
            const response = await Axios.get(url, {
                params: {
                    ...(data.from ? { from: data.from } : {}),
                    ...(data.to ? { to: data.to } : {}),
                    ...(!combined && data.accountId ? { account_id: data.accountId } : {}),
                    ...(data.status ? { status: data.status } : {}),
                    ...(data.search ? { search: data.search } : {}),
                    ...(data.page ? { page: data.page } : {}),
                    limit: data.limit ?? 25,
                },
            });
            const body = response.data;
            const providers = (body.providers ?? []) as AdCampaignProviderState[];
            const result: AdCampaignPage = {
                provider: data.provider,
                campaigns: (body.data ?? []) as AdCampaign[],
                totals: (body.totals ?? []) as AdCampaignTotals[],
                range: body.range ?? { from: data.from ?? "", to: data.to ?? "" },
                last_synced_at: body.last_synced_at ?? null,
                // The combined list has no single connection: it is "connected"
                // when any platform is, so the empty table says the right thing.
                connection_status: combined
                    ? (providers.some((entry) => entry.connection_status === "connected") ? "connected" : "not_connected")
                    : body.connection_status ?? "not_connected",
                providers,
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

// The overview says the same things about a platform in its own shape, so the
// switcher can be fed from either call.
const platformStateOf = (entry: AdProviderState): AdCampaignProviderState => ({
    provider: entry.provider,
    provider_name: entry.name,
    enabled: entry.enabled,
    connection_status: !entry.enabled ? "not_enabled" : entry.status,
    last_synced_at: entry.connection?.last_synced_at ?? null,
    last_sync_error: entry.connection?.last_sync_error ?? null,
});

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
            state.platformStates = action.payload.providers.map(platformStateOf);
            state.platformStatesLoaded = true;
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
                // Disconnecting must put that platform back to "Connect" in the
                // switcher straight away, not at the next page load.
                state.platformStates = action.payload.providers.map(platformStateOf);
                state.platformStatesLoaded = true;
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
            state.platformStates = action.payload.providers.map(platformStateOf);
            state.platformStatesLoaded = true;
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
            // The combined answer already carries every platform's state, so
            // the switcher never needs its own request on this tab.
            if (action.payload.providers.length) {
                state.platformStates = action.payload.providers;
                state.platformStatesLoaded = true;
            }
        });
        builder.addCase(reqToGetAdCampaigns.rejected, (state, action) => {
            state.campaignsLoading = false;
            state.campaignsError = action.payload?.message || "An error occurred";
        });

        // A switcher that cannot be told what is connected is left as it is
        // rather than showing every platform as unavailable.
        builder.addCase(reqToGetAdPlatformStates.fulfilled, (state, action) => {
            if (action.payload.length) {
                state.platformStates = action.payload;
                state.platformStatesLoaded = true;
            }
        });
    },
});

// Platforms whose connection has stopped working, so the member must connect
// again. A platform that was never connected is not one of them.
export const providersNeedingReconnect = (providers: AdProviderState[]) =>
    providers.filter((entry) => entry.enabled && (entry.status === "expired" || entry.status === "error"));

export default adIntegrationsSlice.reducer;
