import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { mapNotificationFromApi } from "@/lib/usage/mappers";
import type { AppNotification } from "@/lib/usage/types";
import type { ThunkArg } from "./leadAttachmentsSlice";

// The signed-in member's own bell. The API only ever returns rows addressed to them.
interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoaded: false,
  isLoading: false,
  error: null,
};

const messageOf = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message) || fallback;

type NotificationList = { items: AppNotification[]; unreadCount: number };

export const reqToGetNotifications = createAsyncThunk<NotificationList, Partial<ThunkArg<{ limit?: number } | null, NotificationList>>, { rejectValue: { message: string } }>(
  "notifications/reqToGetNotifications",
  async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.notifications, { params: { limit: data?.limit ?? 20 } });
      const result = {
        items: (response.data?.data ?? []).map(mapNotificationFromApi),
        unreadCount: Number(response.data?.unread_count ?? 0),
      };
      onSuccess?.(result);
      return result;
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Couldn't load notifications") });
    }
  }
);

export const reqToMarkNotificationRead = createAsyncThunk<AppNotification, ThunkArg<{ id: string }, AppNotification>, { rejectValue: { message: string } }>(
  "notifications/reqToMarkNotificationRead",
  async ({ data, onSuccess, onFailure }, { rejectWithValue }) => {
    try {
      const response = await Axios.post(`${apiRoutes.notifications}/${encodeURIComponent(data.id)}/read`, {});
      const notification = mapNotificationFromApi(response.data?.data);
      onSuccess?.(notification);
      return notification;
    } catch (error) {
      onFailure?.(error);
      return rejectWithValue({ message: messageOf(error, "Couldn't mark the notification as read") });
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(reqToGetNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reqToGetNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.items = action.payload.items;
        state.unreadCount = action.payload.unreadCount;
        state.isLoaded = true;
      })
      .addCase(reqToGetNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message ?? "Couldn't load notifications";
      })
      .addCase(reqToMarkNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find((entry) => entry.id === action.payload.id);
        if (item && !item.readAt) {
          item.readAt = action.payload.readAt;
          state.unreadCount = Math.max(state.unreadCount - 1, 0);
        }
      });
  },
});

export default notificationsSlice.reducer;
