import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import {
  mapCustomFieldFromApi,
  mapDuplicateResultFromApi,
  mapLeadActivityFromApi,
  mapLeadFromApi,
  mapLeadNoteFromApi,
  mapLeadPicklistFromApi,
  mapLeadStatusFromApi,
} from "@/lib/leads/mappers";
import type {
  Lead,
  LeadActivity,
  LeadCustomFieldDefinition,
  LeadNote,
  LeadPicklistEntry,
  LeadStage,
  Pipeline,
} from "@/lib/leads/types";
import { mapEmptyStateFromApi, mapPaginationFromApi, type ListEmptyState, type ListPagination } from "@/lib/lists/types";

interface LeadsState {
  leads: Lead[];
  pagination: ListPagination | null;
  // Whether the organization has any leads at all, filters aside, and what the
  // API says an empty page should say and offer.
  hasAnyWithoutFilters: boolean;
  emptyState: ListEmptyState | null;
  isLoading: boolean;
  error: string | null;

  // The organization's boards, and the one the screen is showing. `statuses`
  // always holds that one pipeline's stages, never a mix.
  pipelines: Pipeline[];
  pipelinesLoading: boolean;
  pipelinesError: string | null;

  statuses: LeadStage[];
  statusesLoading: boolean;
  statusesError: string | null;

  activeLeadActivities: LeadActivity[];
  activitiesLoading: boolean;

  activeLeadNotes: LeadNote[];
  notesLoading: boolean;

  // The organization's own lists: where leads come from, how contact happens,
  // and the fields it has added to its leads. Shared by the lead form, the
  // toolbar filters and the settings screen, so they are loaded once.
  sources: LeadPicklistEntry[];
  channels: LeadPicklistEntry[];
  customFields: LeadCustomFieldDefinition[];
  picklistsLoading: boolean;
  picklistsError: string | null;
}

const initialState: LeadsState = {
  leads: [],
  pagination: null,
  hasAnyWithoutFilters: true,
  emptyState: null,
  isLoading: false,
  error: null,

  // Without a starting value the pipeline selector reads `undefined.length`
  // on the first render, before the boards have been fetched.
  pipelines: [],
  pipelinesLoading: false,
  pipelinesError: null,

  statuses: [],
  statusesLoading: false,
  statusesError: null,

  activeLeadActivities: [],
  activitiesLoading: false,

  activeLeadNotes: [],
  notesLoading: false,

  sources: [],
  channels: [],
  customFields: [],
  picklistsLoading: false,
  picklistsError: null,
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
        pagination: mapPaginationFromApi(response.data?.pagination),
        hasAnyWithoutFilters: response.data?.has_any_without_filters !== false,
        emptyState: mapEmptyStateFromApi(response.data?.empty_state),
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

// LD-A3: a deleted lead goes back into the pipeline, while its 30-day window is
// still open. The API refuses it afterwards with RESTORE_PERIOD_OVER.
export const reqToRestoreLead = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToRestoreLead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(`${apiRoutes.leads}/${data.id}/restore`);

      onSuccess?.(response.data);

      return { id: data.id, ...response.data };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to restore lead",
      });
    }
  }
);

// LD-A1: asked while the Add Lead form is still open, so a match can be shown
// before anything is saved and nothing the member typed is lost.
export const reqToCheckLeadDuplicates = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToCheckLeadDuplicates",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(apiRoutes.leadDuplicateCheck, data);

      onSuccess?.(mapDuplicateResultFromApi(response.data?.data));

      return mapDuplicateResultFromApi(response.data?.data);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to check for duplicates",
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
      // `reason` is only sent when there is one: a stage marked "require a
      // reason" refuses the move without it, and the rest ignore it.
      const response = await Axios.patch(`${apiRoutes.leads}/${data.id}/stage`, {
        status_id: data.status_id,
        ...(data.reason ? { reason: data.reason } : {}),
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

// Pipelines

export const reqToGetPipelines = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetPipelines",
  async ({ onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.leadPipelines);

      onSuccess?.(response.data);

      return (response.data?.data ?? []).map(mapPipelineFromApi);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to load pipelines",
      });
    }
  }
);

export const reqToCreatePipeline = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToCreatePipeline",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(apiRoutes.leadPipelines, { name: data.name });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to create pipeline",
      });
    }
  }
);

export const reqToUpdatePipeline = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToUpdatePipeline",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.patch(`${apiRoutes.leadPipelines}/${data.id}`, { name: data.name });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to rename pipeline",
      });
    }
  }
);

export const reqToDeletePipeline = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToDeletePipeline",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.leadPipelines}/${data.id}`);

      onSuccess?.(response.data);

      return { id: data.id, ...response.data };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to remove pipeline",
      });
    }
  }
);

export const reqToSetDefaultPipeline = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToSetDefaultPipeline",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(`${apiRoutes.leadPipelines}/${data.id}/set-default`);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({
        message: error?.response?.data?.message || "Failed to set the default pipeline",
      });
    }
  }
);

// Stages of one pipeline

export const reqToGetLeadStatuses = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLeadStatuses",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      // Without a pipeline the API answers for the organization's default one.
      const response = await Axios.get(apiRoutes.leadStatuses, {
        params: data?.pipeline_id ? { pipeline_id: data.pipeline_id } : {},
      });

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

// Lead sources and channels
//
// Source is where the lead came from; channel is how contact with it happens.
// The two lists have the same shape and the same routes, so one pair of helpers
// builds both sets of thunks and only the path differs.

const picklistThunks = (kind: "sources" | "channels", path: string, noun: string) => ({
  list: createAsyncThunk<any, any, { rejectValue: { message: string } }>(
    `leads/reqToGetLead${kind}`,
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
      try {
        const response = await Axios.get(path, { params: data ?? {} });

        onSuccess?.(response.data);

        return { kind, entries: (response.data?.data ?? []).map(mapLeadPicklistFromApi) };
      } catch (error: any) {
        onFailure?.(error);

        return rejectWithValue({ message: error?.response?.data?.message || `Failed to load lead ${noun}s` });
      }
    }
  ),
  create: createAsyncThunk<any, any, { rejectValue: { message: string } }>(
    `leads/reqToCreateLead${kind}`,
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
      try {
        const response = await Axios.post(path, data);

        onSuccess?.(response.data);

        return response.data;
      } catch (error: any) {
        onFailure?.(error);

        return rejectWithValue({ message: error?.response?.data?.message || `Failed to create lead ${noun}` });
      }
    }
  ),
  update: createAsyncThunk<any, any, { rejectValue: { message: string } }>(
    `leads/reqToUpdateLead${kind}`,
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
      try {
        const { id, ...rest } = data;
        const response = await Axios.patch(`${path}/${id}`, rest);

        onSuccess?.(response.data);

        return response.data;
      } catch (error: any) {
        onFailure?.(error);

        return rejectWithValue({ message: error?.response?.data?.message || `Failed to update lead ${noun}` });
      }
    }
  ),
  remove: createAsyncThunk<any, any, { rejectValue: { message: string } }>(
    `leads/reqToDeleteLead${kind}`,
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
      try {
        const response = await Axios.delete(`${path}/${data.id}`);

        onSuccess?.(response.data);

        return { id: data.id, ...response.data };
      } catch (error: any) {
        onFailure?.(error);

        return rejectWithValue({ message: error?.response?.data?.message || `Failed to remove lead ${noun}` });
      }
    }
  ),
});

const sourceThunks = picklistThunks("sources", apiRoutes.leadSources, "source");
const channelThunks = picklistThunks("channels", apiRoutes.leadChannels, "channel");

export const reqToGetLeadSources = sourceThunks.list;
export const reqToCreateLeadSource = sourceThunks.create;
export const reqToUpdateLeadSource = sourceThunks.update;
export const reqToDeleteLeadSource = sourceThunks.remove;

export const reqToGetLeadChannels = channelThunks.list;
export const reqToCreateLeadChannel = channelThunks.create;
export const reqToUpdateLeadChannel = channelThunks.update;
export const reqToDeleteLeadChannel = channelThunks.remove;

// Tenant-defined lead fields

export const reqToGetLeadCustomFields = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToGetLeadCustomFields",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.leadCustomFields, { params: data ?? {} });

      onSuccess?.(response.data);

      return (response.data?.data ?? []).map(mapCustomFieldFromApi);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({ message: error?.response?.data?.message || "Failed to load lead fields" });
    }
  }
);

export const reqToCreateLeadCustomField = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToCreateLeadCustomField",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(apiRoutes.leadCustomFields, data);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({ message: error?.response?.data?.message || "Failed to create lead field" });
    }
  }
);

export const reqToUpdateLeadCustomField = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToUpdateLeadCustomField",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...rest } = data;
      const response = await Axios.patch(`${apiRoutes.leadCustomFields}/${id}`, rest);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({ message: error?.response?.data?.message || "Failed to update lead field" });
    }
  }
);

export const reqToDeleteLeadCustomField = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "leads/reqToDeleteLeadCustomField",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.leadCustomFields}/${data.id}`);

      onSuccess?.(response.data);

      return { id: data.id, ...response.data };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue({ message: error?.response?.data?.message || "Failed to remove lead field" });
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
      state.hasAnyWithoutFilters = action.payload.hasAnyWithoutFilters;
      state.emptyState = action.payload.emptyState;
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

    // The duplicate check reads nothing into the store: its answer belongs to
    // the one form that asked, which keeps it in its own state.
    [reqToCreateLead, reqToUpdateLead, reqToDeleteLead, reqToRestoreLead, reqToBulkUpdateLeads, reqToBulkDeleteLeads, reqToChangeLeadStage].forEach(
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

    builder.addCase(reqToGetPipelines.pending, (state) => {
      state.pipelinesLoading = true;
      state.pipelinesError = null;
    });
    builder.addCase(reqToGetPipelines.fulfilled, (state, action) => {
      state.pipelinesLoading = false;
      state.pipelines = action.payload;
    });
    builder.addCase(reqToGetPipelines.rejected, (state, action) => {
      state.pipelinesLoading = false;
      state.pipelinesError = action.payload?.message || "An error occurred";
    });

    [reqToCreatePipeline, reqToUpdatePipeline, reqToDeletePipeline, reqToSetDefaultPipeline].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.pipelinesLoading = true;
        state.pipelinesError = null;
      });
      builder.addCase(thunk.fulfilled, (state) => {
        state.pipelinesLoading = false;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.pipelinesLoading = false;
        state.pipelinesError = action.payload?.message || "An error occurred";
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

    // Both picklists land in the same two reducers; the payload says which list
    // it is, so sources and channels never overwrite each other.
    [reqToGetLeadSources, reqToGetLeadChannels].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.picklistsLoading = false;
        if (action.payload?.kind === "channels") state.channels = action.payload.entries;
        else state.sources = action.payload.entries;
      });
    });

    builder.addCase(reqToGetLeadCustomFields.fulfilled, (state, action) => {
      state.picklistsLoading = false;
      state.customFields = action.payload;
    });

    [
      reqToGetLeadSources,
      reqToGetLeadChannels,
      reqToGetLeadCustomFields,
      reqToCreateLeadSource,
      reqToUpdateLeadSource,
      reqToDeleteLeadSource,
      reqToCreateLeadChannel,
      reqToUpdateLeadChannel,
      reqToDeleteLeadChannel,
      reqToCreateLeadCustomField,
      reqToUpdateLeadCustomField,
      reqToDeleteLeadCustomField,
    ].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.picklistsLoading = true;
        state.picklistsError = null;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.picklistsLoading = false;
        state.picklistsError = action.payload?.message || "An error occurred";
      });
    });

    [
      reqToCreateLeadSource,
      reqToUpdateLeadSource,
      reqToDeleteLeadSource,
      reqToCreateLeadChannel,
      reqToUpdateLeadChannel,
      reqToDeleteLeadChannel,
      reqToCreateLeadCustomField,
      reqToUpdateLeadCustomField,
      reqToDeleteLeadCustomField,
    ].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state) => {
        state.picklistsLoading = false;
      });
    });
  },
});

export default leadsSlice.reducer;
