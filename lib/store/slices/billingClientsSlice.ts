import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import {
  mapEmptyStateFromApi,
  mapPaginationFromApi,
  type ListEmptyState,
  type ListPagination,
} from "@/lib/lists/types";
import { mapClientDetailFromApi, mapClientFromApi } from "@/lib/clients/mappers";
import { clientErrorMessage, type BillingClient, type BillingClientDetail, type BillingClientInput, type ClientStatus } from "@/lib/clients/types";
import type { ThunkArg } from "./leadAttachmentsSlice";

// The clients this organization invoices (SRS 7.7). Not `billingSlice`, which is
// what OrbitOps charges the organization, and not `billingSettingsSlice`, which
// is how its invoices will be numbered and worded.
//
// Clients are not on the shared list contract (they have no owner, so no record
// scope and no column chooser), but the API answers the same pager and the same
// empty state, so both are mapped through `lib/lists/types`.

interface BillingClientsState {
  clients: BillingClient[];
  pagination: ListPagination | null;
  emptyState: ListEmptyState | null;
  hasAnyWithoutFilters: boolean;
  // The organization's business currency, which every amount here is in.
  currency: string;
  // The client whose page is open, with its (empty) invoices and balance.
  activeClient: BillingClientDetail | null;
  isLoading: boolean;
  isLoadingOne: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: BillingClientsState = {
  clients: [],
  pagination: null,
  emptyState: null,
  hasAnyWithoutFilters: false,
  currency: "INR",
  activeClient: null,
  isLoading: false,
  isLoadingOne: false,
  isSaving: false,
  error: null,
};

export interface ClientListQuery {
  search?: string;
  status?: ClientStatus;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
  page?: number;
  per_page?: number;
}

interface ClientListResult {
  clients: BillingClient[];
  pagination: ListPagination | null;
  emptyState: ListEmptyState | null;
  hasAnyWithoutFilters: boolean;
  currency: string;
}

export const reqToGetClients = createAsyncThunk<
  ClientListResult,
  Partial<ThunkArg<ClientListQuery, ClientListResult>>,
  { rejectValue: { message: string } }
>("billingClients/list", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingClients, { params: data ?? {} });
    const body = response.data ?? {};
    const meta = body.meta ?? {};
    const result: ClientListResult = {
      clients: ((body.data ?? []) as any[]).map(mapClientFromApi),
      pagination: mapPaginationFromApi(body.pagination),
      emptyState: mapEmptyStateFromApi(meta.empty_state),
      hasAnyWithoutFilters: meta.has_any_without_filters === true,
      currency: meta.currency ?? "INR",
    };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: clientErrorMessage(error, "Couldn't load your clients") });
  }
});

export const reqToGetClient = createAsyncThunk<
  BillingClientDetail,
  Partial<ThunkArg<{ id: string }, BillingClientDetail>>,
  { rejectValue: { message: string } }
>("billingClients/get", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(`${apiRoutes.billingClients}/${data?.id}`);
    const result = mapClientDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: clientErrorMessage(error, "Couldn't load that client") });
  }
});

export const reqToCreateClient = createAsyncThunk<
  BillingClientDetail,
  Partial<ThunkArg<BillingClientInput, BillingClientDetail>>,
  { rejectValue: { message: string } }
>("billingClients/create", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.post(apiRoutes.billingClients, data ?? {});
    const result = mapClientDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: clientErrorMessage(error, "Couldn't add that client") });
  }
});

export const reqToUpdateClient = createAsyncThunk<
  BillingClientDetail,
  Partial<ThunkArg<{ id: string; values: BillingClientInput }, BillingClientDetail>>,
  { rejectValue: { message: string } }
>("billingClients/update", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.patch(`${apiRoutes.billingClients}/${data?.id}`, data?.values ?? {});
    const result = mapClientDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: clientErrorMessage(error, "Couldn't save that client") });
  }
});

// Active ↔ inactive. There is no delete: an inactive client is hidden from new
// invoices but stays on the old ones, so nothing a tenant has billed is lost.
export const reqToSetClientStatus = createAsyncThunk<
  BillingClientDetail,
  Partial<ThunkArg<{ id: string; status: ClientStatus }, BillingClientDetail>>,
  { rejectValue: { message: string } }
>("billingClients/setStatus", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.patch(`${apiRoutes.billingClients}/${data?.id}/status`, { status: data?.status });
    const result = mapClientDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: clientErrorMessage(error, "Couldn't change that client's status") });
  }
});

// SRS 5.5 (LD-A7). The route lives on the lead because it acts on a lead, but
// what comes back is a client, so the thunk belongs here. An empty body is the
// normal case: the API fills the client in from the lead.
export const reqToConvertLeadToClient = createAsyncThunk<
  BillingClientDetail,
  Partial<ThunkArg<{ leadId: string; values?: BillingClientInput }, BillingClientDetail>>,
  { rejectValue: { message: string } }
>("billingClients/convertLead", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.post(`${apiRoutes.leads}/${data?.leadId}/convert-to-client`, data?.values ?? {});
    const result = mapClientDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: clientErrorMessage(error, "Couldn't turn this lead into a client") });
  }
});

const billingClientsSlice = createSlice({
  name: "billingClients",
  initialState,
  reducers: {
    // Leaving the detail page drops the client, so the next one never opens
    // showing the previous client's details for a frame.
    clearActiveClient: (state) => {
      state.activeClient = null;
      state.isLoadingOne = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(reqToGetClients.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetClients.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.clients = action.payload.clients;
      state.pagination = action.payload.pagination;
      state.emptyState = action.payload.emptyState;
      state.hasAnyWithoutFilters = action.payload.hasAnyWithoutFilters;
      state.currency = action.payload.currency;
    });
    builder.addCase(reqToGetClients.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetClient.pending, (state) => {
      state.isLoadingOne = true;
      state.error = null;
    });
    builder.addCase(reqToGetClient.fulfilled, (state, action) => {
      state.isLoadingOne = false;
      state.error = null;
      state.activeClient = action.payload;
      state.currency = action.payload.creditLimitCurrency;
    });
    builder.addCase(reqToGetClient.rejected, (state, action) => {
      state.isLoadingOne = false;
      state.error = action.payload?.message || "An error occurred";
    });

    // Create, edit and the status toggle all answer with the saved client, so
    // each one patches the row in the list and the open detail together.
    [reqToCreateClient, reqToUpdateClient, reqToSetClientStatus, reqToConvertLeadToClient].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const saved = action.payload as BillingClientDetail;
        state.clients = state.clients.map((row) => (row.id === saved.id ? saved : row));
        if (state.activeClient?.id === saved.id) state.activeClient = saved;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = (action.payload as { message?: string } | undefined)?.message || "An error occurred";
      });
    });
  },
});

export const { clearActiveClient } = billingClientsSlice.actions;
export default billingClientsSlice.reducer;
