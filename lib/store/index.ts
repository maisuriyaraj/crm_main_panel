import { combineReducers, configureStore, type UnknownAction } from "@reduxjs/toolkit";
import pricingPlansReducer from "./slices/pricingPlansSlice";
import publicAPisReducer from "./slices/publicAPisSlice";
import authReducer, { sessionEnded } from "./slices/authSlice";
import orgUsersReducer from "./slices/orgUsersSlice";
import leadsReducer from "./slices/leadsSlice";
import contactsReducer from "./slices/contactsSlice";
import teamInvitationsReducer from "./slices/teamInvitationsSlice";
import teamRolesReducer from "./slices/teamRolesSlice";
import teamAuditReducer from "./slices/teamAuditSlice";
import { onSessionEnded } from "@/lib/auth/session";

// Import additional slice reducers here as the project grows

const appReducer = combineReducers({
  pricing: pricingPlansReducer,
  publicData: publicAPisReducer,
  auth: authReducer,
  orgUsers: orgUsersReducer,
  leads: leadsReducer,
  contacts: contactsReducer,
  teamInvitations: teamInvitationsReducer,
  teamRoles: teamRolesReducer,
  teamAudit: teamAuditReducer,
  // Add more reducers here as you create new slices
});

// Ending the session drops every slice back to its initial state, so no
// leads/contacts/users of the previous session linger in memory.
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: UnknownAction) =>
  appReducer(sessionEnded.match(action) ? undefined : state, action);

export const store = configureStore({
  reducer: rootReducer,
});

onSessionEnded(() => store.dispatch(sessionEnded()));

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
