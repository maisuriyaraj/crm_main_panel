import { configureStore } from "@reduxjs/toolkit";
import pricingPlansReducer from "./slices/pricingPlansSlice";
// Import additional slice reducers here as the project grows

export const store = configureStore({
  reducer: {
    pricing: pricingPlansReducer,
    // Add more reducers here as you create new slices
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
