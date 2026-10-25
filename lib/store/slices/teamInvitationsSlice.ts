import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import { mapDeliveryFromApi, mapInvitationFromApi, toTeamApiError } from "@/lib/team/mappers";
import type { TeamApiError, TeamInvitation, TeamPagination } from "@/lib/team/types";

interface TeamInvitationsState {
    error: string | null;
    isLoading: boolean;
    invitations: TeamInvitation[];
    pagination: TeamPagination | null;
    isMutating: boolean;
}

const initialState: TeamInvitationsState = {
    error: null,
    isLoading: false,
    invitations: [],
    pagination: null,
    isMutating: false,
};

type RejectValue = { rejectValue: TeamApiError };

export const reqToGetInvitations = createAsyncThunk<any, any, RejectValue>(
    "teamInvitations/reqToGetInvitations",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.invitations, { params: data ?? {} });

            onSuccess?.(response.data);

            return {
                invitations: (response.data?.data ?? []).map(mapInvitationFromApi),
                pagination: response.data?.pagination ?? null,
            };
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load invitations"));
        }
    }
);

// Create and both resends answer with the invitation plus, when it could not
// be emailed, the one-time invite link. The mapped result goes to onSuccess.
const deliveryMutation = (type: string, request: (data: any) => Promise<any>, fallback: string) =>
    createAsyncThunk<any, any, RejectValue>(type, async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await request(data);
            const result = mapDeliveryFromApi(response.data?.data);

            onSuccess?.(result);

            return result;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, fallback));
        }
    });

export const reqToCreateInvitation = deliveryMutation(
    "teamInvitations/reqToCreateInvitation",
    ({ email, fullName, roleId }) =>
        Axios.post(apiRoutes.invitations, { email, full_name: fullName || undefined, role_id: roleId }),
    "Failed to send invitation",
);

export const reqToResendInvitation = deliveryMutation(
    "teamInvitations/reqToResendInvitation",
    ({ id }) => Axios.post(`${apiRoutes.invitations}/${id}/resend`),
    "Failed to resend invitation",
);

export const reqToResendLegacyInvitation = deliveryMutation(
    "teamInvitations/reqToResendLegacyInvitation",
    ({ userId }) => Axios.post(`${apiRoutes.invitations}/legacy/${userId}/resend`),
    "Failed to send invitation",
);

export const reqToRevokeInvitation = createAsyncThunk<any, any, RejectValue>(
    "teamInvitations/reqToRevokeInvitation",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(`${apiRoutes.invitations}/${data.id}/revoke`);

            onSuccess?.(response.data);

            return response.data?.data ?? null;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to revoke invitation"));
        }
    }
);

const mutations = [reqToCreateInvitation, reqToResendInvitation, reqToResendLegacyInvitation, reqToRevokeInvitation];

const teamInvitationsSlice = createSlice({
    name: "teamInvitations",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetInvitations.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetInvitations.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.invitations = action.payload.invitations;
            state.pagination = action.payload.pagination;
        });
        builder.addCase(reqToGetInvitations.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        mutations.forEach((thunk) => {
            builder.addCase(thunk.pending, (state) => {
                state.isMutating = true;
            });
            builder.addCase(thunk.fulfilled, (state) => {
                state.isMutating = false;
            });
            builder.addCase(thunk.rejected, (state) => {
                state.isMutating = false;
            });
        });
    }
});

export default teamInvitationsSlice.reducer;
