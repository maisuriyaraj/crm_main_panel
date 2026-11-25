import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { asDateFormat } from "@/lib/dates";
import type { CompanyInput, LocaleInput, OnboardingCompany, OnboardingLocale, OnboardingState } from "./onboardingSlice";

// Settings > Company. The API behind this is the setup wizard's own: the same
// routes' sibling paths, the same validation and the same columns, so a change
// made here and one made during setup are the same change. The difference is only
// that these answer the three sections without the wizard's progress.

export interface OrgLogo {
    has_logo: boolean;
    path: string | null;
    mime: string | null;
    bytes: number;
    updated_at: string | null;
}

export interface OrgSettings {
    company: OnboardingCompany;
    logo: OrgLogo;
    locale: OnboardingLocale;
}

interface OrgSettingsState {
    settings: OrgSettings | null;
    isLoaded: boolean;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
}

const initialState: OrgSettingsState = {
    settings: null,
    isLoaded: false,
    isLoading: false,
    isSaving: false,
    error: null,
};

// The date format decides how every screen reads a date, so an unknown value from
// an older API must never reach the formatters.
const mapSettings = (body: Partial<OrgSettings> & { locale?: Partial<OnboardingLocale> }): OrgSettings => ({
    company: body.company as OnboardingCompany,
    logo: body.logo as OrgLogo,
    locale: {
        ...(body.locale as OnboardingLocale),
        date_format: asDateFormat(body.locale?.date_format),
        allowed_date_formats: (body.locale?.allowed_date_formats ?? []).map(asDateFormat),
    },
});

type ThunkArg<D> = { data: D; onSuccess?: (result: OrgSettings) => void; onFailure?: (error: unknown) => void };
type Rejection = { rejectValue: { message: string } };

const rejectMessage = (error: unknown, fallback: string) => ({
    message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback,
});

const settingsThunk = <D>(
    type: string,
    request: (data: D) => Promise<{ data: { data: OrgSettings | OnboardingState } }>,
    fallback: string,
) =>
    createAsyncThunk<OrgSettings, ThunkArg<D>, Rejection>(type, async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await request(data);
            const body = response.data.data as Record<string, unknown>;
            // The save routes answer the wizard's whole state; the sections sit
            // under `values` there and at the top level on the settings read.
            const sections = (body.values ?? body) as Partial<OrgSettings>;
            const result = mapSettings(sections);
            onSuccess?.(result);
            return result;
        } catch (error) {
            onFailure?.(error);
            return rejectWithValue(rejectMessage(error, fallback));
        }
    });

export const reqToGetOrgSettings = settingsThunk<null>(
    "orgSettings/reqToGetOrgSettings",
    () => Axios.get(apiRoutes.settings),
    "Couldn't load your company settings",
);

export const reqToSaveCompanySettings = settingsThunk<CompanyInput>(
    "orgSettings/reqToSaveCompanySettings",
    (data) => Axios.put(apiRoutes.settingsCompany, data),
    "Couldn't save the company details",
);

export const reqToSaveLocaleSettings = settingsThunk<LocaleInput>(
    "orgSettings/reqToSaveLocaleSettings",
    (data) => Axios.put(apiRoutes.settingsLocale, data),
    "Couldn't save the currency, time zone and date format",
);

export const reqToUploadOrgLogo = settingsThunk<{ file: File }>(
    "orgSettings/reqToUploadOrgLogo",
    ({ file }) => {
        const body = new FormData();
        body.append("file", file, file.name);
        return Axios.post(apiRoutes.settingsLogo, body);
    },
    "Couldn't upload the logo",
);

const saves = [reqToSaveCompanySettings, reqToSaveLocaleSettings, reqToUploadOrgLogo];

const orgSettingsSlice = createSlice({
    name: "orgSettings",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(reqToGetOrgSettings.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetOrgSettings.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isLoaded = true;
            state.error = null;
            state.settings = action.payload;
        });
        builder.addCase(reqToGetOrgSettings.rejected, (state, action) => {
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
                state.isLoaded = true;
                state.error = null;
                state.settings = action.payload;
            });
            builder.addCase(thunk.rejected, (state, action) => {
                state.isSaving = false;
                state.error = action.payload?.message || "An error occurred";
            });
        });
    },
});

export default orgSettingsSlice.reducer;
