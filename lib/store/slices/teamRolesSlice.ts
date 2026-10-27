import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapRoleDetailFromApi, mapRoleFromApi, roleInputToApi, toTeamApiError } from "@/lib/team/mappers";
import type { RoleInput, TeamApiError, TeamRole, TeamRoleDetail } from "@/lib/team/types";

interface TeamRolesState {
    error: string | null;
    isLoading: boolean;
    roles: TeamRole[];
    detail: TeamRoleDetail | null;
    isDetailLoading: boolean;
    detailError: TeamApiError | null;
    // Writes keep their own state so a refused save never marks the list or
    // the open role as failed to load.
    isSaving: boolean;
    saveError: string | null;
}

const initialState: TeamRolesState = {
    error: null,
    isLoading: false,
    roles: [],
    detail: null,
    isDetailLoading: false,
    detailError: null,
    isSaving: false,
    saveError: null,
};

const roleUrl = (id: string) => `${apiRoutes.appRoles}/${encodeURIComponent(id)}`;

// Roles come from the server with `assignable`, `editable` and `deletable`
// computed for the caller, so screens only ever offer what the API accepts.
export const reqToGetTeamRoles = createAsyncThunk<any, any, { rejectValue: TeamApiError }>(
    "teamRoles/reqToGetTeamRoles",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.appRoles, { params: { include: "permissions" } });

            onSuccess?.(response.data);

            return (response.data?.data ?? []).map(mapRoleFromApi);
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load roles"));
        }
    }
);

export const reqToGetTeamRole = createAsyncThunk<any, any, { rejectValue: TeamApiError }>(
    "teamRoles/reqToGetTeamRole",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(roleUrl(data.id));

            onSuccess?.(response.data);

            return mapRoleDetailFromApi(response.data?.data);
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load the role"));
        }
    }
);

export const reqToCreateTeamRole = createAsyncThunk<any, { data: RoleInput; onSuccess?: any; onFailure?: any }, { rejectValue: TeamApiError }>(
    "teamRoles/reqToCreateTeamRole",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.appRoles, roleInputToApi(data));
            const role = mapRoleDetailFromApi(response.data?.data);

            onSuccess?.(role);

            return role;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Couldn't create the role"));
        }
    }
);

// `version` is the one the form loaded; the API refuses the save with
// VERSION_CONFLICT if someone changed the role since.
export const reqToUpdateTeamRole = createAsyncThunk<
    any,
    { data: { id: string; version: number } & Partial<RoleInput>; onSuccess?: any; onFailure?: any },
    { rejectValue: TeamApiError }
>(
    "teamRoles/reqToUpdateTeamRole",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const { id, version, ...fields } = data;
            const body: Record<string, unknown> = { version };
            if (fields.name !== undefined) body.name = fields.name;
            if (fields.description !== undefined) body.description = fields.description;
            if (fields.permissions !== undefined) body.permissions = fields.permissions;

            const response = await Axios.patch(roleUrl(id), body);
            const role = mapRoleDetailFromApi(response.data?.data);

            onSuccess?.(role);

            return role;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Couldn't save the role"));
        }
    }
);

export const reqToDeleteTeamRole = createAsyncThunk<any, { data: { id: string }; onSuccess?: any; onFailure?: any }, { rejectValue: TeamApiError }>(
    "teamRoles/reqToDeleteTeamRole",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.delete(roleUrl(data.id));

            onSuccess?.(response.data);

            return data.id;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Couldn't delete the role"));
        }
    }
);

const teamRolesSlice = createSlice({
    name: "teamRoles",
    initialState,
    reducers: {
        clearTeamRoleDetail: (state) => {
            state.detail = null;
            state.detailError = null;
        },
    },
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

        builder.addCase(reqToGetTeamRole.pending, (state) => {
            state.isDetailLoading = true;
            state.detailError = null;
        });
        builder.addCase(reqToGetTeamRole.fulfilled, (state, action) => {
            state.isDetailLoading = false;
            state.detailError = null;
            state.detail = action.payload;
        });
        builder.addCase(reqToGetTeamRole.rejected, (state, action) => {
            state.isDetailLoading = false;
            state.detailError = action.payload ?? { message: "An error occurred" };
        });

        [reqToCreateTeamRole, reqToUpdateTeamRole, reqToDeleteTeamRole].forEach((thunk) => {
            builder.addCase(thunk.pending, (state) => {
                state.isSaving = true;
                state.saveError = null;
            });
            builder.addCase(thunk.rejected, (state, action) => {
                state.isSaving = false;
                state.saveError = action.payload?.message || "An error occurred";
            });
        });
        builder.addCase(reqToCreateTeamRole.fulfilled, (state, action) => {
            state.isSaving = false;
            state.detail = action.payload;
        });
        builder.addCase(reqToUpdateTeamRole.fulfilled, (state, action) => {
            state.isSaving = false;
            state.detail = action.payload;
            state.roles = state.roles.map((role) => (role.id === action.payload.id ? { ...role, ...action.payload } : role));
        });
        builder.addCase(reqToDeleteTeamRole.fulfilled, (state, action) => {
            state.isSaving = false;
            state.roles = state.roles.filter((role) => role.id !== action.payload);
            if (state.detail?.id === action.payload) state.detail = null;
        });
    }
});

export const { clearTeamRoleDetail } = teamRolesSlice.actions;

export default teamRolesSlice.reducer;
