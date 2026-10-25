import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapRoleFromApi, toTeamApiError } from "@/lib/team/mappers";
import type { TeamApiError, TeamRole } from "@/lib/team/types";

interface TeamRolesState {
    error: string | null;
    isLoading: boolean;
    roles: TeamRole[];
}

const initialState: TeamRolesState = {
    error: null,
    isLoading: false,
    roles: [],
};

// Roles come from the server with an `assignable` flag computed for the
// caller, so role pickers only ever offer roles the API will accept.
export const reqToGetTeamRoles = createAsyncThunk<any, any, { rejectValue: TeamApiError }>(
    "teamRoles/reqToGetTeamRoles",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.appRoles);

            onSuccess?.(response.data);

            return (response.data?.data ?? []).map(mapRoleFromApi);
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load roles"));
        }
    }
);

const teamRolesSlice = createSlice({
    name: "teamRoles",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetTeamRoles.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetTeamRoles.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.roles = action.payload;
        });
        builder.addCase(reqToGetTeamRoles.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
    }
});

export default teamRolesSlice.reducer;
