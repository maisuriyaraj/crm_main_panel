import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapAuditEventFromApi, toTeamApiError } from "@/lib/team/mappers";
import type { TeamApiError, TeamAuditEvent, TeamPagination } from "@/lib/team/types";

interface TeamAuditState {
    error: string | null;
    isLoading: boolean;
    events: TeamAuditEvent[];
    pagination: TeamPagination | null;
}

const initialState: TeamAuditState = {
    error: null,
    isLoading: false,
    events: [],
    pagination: null,
};

export const reqToGetTeamAudit = createAsyncThunk<any, any, { rejectValue: TeamApiError }>(
    "teamAudit/reqToGetTeamAudit",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.teamAudit, { params: data ?? {} });

            onSuccess?.(response.data);

            return {
                events: (response.data?.data ?? []).map(mapAuditEventFromApi),
                pagination: response.data?.pagination ?? null,
            };
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load team activity"));
        }
    }
);

const teamAuditSlice = createSlice({
    name: "teamAudit",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetTeamAudit.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetTeamAudit.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            // "Load more": page 1 replaces the list, later pages append.
            const page = action.payload.pagination?.page ?? 1;
            state.events = page > 1 ? [...state.events, ...action.payload.events] : action.payload.events;
            state.pagination = action.payload.pagination;
        });
        builder.addCase(reqToGetTeamAudit.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
    }
});

export default teamAuditSlice.reducer;
