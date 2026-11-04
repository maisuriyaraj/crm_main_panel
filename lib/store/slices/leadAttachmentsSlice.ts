import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  deleteAttachment,
  fetchAttachments,
  fetchStorageUsage,
  uploadAttachment,
  type LeadAttachment,
  type StorageUsage,
} from "@/lib/leads/attachments";

// Download links are deliberately not here: see openAttachment in lib/leads/attachments.
interface LeadAttachmentsState {
  leadId: string | null;
  items: LeadAttachment[];
  isLoading: boolean;
  error: string | null;

  usage: StorageUsage | null;
  usageLoading: boolean;
  usageError: string | null;
}

const initialState: LeadAttachmentsState = {
  leadId: null,
  items: [],
  isLoading: false,
  error: null,

  usage: null,
  usageLoading: false,
  usageError: null,
};

// The one argument every thunk here takes (see .claude/rules/state-management.md).
export interface ThunkArg<D, R> {
  data: D;
  onSuccess?: (result: R) => void;
  onFailure?: (error: unknown) => void;
}

const messageOf = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message) || fallback;

export const reqToGetLeadAttachments = createAsyncThunk<
  { leadId: string; items: LeadAttachment[] },
  ThunkArg<{ leadId: string }, LeadAttachment[]>,
  { rejectValue: { message: string } }
>(
  "leadAttachments/reqToGetLeadAttachments",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const items = await fetchAttachments(data.leadId);
      onSuccess?.(items);
      return { leadId: data.leadId, items };
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Failed to load attachments") });
    }
  }
);

// `data.onProgress(percent)` follows the upload; it is UI state, kept by the caller.
export const reqToUploadLeadAttachment = createAsyncThunk<
  { leadId: string; attachment: LeadAttachment },
  ThunkArg<{ leadId: string; file: File; onProgress?: (percent: number) => void }, LeadAttachment>,
  { rejectValue: { message: string } }
>(
  "leadAttachments/reqToUploadLeadAttachment",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const attachment = await uploadAttachment(data.leadId, data.file, data.onProgress);
      onSuccess?.(attachment);
      return { leadId: data.leadId, attachment };
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Failed to upload the file") });
    }
  }
);

export const reqToDeleteLeadAttachment = createAsyncThunk<
  { leadId: string; attachmentId: string },
  ThunkArg<{ leadId: string; attachmentId: string }, void>,
  { rejectValue: { message: string } }
>(
  "leadAttachments/reqToDeleteLeadAttachment",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      await deleteAttachment(data.leadId, data.attachmentId);
      onSuccess?.();
      return { leadId: data.leadId, attachmentId: data.attachmentId };
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Failed to delete the file") });
    }
  }
);

export const reqToGetStorageUsage = createAsyncThunk<StorageUsage, Partial<ThunkArg<null, StorageUsage>>, { rejectValue: { message: string } }>(
  "leadAttachments/reqToGetStorageUsage",
  async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const usage = await fetchStorageUsage();
      onSuccess?.(usage);
      return usage;
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Failed to load storage usage") });
    }
  }
);

const leadAttachmentsSlice = createSlice({
  name: "leadAttachments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(reqToGetLeadAttachments.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        // Another lead's files must not show while this one's load.
        if (state.leadId !== action.meta.arg.data.leadId) {
          state.leadId = action.meta.arg.data.leadId;
          state.items = [];
        }
      })
      .addCase(reqToGetLeadAttachments.fulfilled, (state, action) => {
        if (action.payload.leadId !== state.leadId) return;
        state.isLoading = false;
        state.error = null;
        state.items = action.payload.items;
      })
      .addCase(reqToGetLeadAttachments.rejected, (state, action) => {
        if (action.meta.arg.data.leadId !== state.leadId) return;
        state.isLoading = false;
        state.error = action.payload?.message ?? "Failed to load attachments";
      })
      .addCase(reqToUploadLeadAttachment.fulfilled, (state, action) => {
        if (action.payload.leadId !== state.leadId) return;
        state.items = [action.payload.attachment, ...state.items];
      })
      .addCase(reqToDeleteLeadAttachment.fulfilled, (state, action) => {
        if (action.payload.leadId !== state.leadId) return;
        state.items = state.items.filter((item) => item.id !== action.payload.attachmentId);
      })
      .addCase(reqToGetStorageUsage.pending, (state) => {
        state.usageLoading = true;
        state.usageError = null;
      })
      .addCase(reqToGetStorageUsage.fulfilled, (state, action) => {
        state.usageLoading = false;
        state.usageError = null;
        state.usage = action.payload;
      })
      .addCase(reqToGetStorageUsage.rejected, (state, action) => {
        state.usageLoading = false;
        state.usageError = action.payload?.message ?? "Failed to load storage usage";
      });
  },
});

export default leadAttachmentsSlice.reducer;
