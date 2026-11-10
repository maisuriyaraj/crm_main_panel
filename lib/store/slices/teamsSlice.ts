import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapTeamFromApi, teamInputToApi, toTeamApiError, type ApiTeam } from "@/lib/team/mappers";
import type { OrgTeam, TeamApiError, TeamInput } from "@/lib/team/types";

// Teams (groups of members, one team per member). Listed for team.view,
// changed with team.manage; each team carries the actions the API allows.
interface TeamsState {
    error: string | null;
    isLoading: boolean;
    teams: OrgTeam[];
    isSaving: boolean;
    saveError: string | null;
}

const initialState: TeamsState = {
    error: null,
    isLoading: false,
    teams: [],
    isSaving: false,
    saveError: null,
};

type Reject = { rejectValue: TeamApiError };
// The thunk contract every slice follows: `data`, plus callbacks for UI side effects.
type Args<D, R> = { data?: D; onSuccess?: (result: R) => void; onFailure?: (error: unknown) => void };
type ApiEnvelope<T> = { data?: T };

const teamUrl = (id: string) => `${apiRoutes.appTeams}/${encodeURIComponent(id)}`;

export const reqToGetTeams = createAsyncThunk<OrgTeam[], Args<null, ApiEnvelope<ApiTeam[]>> | undefined, Reject>(
    "teams/reqToGetTeams",
    async (args, { rejectWithValue }) => {
        try {
            const response = await Axios.get<ApiEnvelope<ApiTeam[]>>(apiRoutes.appTeams);

            args?.onSuccess?.(response.data);

            return (response.data?.data ?? []).map(mapTeamFromApi);
        } catch (error: unknown) {
            args?.onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load teams"));
        }
    }
);

export const reqToCreateTeam = createAsyncThunk<OrgTeam, Args<TeamInput, OrgTeam> & { data: TeamInput }, Reject>(
    "teams/reqToCreateTeam",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post<ApiEnvelope<ApiTeam>>(apiRoutes.appTeams, teamInputToApi(data));
            const team = mapTeamFromApi(response.data?.data as ApiTeam);

            onSuccess?.(team);

            return team;
        } catch (error: unknown) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Couldn't create the team"));
        }
    }
);

export const reqToUpdateTeam = createAsyncThunk<OrgTeam, Args<{ id: string } & TeamInput, OrgTeam> & { data: { id: string } & TeamInput }, Reject>(
    "teams/reqToUpdateTeam",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const { id, ...input } = data;
            const response = await Axios.patch<ApiEnvelope<ApiTeam>>(teamUrl(id), teamInputToApi(input));
            const team = mapTeamFromApi(response.data?.data as ApiTeam);

            onSuccess?.(team);

            return team;
        } catch (error: unknown) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Couldn't save the team"));
        }
    }
);

export const reqToDeleteTeam = createAsyncThunk<string, Args<{ id: string }, unknown> & { data: { id: string } }, Reject>(
    "teams/reqToDeleteTeam",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.delete(teamUrl(data.id));

            onSuccess?.(response.data);

            return data.id;
        } catch (error: unknown) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Couldn't delete the team"));
        }
    }
);

const teamsSlice = createSlice({
    name: "teams",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetTeams.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetTeams.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.teams = action.payload;
        });
        builder.addCase(reqToGetTeams.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToCreateTeam.pending, (state) => {
            state.isSaving = true;
            state.saveError = null;
        });
        builder.addCase(reqToUpdateTeam.pending, (state) => {
            state.isSaving = true;
            state.saveError = null;
        });
        builder.addCase(reqToDeleteTeam.pending, (state) => {
            state.isSaving = true;
            state.saveError = null;
        });
        builder.addCase(reqToCreateTeam.rejected, (state, action) => {
            state.isSaving = false;
            state.saveError = action.payload?.message || "An error occurred";
        });
        builder.addCase(reqToUpdateTeam.rejected, (state, action) => {
            state.isSaving = false;
            state.saveError = action.payload?.message || "An error occurred";
        });
        builder.addCase(reqToDeleteTeam.rejected, (state, action) => {
            state.isSaving = false;
            state.saveError = action.payload?.message || "An error occurred";
        });
        builder.addCase(reqToCreateTeam.fulfilled, (state, action) => {
            state.isSaving = false;
            state.saveError = null;
            state.teams = [...state.teams, action.payload].sort((a, b) => a.name.localeCompare(b.name));
        });
        builder.addCase(reqToUpdateTeam.fulfilled, (state, action) => {
            state.isSaving = false;
            state.saveError = null;
            state.teams = state.teams.map((team) => (team.id === action.payload.id ? action.payload : team));
        });
        builder.addCase(reqToDeleteTeam.fulfilled, (state, action) => {
            state.isSaving = false;
            state.saveError = null;
            state.teams = state.teams.filter((team) => team.id !== action.payload);
        });
    },
});

export default teamsSlice.reducer;
