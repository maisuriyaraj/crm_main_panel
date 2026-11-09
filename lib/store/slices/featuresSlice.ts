import axios from "axios";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import type { ThunkArg } from "./leadAttachmentsSlice";

// Where the organization's subscription stands. An expired or cancelled one
// closes every module (403 SUBSCRIPTION_INACTIVE) but keeps team and settings.
export interface SubscriptionAccess {
  status: string | null;
  trialEndDate: string | null;
  modulesBlocked: boolean;
}

// Which modules are on for the organization, from GET /features. Only hides
// what would be refused anyway: the API checks every request itself.
interface FeaturesState {
  flags: Record<string, boolean>;
  subscription: SubscriptionAccess | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: FeaturesState = {
  flags: {},
  subscription: null,
  isLoaded: false,
  isLoading: false,
  error: null,
};

type FeaturesResult = { flags: Record<string, boolean>; subscription: SubscriptionAccess | null };

export const reqToGetFeatures = createAsyncThunk<FeaturesResult, Partial<ThunkArg<null, Record<string, boolean>>>, { rejectValue: { message: string } }>(
  "features/reqToGetFeatures",
  async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.features);
      const flags = response.data?.data ?? {};
      const raw = response.data?.subscription;
      const subscription: SubscriptionAccess | null = raw
        ? { status: raw.status ?? null, trialEndDate: raw.trial_end_date ?? null, modulesBlocked: raw.modules_blocked === true }
        : null;
      onSuccess?.(flags);
      return { flags, subscription };
    } catch (error) {
      onFailure?.(error);
      const message = axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message;
      return rejectWithValue({ message: message || "Failed to load features" });
    }
  }
);

// Unknown or not yet loaded counts as off, so a section never flashes in and out.
export const isFeatureOn = (state: FeaturesState, key: string) => state.isLoaded && state.flags[key] === true;

export const isSubscriptionInactive = (state: FeaturesState) => !!state.subscription?.modulesBlocked;

const featuresSlice = createSlice({
  name: "features",
  initialState,
  reducers: {
    // Any module answering 403 SUBSCRIPTION_INACTIVE says so before /features is re-read.
    subscriptionInactive: (state, action: PayloadAction<string | null>) => {
      state.subscription = {
        status: action.payload ?? state.subscription?.status ?? null,
        trialEndDate: state.subscription?.trialEndDate ?? null,
        modulesBlocked: true,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(reqToGetFeatures.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reqToGetFeatures.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.flags = action.payload.flags;
        state.subscription = action.payload.subscription;
        state.isLoaded = true;
      })
      .addCase(reqToGetFeatures.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Failed to load features";
      });
  },
});

export const { subscriptionInactive } = featuresSlice.actions;
export default featuresSlice.reducer;
