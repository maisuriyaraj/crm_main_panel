import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";

const initialState: unknown = {
    error: null,
    isLoading: false,
    pricingPlans: [],
};


export const reqToGetPricingPlans = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "pricingPlans/reqToGetPricingPlans",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get(apiRoutes.getPricingPlans);

            onSuccess?.(response.data);

            return response.data;

        } catch (error: any) {
            onFailure?.(error);

            return rejectWithValue({
                message: error?.response?.data?.message || "Login failed",
            });
        }
    }
);


const pricingPlansSlice = createSlice({
    name: "pricingPlans",
    initialState,
    reducers: {
        setPricingPlans: (state, action: PayloadAction<any[]>) => {
            state.pricingPlans = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(reqToGetPricingPlans.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToGetPricingPlans.fulfilled, (state, action) => {
            if (action.payload && Array.isArray(action.payload?.data)) {
                state.pricingPlans = action.payload?.data || [];
            }
            state.isLoading = false;
            state.error = null;
        });
        builder.addCase(reqToGetPricingPlans.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
    }
});

export const { setPricingPlans, setError } = pricingPlansSlice.actions;
export default pricingPlansSlice.reducer;
