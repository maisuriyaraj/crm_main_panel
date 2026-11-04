import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import type { ThunkArg } from "./leadAttachmentsSlice";

// Which modules are on for the organization, from GET /features. Only hides
// what would be refused anyway: the API checks every request itself.
interface FeaturesState {
  flags: Record<string, boolean>;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: FeaturesState = {
  flags: {},
  isLoaded: false,
  isLoading: false,
  error: null,
};

export const reqToGetFeatures = createAsyncThunk<Record<string, boolean>, Partial<ThunkArg<null, Record<string, boolean>>>, { rejectValue: { message: string } }>(
  "features/reqToGetFeatures",
  async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.features);
      const flags = response.data?.data ?? {};
      onSuccess?.(flags);
      return flags;
    } catch (error) {
      onFailure?.(error);
      const message = axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message;
      return rejectWithValue({ message: message || "Failed to load features" });
    }
  }
);

// Unknown or not yet loaded counts as off, so a section never flashes in and out.
export const isFeatureOn = (state: FeaturesState, key: string) => state.isLoaded && state.flags[key] === true;

const featuresSlice = createSlice({
  name: "features",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(reqToGetFeatures.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reqToGetFeatures.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.flags = action.payload;
        state.isLoaded = true;
      })
      .addCase(reqToGetFeatures.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Failed to load features";
      });
  },
});

export default featuresSlice.reducer;
