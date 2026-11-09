import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { mapHeldLeadsFromApi, mapUsageFromApi } from "@/lib/usage/mappers";
import type { HeldLeads, UsageSummary } from "@/lib/usage/types";
import type { ThunkArg } from "./leadAttachmentsSlice";

// The organization's usage against its plan, read by every member. Held leads
// are for admins only; the API refuses them to anyone else.
interface UsageState {
  summary: UsageSummary | null;
  heldLeads: HeldLeads | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: UsageState = {
  summary: null,
  heldLeads: null,
  isLoaded: false,
  isLoading: false,
  error: null,
};

const messageOf = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message) || fallback;

export const reqToGetUsage = createAsyncThunk<UsageSummary, Partial<ThunkArg<null, UsageSummary>>, { rejectValue: { message: string } }>(
  "usage/reqToGetUsage",
  async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.usage);
      const summary = mapUsageFromApi(response.data?.data);
      onSuccess?.(summary);
      return summary;
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Couldn't load your plan usage") });
    }
  }
);

export const reqToGetHeldLeads = createAsyncThunk<HeldLeads, Partial<ThunkArg<null, HeldLeads>>, { rejectValue: { message: string } }>(
  "usage/reqToGetHeldLeads",
  async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.usageHeldLeads);
      const held = mapHeldLeadsFromApi(response.data?.data);
      onSuccess?.(held);
      return held;
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Couldn't load waiting leads") });
    }
  }
);

const usageSlice = createSlice({
  name: "usage",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(reqToGetUsage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reqToGetUsage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.summary = action.payload;
        state.isLoaded = true;
      })
      .addCase(reqToGetUsage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Couldn't load your plan usage";
      })
      // Held leads never block the page, so they keep their own quiet state.
      .addCase(reqToGetHeldLeads.fulfilled, (state, action) => {
        state.heldLeads = action.payload;
      })
      .addCase(reqToGetHeldLeads.rejected, (state) => {
        state.heldLeads = null;
      });
  },
});

export default usageSlice.reducer;
