import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import {
  columnsToApi,
  mapPreferencesFromApi,
  mapSavedViewFromApi,
  type ListColumnChoice,
  type ListPreferences,
  type SavedView,
} from "@/lib/lists/types";

// A member's column choices and saved views, per list. State is keyed by the
// list key ("leads", "contacts") so two list screens open at once never share
// each other's columns.

interface ListState {
  preferences: ListPreferences | null;
  views: SavedView[];
  defaultViewId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface ListViewsState {
  byList: Record<string, ListState>;
}

const emptyList: ListState = {
  preferences: null,
  views: [],
  defaultViewId: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

const initialState: ListViewsState = { byList: {} };

// Reducers reach for a list's slot before writing to it, so the first request
// for a list does not have to create it separately.
const slotOf = (state: ListViewsState, listKey: string): ListState => {
  if (!state.byList[listKey]) state.byList[listKey] = { ...emptyList };
  return state.byList[listKey];
};

const failure = (error: any, fallback: string) => ({
  message: error?.response?.data?.message || fallback,
});

export const reqToGetListPreferences = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToGetListPreferences",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(`${apiRoutes.listPreferences}/${data.listKey}`);
      onSuccess?.(response.data);
      return { listKey: data.listKey, preferences: mapPreferencesFromApi(response.data?.data) };
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue({ ...failure(error, "Failed to load list columns"), listKey: data.listKey } as any);
    }
  },
);

export const reqToSaveListPreferences = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToSaveListPreferences",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.put(`${apiRoutes.listPreferences}/${data.listKey}`, {
        columns: columnsToApi(data.columns as ListColumnChoice[]),
      });
      onSuccess?.(response.data);
      return { listKey: data.listKey, preferences: mapPreferencesFromApi(response.data?.data) };
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to save your columns"));
    }
  },
);

export const reqToGetSavedViews = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToGetSavedViews",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.savedViews, { params: { list_key: data.listKey } });
      onSuccess?.(response.data);
      return {
        listKey: data.listKey,
        views: (response.data?.data ?? []).map(mapSavedViewFromApi),
        defaultViewId: response.data?.default_view_id ? String(response.data.default_view_id) : null,
      };
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to load saved views"));
    }
  },
);

export const reqToCreateSavedView = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToCreateSavedView",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      // The list key only routes the request and tracks state. The API's body
      // schema refuses an unknown key, so nothing but `body` is sent.
      const response = await Axios.post(apiRoutes.savedViews, data.body);
      onSuccess?.(response.data);
      return response.data;
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to save this view"));
    }
  },
);

export const reqToUpdateSavedView = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToUpdateSavedView",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.patch(`${apiRoutes.savedViews}/${data.id}`, data.body);
      onSuccess?.(response.data);
      return response.data;
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to update this view"));
    }
  },
);

export const reqToDeleteSavedView = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToDeleteSavedView",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.savedViews}/${data.id}`);
      onSuccess?.(response.data);
      return response.data;
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to delete this view"));
    }
  },
);

export const reqToSetDefaultSavedView = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToSetDefaultSavedView",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(`${apiRoutes.savedViews}/${data.id}/default`, {});
      onSuccess?.(response.data);
      return response.data;
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to set your default view"));
    }
  },
);

export const reqToClearDefaultSavedView = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "listViews/reqToClearDefaultSavedView",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.savedViews}/default/${data.listKey}`);
      onSuccess?.(response.data);
      return response.data;
    } catch (error: any) {
      onFailure?.(error);
      return rejectWithValue(failure(error, "Failed to clear your default view"));
    }
  },
);

const listViewsSlice = createSlice({
  name: "listViews",
  initialState,
  reducers: {
    // Applied at once in the browser while the save is in flight, so dragging a
    // column does not wait for a round trip.
    columnsChangedLocally: (state, action: PayloadAction<{ listKey: string; columns: ListColumnChoice[] }>) => {
      const slot = slotOf(state, action.payload.listKey);
      if (slot.preferences) slot.preferences = { ...slot.preferences, columns: action.payload.columns };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(reqToGetListPreferences.pending, (state, action) => {
      const slot = slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "");
      slot.isLoading = true;
      slot.error = null;
    });
    builder.addCase(reqToGetListPreferences.fulfilled, (state, action) => {
      const slot = slotOf(state, action.payload.listKey);
      slot.isLoading = false;
      slot.preferences = action.payload.preferences;
    });
    builder.addCase(reqToGetListPreferences.rejected, (state, action) => {
      const slot = slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "");
      slot.isLoading = false;
      slot.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToSaveListPreferences.pending, (state, action) => {
      slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "").isSaving = true;
    });
    builder.addCase(reqToSaveListPreferences.fulfilled, (state, action) => {
      const slot = slotOf(state, action.payload.listKey);
      slot.isSaving = false;
      slot.preferences = action.payload.preferences;
    });
    builder.addCase(reqToSaveListPreferences.rejected, (state, action) => {
      const slot = slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "");
      slot.isSaving = false;
      slot.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetSavedViews.pending, (state, action) => {
      slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "").isLoading = true;
    });
    builder.addCase(reqToGetSavedViews.fulfilled, (state, action) => {
      const slot = slotOf(state, action.payload.listKey);
      slot.isLoading = false;
      slot.views = action.payload.views;
      slot.defaultViewId = action.payload.defaultViewId;
    });
    builder.addCase(reqToGetSavedViews.rejected, (state, action) => {
      const slot = slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "");
      slot.isLoading = false;
      slot.error = action.payload?.message || "An error occurred";
    });

    // The writes below are followed by a fresh reqToGetSavedViews from the
    // caller, so they only track the saving flag and the error message.
    [
      reqToCreateSavedView,
      reqToUpdateSavedView,
      reqToDeleteSavedView,
      reqToSetDefaultSavedView,
      reqToClearDefaultSavedView,
    ].forEach((thunk) => {
      builder.addCase(thunk.pending, (state, action) => {
        slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "").isSaving = true;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "").isSaving = false;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        const slot = slotOf(state, (action.meta.arg as any)?.data?.listKey ?? "");
        slot.isSaving = false;
        slot.error = (action.payload as any)?.message || "An error occurred";
      });
    });
  },
});

export const { columnsChangedLocally } = listViewsSlice.actions;

export const listSlotOf = (state: ListViewsState, listKey: string): ListState => state.byList[listKey] ?? emptyList;

export default listViewsSlice.reducer;
