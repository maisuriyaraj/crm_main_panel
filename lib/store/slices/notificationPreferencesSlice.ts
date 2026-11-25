import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";

// Each member's own choice of which notices they get, in the bell and by email.
// The API answers only the types this member's role may receive, so the screen
// renders what it is given and never holds a list of its own.

export type NoticeChannel = "in_app" | "email";

export interface NoticePreference {
    alert_type: string;
    category: string;
    label: string;
    description: string;
    audience: string;
    self_only: boolean;
    in_app: boolean;
    email: boolean;
    // Channels that are always delivered and cannot be switched off.
    locked: NoticeChannel[];
}

interface PreferencesState {
    preferences: NoticePreference[];
    isLoaded: boolean;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
}

const initialState: PreferencesState = {
    preferences: [],
    isLoaded: false,
    isLoading: false,
    isSaving: false,
    error: null,
};

const CHANNELS: NoticeChannel[] = ["in_app", "email"];

const mapPreference = (row: Record<string, unknown>): NoticePreference => ({
    alert_type: String(row.alert_type),
    category: (row.category as string) ?? "system",
    label: (row.label as string) ?? String(row.alert_type),
    description: (row.description as string) ?? "",
    audience: (row.audience as string) ?? "all_members",
    self_only: row.self_only === true,
    in_app: row.in_app !== false,
    email: row.email === true,
    locked: Array.isArray(row.locked) ? (row.locked as string[]).filter((entry): entry is NoticeChannel => CHANNELS.includes(entry as NoticeChannel)) : [],
});

type ThunkArg<D> = { data: D; onSuccess?: (result: NoticePreference[]) => void; onFailure?: (error: unknown) => void };
type Rejection = { rejectValue: { message: string } };

const rejectMessage = (error: unknown, fallback: string) => ({
    message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback,
});

const preferencesThunk = <D>(
    type: string,
    request: (data: D) => Promise<{ data: { data?: { preferences?: Record<string, unknown>[] } } }>,
    fallback: string,
) =>
    createAsyncThunk<NoticePreference[], ThunkArg<D>, Rejection>(type, async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await request(data);
            const result = (response.data.data?.preferences ?? []).map(mapPreference);
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, fallback));
        }
    });

export const reqToGetNoticePreferences = preferencesThunk<null>(
    "notificationPreferences/reqToGetNoticePreferences",
    () => Axios.get(apiRoutes.notificationPreferences),
    "Couldn't load your notification settings",
);

export type NoticePreferenceInput = { items: Array<{ alert_type: string; in_app?: boolean; email?: boolean }> };

export const reqToSaveNoticePreferences = preferencesThunk<NoticePreferenceInput>(
    "notificationPreferences/reqToSaveNoticePreferences",
    (data) => Axios.put(apiRoutes.notificationPreferences, data),
    "Couldn't save your notification settings",
);

const notificationPreferencesSlice = createSlice({
    name: "notificationPreferences",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetNoticePreferences.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetNoticePreferences.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isLoaded = true;
            state.error = null;
            state.preferences = action.payload;
        });
        builder.addCase(reqToGetNoticePreferences.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
        builder.addCase(reqToSaveNoticePreferences.pending, (state) => {
            state.isSaving = true;
            state.error = null;
        });
        builder.addCase(reqToSaveNoticePreferences.fulfilled, (state, action) => {
            state.isSaving = false;
            state.isLoaded = true;
            state.error = null;
            state.preferences = action.payload;
        });
        builder.addCase(reqToSaveNoticePreferences.rejected, (state, action) => {
            state.isSaving = false;
            state.error = action.payload?.message || "An error occurred";
        });
    },
});

export default notificationPreferencesSlice.reducer;
