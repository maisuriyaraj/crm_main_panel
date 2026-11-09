import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";

// The first-login setup wizard, for members who may manage the organization's
// settings. Every save answers the whole state, so the screen moves on from it.

export type OnboardingStepKey = "company" | "logo" | "locale" | "invite_team" | "ad_accounts";
export type OnboardingStepStatus = "pending" | "done" | "skipped" | "not_available";

export interface OnboardingCompany {
    legal_name: string | null;
    display_name: string | null;
    address: {
        line1: string | null;
        line2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
    };
    phone: string | null;
    website: string | null;
    industry: string | null;
}

export interface OnboardingState {
    completed: boolean;
    completed_at: string | null;
    current_step: OnboardingStepKey | null;
    steps: Array<{ key: OnboardingStepKey; status: OnboardingStepStatus; at: string | null; reason?: string }>;
    values: {
        company: OnboardingCompany;
        logo: { has_logo: boolean; path: string | null; mime: string | null; bytes: number; updated_at: string | null };
        locale: { currency: string | null; timezone: string | null; allowed_currencies: string[]; billing_currency: string | null };
        invite_team: { invitations_sent: number; seats_used: number; seats_limit: number | null };
        ad_accounts: { available: boolean; reason: string };
    };
}

export type CompanyInput = {
    legal_name: string;
    display_name: string;
    address: { line1: string; line2?: string; city: string; state?: string; postal_code?: string; country: string } | null;
    phone?: string;
    website?: string;
    industry?: string;
};

interface OnboardingSliceState {
    state: OnboardingState | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
}

const initialState: OnboardingSliceState = {
    state: null,
    isLoading: false,
    isSaving: false,
    error: null,
};

type ThunkArg<D> = { data: D; onSuccess?: (result: OnboardingState) => void; onFailure?: (error: unknown) => void };
type Rejection = { rejectValue: { message: string } };

const rejectMessage = (error: unknown, fallback: string) => ({
    message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback,
});

const onboardingThunk = <D>(type: string, request: (data: D) => Promise<{ data: { data: OnboardingState } }>, fallback: string) =>
    createAsyncThunk<OnboardingState, ThunkArg<D>, Rejection>(type, async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await request(data);
            const result = response.data.data;
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, fallback));
        }
    });

export const reqToGetOnboarding = onboardingThunk<null>(
    "onboarding/reqToGetOnboarding",
    () => Axios.get(apiRoutes.onboarding),
    "Couldn't load your setup",
);

export const reqToSaveOnboardingCompany = onboardingThunk<CompanyInput>(
    "onboarding/reqToSaveOnboardingCompany",
    (data) => Axios.put(apiRoutes.onboardingCompany, data),
    "Couldn't save the company details",
);

export const reqToSaveOnboardingLocale = onboardingThunk<{ currency: string; timezone: string }>(
    "onboarding/reqToSaveOnboardingLocale",
    (data) => Axios.put(apiRoutes.onboardingLocale, data),
    "Couldn't save the currency and time zone",
);

export const reqToUploadOnboardingLogo = onboardingThunk<{ file: File }>(
    "onboarding/reqToUploadOnboardingLogo",
    ({ file }) => {
        const body = new FormData();
        body.append("file", file, file.name);
        return Axios.post(apiRoutes.onboardingLogo, body);
    },
    "Couldn't upload the logo",
);

export const reqToSkipOnboardingStep = onboardingThunk<{ step: OnboardingStepKey }>(
    "onboarding/reqToSkipOnboardingStep",
    ({ step }) => Axios.post(`${apiRoutes.onboarding}/steps/${step}/skip`, {}),
    "Couldn't skip this step",
);

export const reqToCompleteOnboarding = onboardingThunk<null>(
    "onboarding/reqToCompleteOnboarding",
    () => Axios.post(apiRoutes.onboardingComplete, {}),
    "Couldn't finish the setup",
);

const saves = [
    reqToSaveOnboardingCompany,
    reqToSaveOnboardingLocale,
    reqToUploadOnboardingLogo,
    reqToSkipOnboardingStep,
    reqToCompleteOnboarding,
];

const onboardingSlice = createSlice({
    name: "onboarding",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetOnboarding.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetOnboarding.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
            state.state = action.payload;
        });
        builder.addCase(reqToGetOnboarding.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
        saves.forEach((thunk) => {
            builder.addCase(thunk.pending, (state) => {
                state.isSaving = true;
                state.error = null;
            });
            builder.addCase(thunk.fulfilled, (state, action) => {
                state.isSaving = false;
                state.error = null;
                state.state = action.payload;
            });
            builder.addCase(thunk.rejected, (state, action) => {
                state.isSaving = false;
                state.error = action.payload?.message || "An error occurred";
            });
        });
    },
});

export default onboardingSlice.reducer;
