import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import {
  mapLeadActivityFromApi,
  mapLeadFromApi,
  mapLeadNoteFromApi,
  mapLeadStatusFromApi,
} from "@/lib/leads/mappers";
import type { Lead, LeadActivity, LeadNote, LeadStage } from "@/lib/leads/types";

interface LeadsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LeadsState {
  leads: Lead[];
  pagination: LeadsPagination | null;
  isLoading: boolean;
  error: string | null;

  statuses: LeadStage[];
  statusesLoading: boolean;
  statusesError: string | null;

  activeLeadActivities: LeadActivity[];
  activitiesLoading: boolean;

  activeLeadNotes: LeadNote[];
  notesLoading: boolean;
}

const initialState: LeadsState = {
  leads: [],
  pagination: null,
  isLoading: false,
  error: null,

  statuses: [],
  statusesLoading: false,
  statusesError: null,

  activeLeadActivities: [],
  activitiesLoading: false,

  activeLeadNotes: [],
  notesLoading: false,
};

// Leads CRUD

export const reqToGetLeads = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLeads",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.leads, { params: data ?? {} });

      onSuccess?.(response.data);

      return {
        leads: (response.data?.data ?? []).map(mapLeadFromApi),
        pagination: response.data?.pagination ?? null,
      };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to load leads",
      });
    }
  }
);

export const reqToGetLead = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(`${apiRoutes.leads}/${data.id}`);

      onSuccess?.(response.data);

      return mapLeadFromApi(response.data?.data);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to load lead",
      });
    }
  }
);

export const reqToCreateLead = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToCreateLead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(apiRoutes.leads, data);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to create lead",
      });
    }
  }
);

export const reqToUpdateLead = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToUpdateLead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...rest } = data;
      const response = await Axios.patch(`${apiRoutes.leads}/${id}`, rest);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to update lead",
      });
    }
  }
);

export const reqToDeleteLead = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToDeleteLead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.leads}/${data.id}`);

      onSuccess?.(response.data);

      return { id: data.id, ...response.data };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to delete lead",
      });
    }
  }
);

export const reqToBulkUpdateLeads = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToBulkUpdateLeads",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.patch(`${apiRoutes.leads}/bulk`, data);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to update leads",
      });
    }
  }
);

export const reqToBulkDeleteLeads = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToBulkDeleteLeads",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      // DELETE with a body: Axios sends this via `config.data`, not a
      // second positional argument like `post`/`patch` take.
      const response = await Axios.delete(`${apiRoutes.leads}/bulk`, { data });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to delete leads",
      });
    }
  }
);

export const reqToChangeLeadStage = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToChangeLeadStage",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.patch(`${apiRoutes.leads}/${data.id}/stage`, {
        status_id: data.status_id,
      });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to change lead stage",
      });
    }
  }
);

// Activities

export const reqToGetLeadActivities = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLeadActivities",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...params } = data;
      const response = await Axios.get(`${apiRoutes.leads}/${id}/activities`, { params });

      onSuccess?.(response.data);

      return (response.data?.data ?? []).map(mapLeadActivityFromApi);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to load activities",
      });
    }
  }
);

export const reqToAddLeadActivity = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToAddLeadActivity",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...body } = data;
      const response = await Axios.post(`${apiRoutes.leads}/${id}/activities`, body);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to log activity",
      });
    }
  }
);

// Notes

export const reqToGetLeadNotes = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLeadNotes",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(`${apiRoutes.leads}/${data.id}/notes`);

      onSuccess?.(response.data);

      return (response.data?.data ?? []).map(mapLeadNoteFromApi);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to load notes",
      });
    }
  }
);

export const reqToCreateLeadNote = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToCreateLeadNote",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(`${apiRoutes.leads}/${data.id}/notes`, {
        note: data.note,
      });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to add note",
      });
    }
  }
);

export const reqToUpdateLeadNote = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToUpdateLeadNote",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.patch(`${apiRoutes.leadNotes}/${data.noteId}`, {
        note: data.note,
      });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to update note",
      });
    }
  }
);

export const reqToDeleteLeadNote = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToDeleteLeadNote",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.leadNotes}/${data.noteId}`);

      onSuccess?.(response.data);

      return { noteId: data.noteId, ...response.data };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to delete note",
      });
    }
  }
);

// Pipeline (lead statuses)

export const reqToGetLeadStatuses = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLeadStatuses",
  async ({ onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.leadStatuses);

      onSuccess?.(response.data);

      return (response.data?.data ?? []).map(mapLeadStatusFromApi);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to load stages",
      });
    }
  }
);

export const reqToCreateLeadStatus = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToCreateLeadStatus",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(apiRoutes.leadStatuses, data);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to create stage",
      });
    }
  }
);

export const reqToUpdateLeadStatus = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToUpdateLeadStatus",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...rest } = data;
      const response = await Axios.patch(`${apiRoutes.leadStatuses}/${id}`, rest);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to update stage",
      });
    }
  }
);

export const reqToDeleteLeadStatus = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToDeleteLeadStatus",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.leadStatuses}/${data.id}`);

      onSuccess?.(response.data);

      return { id: data.id, ...response.data };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to delete stage",
      });
    }
  }
);

const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(reqToGetLeads.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetLeads.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.leads = action.payload.leads;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(reqToGetLeads.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetLead.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetLead.fulfilled, (state) => {
      state.isLoading = false;
      state.error = null;
    });
    builder.addCase(reqToGetLead.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    [reqToCreateLead, reqToUpdateLead, reqToDeleteLead, reqToBulkUpdateLeads, reqToBulkDeleteLeads, reqToChangeLeadStage].forEach(
      (thunk) => {
        builder.addCase(thunk.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        });
        builder.addCase(thunk.fulfilled, (state) => {
          state.isLoading = false;
          state.error = null;
        });
        builder.addCase(thunk.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload?.message || "An error occurred";
        });
      }
    );

    builder.addCase(reqToGetLeadActivities.pending, (state) => {
      state.activitiesLoading = true;
    });
    builder.addCase(reqToGetLeadActivities.fulfilled, (state, action) => {
      state.activitiesLoading = false;
      state.activeLeadActivities = action.payload;
    });
    builder.addCase(reqToGetLeadActivities.rejected, (state) => {
      state.activitiesLoading = false;
    });

    builder.addCase(reqToAddLeadActivity.pending, (state) => {
      state.activitiesLoading = true;
    });
    builder.addCase(reqToAddLeadActivity.fulfilled, (state) => {
      state.activitiesLoading = false;
    });
    builder.addCase(reqToAddLeadActivity.rejected, (state) => {
      state.activitiesLoading = false;
    });

    builder.addCase(reqToGetLeadNotes.pending, (state) => {
      state.notesLoading = true;
    });
    builder.addCase(reqToGetLeadNotes.fulfilled, (state, action) => {
      state.notesLoading = false;
      state.activeLeadNotes = action.payload;
    });
    builder.addCase(reqToGetLeadNotes.rejected, (state) => {
      state.notesLoading = false;
    });

    [reqToCreateLeadNote, reqToUpdateLeadNote, reqToDeleteLeadNote].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.notesLoading = true;
      });
      builder.addCase(thunk.fulfilled, (state) => {
        state.notesLoading = false;
      });
      builder.addCase(thunk.rejected, (state) => {
        state.notesLoading = false;
      });
    });

    builder.addCase(reqToGetLeadStatuses.pending, (state) => {
      state.statusesLoading = true;
      state.statusesError = null;
    });
    builder.addCase(reqToGetLeadStatuses.fulfilled, (state, action) => {
      state.statusesLoading = false;
      state.statuses = action.payload;
    });
    builder.addCase(reqToGetLeadStatuses.rejected, (state, action) => {
      state.statusesLoading = false;
      state.statusesError = action.payload?.message || "An error occurred";
    });

    [reqToCreateLeadStatus, reqToUpdateLeadStatus, reqToDeleteLeadStatus].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.statusesLoading = true;
        state.statusesError = null;
      });
      builder.addCase(thunk.fulfilled, (state) => {
        state.statusesLoading = false;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.statusesLoading = false;
        state.statusesError = action.payload?.message || "An error occurred";
      });
    });
  },
});

export default leadsSlice.reducer;
