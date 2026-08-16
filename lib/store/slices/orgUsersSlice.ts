import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";

export interface OrgUser {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
}

interface OrgUsersState {
    error: string | null;
    isLoading: boolean;
    users: OrgUser[];
}

const initialState: OrgUsersState = {
    error: null,
    isLoading: false,
    users: [],
};

export const reqToGetOrgUsers = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "orgUsers/reqToGetOrgUsers",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.appUsers);

            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to load team",
            });
        }
    }
);

export const reqToCreateOrgUser = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "orgUsers/reqToCreateOrgUser",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.appUsers, data);

            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to create user",
            });
        }
    }
);

export const reqToUpdateOrgUser = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "orgUsers/reqToUpdateOrgUser",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const { id, ...rest } = data;
            const response = await Axios.patch(`${apiRoutes.appUsers}/${id}`, rest);

            onSuccess?.(response.data);

            return response.data;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to update user",
            });
        }
    }
);

export const reqToDeleteOrgUser = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "orgUsers/reqToDeleteOrgUser",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.delete(`${apiRoutes.appUsers}/${data.id}`);

            onSuccess?.(response.data);

            return { id: data.id, ...response.data };
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Failed to disable user",
            });
        }
    }
);

const orgUsersSlice = createSlice({
    name: "orgUsers",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetOrgUsers.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetOrgUsers.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            if (Array.isArray(action.payload?.data)) {
                state.users = action.payload.data;
            } else if (Array.isArray(action.payload)) {
                state.users = action.payload;
            }
        });
        builder.addCase(reqToGetOrgUsers.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToCreateOrgUser.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToCreateOrgUser.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
        });
        builder.addCase(reqToCreateOrgUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToUpdateOrgUser.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToUpdateOrgUser.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
        });
        builder.addCase(reqToUpdateOrgUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToDeleteOrgUser.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToDeleteOrgUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.users = state.users.filter((user) => user.id !== action.payload.id);
        });
        builder.addCase(reqToDeleteOrgUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
    }
});

export default orgUsersSlice.reducer;
