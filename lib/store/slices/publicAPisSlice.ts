import axios from "axios";
import { Axios } from "@/lib/axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRoutes } from "@/lib/constants";
import type { Availability, BookingAck, BookingApiError, BookingRequest } from "@/lib/types/booking";

interface PublicState {
    error: string | null;
    isLoading: boolean;
}

const initialState: PublicState = {
    error: null,
    isLoading: false,
};

const toBookingError = (error: unknown, fallback: string): BookingApiError => {
    if (axios.isAxiosError(error)) {
        const body = (error.response?.data ?? {}) as Partial<BookingApiError>;
        return { message: body.message || fallback, status: error.response?.status, code: body.code, errors: body.errors };
    }
    return { message: fallback };
};

interface ThunkArg<D, R> {
    data: D;
    onSuccess?: (result: R) => void;
    onFailure?: (error: BookingApiError) => void;
}

export const reqToCreateBooking = createAsyncThunk<BookingAck, ThunkArg<BookingRequest, BookingAck>, { rejectValue: BookingApiError }>(
    "publicSlice/reqToCreateBooking",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.post<{ data: BookingAck }>(apiRoutes.publicBookings, data);
            onSuccess?.(response.data.data);
            return response.data.data;
        } catch (error) {
            const apiError = toBookingError(error, "Couldn't book your demo. Please try again.");
            onFailure?.(apiError);
            return rejectWithValue(apiError);
        }
    }
);

export const reqBookingAvailability = createAsyncThunk<
    Availability,
    ThunkArg<{ from: string; to: string; timezone: string }, Availability>,
    { rejectValue: BookingApiError }
>(
    "publicSlice/reqBookingAvailability",
    async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
        try {
            const response = await Axios.get<{ data: Availability }>(apiRoutes.bookingAvailability, { params: data });
            onSuccess?.(response.data.data);
            return response.data.data;
        } catch (error) {
            const apiError = toBookingError(error, "Couldn't load available times.");
            onFailure?.(apiError);
            return rejectWithValue(apiError);
        }
    }
);

const publicAPis = createSlice({
    name: "publicSlice",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        for (const thunk of [reqToCreateBooking]) {
            builder.addCase(thunk.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            });
            builder.addCase(thunk.fulfilled, (state) => {
                state.isLoading = false;
                state.error = null;
            });
            builder.addCase(thunk.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload?.message || "An error occurred";
            });
        }
    }
});

export default publicAPis.reducer;
