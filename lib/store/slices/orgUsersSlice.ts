import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import {
    mapMemberDetailFromApi,
    mapMemberFromApi,
    mapMemberOptionFromApi,
    mapSummaryFromApi,
    toTeamApiError,
} from "@/lib/team/mappers";
import type {
    MemberOption,
    TeamApiError,
    TeamMember,
    TeamMemberDetail,
    TeamPagination,
    TeamSummary,
} from "@/lib/team/types";

interface OrgUsersState {
    error: string | null;
    isLoading: boolean;
    users: TeamMember[];
    pagination: TeamPagination | null;
    summary: TeamSummary | null;
    // Set while a member action runs, so the list stays visible meanwhile.
    isMutating: boolean;

    activeMember: TeamMemberDetail | null;
    activeMemberLoading: boolean;

    // Active teammates (names only) for owner/assignee dropdowns in Leads and
    // Contacts. Readable by every role, unlike the Team list.
    memberOptions: MemberOption[];
    memberOptionsLoading: boolean;
}

const initialState: OrgUsersState = {
    error: null,
    isLoading: false,
    users: [],
    pagination: null,
    summary: null,
    isMutating: false,

    activeMember: null,
    activeMemberLoading: false,

    memberOptions: [],
    memberOptionsLoading: false,
};

type RejectValue = { rejectValue: TeamApiError };

export const reqToGetOrgUsers = createAsyncThunk<any, any, RejectValue>(
    "orgUsers/reqToGetOrgUsers",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.appUsers, { params: data ?? {} });

            onSuccess?.(response.data);

            return {
                users: (response.data?.data ?? []).map(mapMemberFromApi),
                pagination: response.data?.pagination ?? null,
                summary: response.data?.summary ? mapSummaryFromApi(response.data.summary) : null,
            };
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load team"));
        }
    }
);

export const reqToGetOrgUser = createAsyncThunk<any, any, RejectValue>(
    "orgUsers/reqToGetOrgUser",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(`${apiRoutes.appUsers}/${data.id}`);

            onSuccess?.(response.data);

            return mapMemberDetailFromApi(response.data?.data);
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load member"));
        }
    }
);

// One factory for the member mutations: they share the request/callback
// contract and differ only in method, path and body.
const memberMutation = (
    type: string,
    request: (data: any) => Promise<any>,
    fallback: string,
) =>
    createAsyncThunk<any, any, RejectValue>(type, async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await request(data);

            onSuccess?.(response.data);

            return response.data?.data ?? null;
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, fallback));
        }
    });

export const reqToUpdateOrgUser = memberMutation(
    "orgUsers/reqToUpdateOrgUser",
    ({ id, ...rest }) => Axios.patch(`${apiRoutes.appUsers}/${id}`, rest),
    "Failed to update member",
);

export const reqToSuspendOrgUser = memberMutation(
    "orgUsers/reqToSuspendOrgUser",
    ({ id, reason }) => Axios.post(`${apiRoutes.appUsers}/${id}/suspend`, reason ? { reason } : {}),
    "Failed to suspend member",
);

export const reqToReactivateOrgUser = memberMutation(
    "orgUsers/reqToReactivateOrgUser",
    ({ id }) => Axios.post(`${apiRoutes.appUsers}/${id}/reactivate`),
    "Failed to reactivate member",
);

export const reqToRevokeOrgUserSessions = memberMutation(
    "orgUsers/reqToRevokeOrgUserSessions",
    ({ id }) => Axios.post(`${apiRoutes.appUsers}/${id}/revoke-sessions`),
    "Failed to sign member out",
);

export const reqToDeleteOrgUser = memberMutation(
    "orgUsers/reqToDeleteOrgUser",
    ({ id, reassignToUserId }) =>
        Axios.delete(`${apiRoutes.appUsers}/${id}`, {
            data: reassignToUserId ? { reassign_to_user_id: reassignToUserId } : {},
        }),
    "Failed to remove member",
);

export const reqToTransferOwnership = memberMutation(
    "orgUsers/reqToTransferOwnership",
    ({ targetUserId, demoteSelfToRoleId }) =>
        Axios.post(apiRoutes.ownershipTransfer, {
            target_user_id: targetUserId,
            ...(demoteSelfToRoleId ? { demote_self_to_role_id: demoteSelfToRoleId } : {}),
        }),
    "Failed to transfer ownership",
);

export const reqToGetMemberOptions = createAsyncThunk<any, any, RejectValue>(
    "orgUsers/reqToGetMemberOptions",
    async ({ onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.memberOptions);

            onSuccess?.(response.data);

            return (response.data?.data ?? []).map(mapMemberOptionFromApi);
        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue(toTeamApiError(error, "Failed to load teammates"));
        }
    }
);

const mutations = [
    reqToUpdateOrgUser,
    reqToSuspendOrgUser,
    reqToReactivateOrgUser,
    reqToRevokeOrgUserSessions,
    reqToDeleteOrgUser,
    reqToTransferOwnership,
];

const orgUsersSlice = createSlice({
    name: "orgUsers",
    initialState,
    reducers: {
        clearActiveMember: (state) => {
            state.activeMember = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(reqToGetOrgUsers.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetOrgUsers.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.users = action.payload.users;
            state.pagination = action.payload.pagination;
            state.summary = action.payload.summary;
        });
        builder.addCase(reqToGetOrgUsers.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });

        builder.addCase(reqToGetOrgUser.pending, (state) => {
            state.activeMemberLoading = true;
        });
        builder.addCase(reqToGetOrgUser.fulfilled, (state, action) => {
            state.activeMemberLoading = false;
            state.activeMember = action.payload;
        });
        builder.addCase(reqToGetOrgUser.rejected, (state) => {
            state.activeMemberLoading = false;
            state.activeMember = null;
        });

        // `error` describes the list load only; a refused action is reported
        // by the dialog that ran it.
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

        builder.addCase(reqToGetMemberOptions.pending, (state) => {
            state.memberOptionsLoading = true;
        });
        builder.addCase(reqToGetMemberOptions.fulfilled, (state, action) => {
            state.memberOptionsLoading = false;
            state.memberOptions = action.payload;
        });
        builder.addCase(reqToGetMemberOptions.rejected, (state) => {
            state.memberOptionsLoading = false;
        });
    }
});

export const { clearActiveMember } = orgUsersSlice.actions;
export default orgUsersSlice.reducer;
