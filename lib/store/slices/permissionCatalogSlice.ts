import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapPermissionCatalogFromApi, toTeamApiError } from "@/lib/team/mappers";
import type { PermissionModule, TeamApiError } from "@/lib/team/types";

interface PermissionCatalogState {
    error: string | null;
    isLoading: boolean;
    modules: PermissionModule[];
}

const initialState: PermissionCatalogState = {
    error: null,
    isLoading: false,
    modules: [],
};

// The catalog is defined in backend code and is the same for every org, so
// it is fetched once per session and only re-fetched after an error.
export const reqToGetPermissionCatalog = createAsyncThunk<any, any, { rejectValue: TeamApiError }>(
    "permissionCatalog/reqToGetPermissionCatalog",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.appPermissions);

            onSuccess?.(response.data);

            return mapPermissionCatalogFromApi(response.data?.data);
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load permissions"));
        }
    }
);

const permissionCatalogSlice = createSlice({
    name: "permissionCatalog",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetPermissionCatalog.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetPermissionCatalog.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.modules = action.payload;
        });
        builder.addCase(reqToGetPermissionCatalog.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
    }
});

export default permissionCatalogSlice.reducer;
