import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapContactFromApi, mapContactNoteFromApi } from "@/lib/contacts/mappers";
import type { Contact, ContactNote, ContactsPagination } from "@/lib/contacts/types";

interface ContactsState {
  contacts: Contact[];
  pagination: ContactsPagination | null;
  isLoading: boolean;
  error: string | null;

  activeContactNotes: ContactNote[];
  notesLoading: boolean;
}

const initialState: ContactsState = {
  contacts: [],
  pagination: null,
  isLoading: false,
  error: null,

  activeContactNotes: [],
  notesLoading: false,
};

// The API answers validation failures with 400 + an `errors` array. Thunks pass
// that array through untouched so the form can attach messages per field; the
// flat `message` is the fallback for everything else.
const rejectPayload = (error: any, fallback: string) => ({
  message: error?.response?.data?.message || fallback,
  errors: error?.response?.data?.errors,
  status: error?.response?.status,
  data: error?.response?.data?.data,
});

export const reqToGetContacts = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToGetContacts",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.contacts, { params: data ?? {} });

      onSuccess?.(response.data);

      return {
        contacts: (response.data?.data ?? []).map(mapContactFromApi),
        pagination: response.data?.pagination ?? null,
      };
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to load contacts"));
    }
  }
);

export const reqToGetContact = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToGetContact",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(`${apiRoutes.contacts}/${data.id}`);

      onSuccess?.(response.data);

      return mapContactFromApi(response.data?.data);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to load contact"));
    }
  }
);

export const reqToCreateContact = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToCreateContact",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(apiRoutes.contacts, data);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to create contact"));
    }
  }
);

export const reqToUpdateContact = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToUpdateContact",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...rest } = data;
      const response = await Axios.patch(`${apiRoutes.contacts}/${id}`, rest);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to update contact"));
    }
  }
);

export const reqToDeleteContact = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToDeleteContact",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.contacts}/${data.id}`);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to delete contact"));
    }
  }
);

export const reqToBulkUpdateContacts = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToBulkUpdateContacts",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.patch(`${apiRoutes.contacts}/bulk`, data);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to update contacts"));
    }
  }
);

export const reqToBulkDeleteContacts = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToBulkDeleteContacts",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.contacts}/bulk`, { data });

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to delete contacts"));
    }
  }
);

export const reqToGetContactNotes = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToGetContactNotes",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.get(`${apiRoutes.contacts}/${data.id}/notes`);

      onSuccess?.(response.data);

      return (response.data?.data ?? []).map(mapContactNoteFromApi);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to load notes"));
    }
  }
);

export const reqToCreateContactNote = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToCreateContactNote",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { id, ...rest } = data;
      const response = await Axios.post(`${apiRoutes.contacts}/${id}/notes`, rest);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to create note"));
    }
  }
);

export const reqToUpdateContactNote = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToUpdateContactNote",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { noteId, ...rest } = data;
      const response = await Axios.patch(`${apiRoutes.contactNotes}/${noteId}`, rest);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to update note"));
    }
  }
);

export const reqToDeleteContactNote = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToDeleteContactNote",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.delete(`${apiRoutes.contactNotes}/${data.noteId}`);

      onSuccess?.(response.data);

      return response.data;
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to delete note"));
    }
  }
);

// Converting lives on the leads route because it acts on a lead, but the result
// is a contact, so the thunk belongs here.
export const reqToConvertLead = createAsyncThunk<
  any,
  any,
  { rejectValue: { message: string } }
>(
  "contacts/reqToConvertLead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const { leadId, ...rest } = data;
      const response = await Axios.post(`${apiRoutes.leads}/${leadId}/convert`, rest);

      onSuccess?.(response.data);

      return mapContactFromApi(response.data?.data);
    } catch (error: any) {
      onFailure?.(error);

      return rejectWithValue(rejectPayload(error, "Failed to convert lead"));
    }
  }
);

const contactsSlice = createSlice({
  name: "contacts",
  initialState,
  reducers: {
    clearContactNotes(state) {
      state.activeContactNotes = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(reqToGetContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reqToGetContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = action.payload.contacts;
        state.pagination = action.payload.pagination;
      })
      .addCase(reqToGetContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Failed to load contacts";
      })

      .addCase(reqToGetContactNotes.pending, (state) => {
        state.notesLoading = true;
      })
      .addCase(reqToGetContactNotes.fulfilled, (state, action) => {
        state.notesLoading = false;
        state.activeContactNotes = action.payload;
      })
      .addCase(reqToGetContactNotes.rejected, (state) => {
        state.notesLoading = false;
        state.activeContactNotes = [];
      });
  },
});

export const { clearContactNotes } = contactsSlice.actions;

export default contactsSlice.reducer;
