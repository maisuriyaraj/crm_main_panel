import { configureStore } from "@reduxjs/toolkit";
import pricingPlansReducer from "./slices/pricingPlansSlice";
import publicAPisReducer from "./slices/publicAPisSlice";
import authReducer from "./slices/authSlice";
import orgUsersReducer from "./slices/orgUsersSlice";

// Import additional slice reducers here as the project grows

export const store = configureStore({
  reducer: {
    pricing: pricingPlansReducer,
    publicData: publicAPisReducer,
    auth: authReducer,
    orgUsers: orgUsersReducer,
    // Add more reducers here as you create new slices
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
