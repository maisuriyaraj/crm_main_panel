import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";

const initialState: unknown = {
    error: null,
    isLoading: false,
};


export const reqToBookADemo = createAsyncThunk<
    any,
    any,
    { rejectValue: { message: string } }
>(
    "publicSlice/reqToBookADemo",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post(apiRoutes.bookDemo, data);

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


const publicAPis = createSlice({
    name: "publicSlice",
    initialState,
    reducers: {
        },
    extraReducers: (builder) => {
        builder.addCase(reqToBookADemo.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(reqToBookADemo.fulfilled, (state, action) => {
            state.isLoading = false;
            state.error = null;
        });
        builder.addCase(reqToBookADemo.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || "An error occurred";
        });
    }
});

// export const {  } = publicAPis.actions;
export default publicAPis.reducer;
