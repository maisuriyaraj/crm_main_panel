import { useCallback } from "react";
import axios from "axios";

import { endSession } from "@/lib/auth/session";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToRefreshProfile } from "@/lib/store/slices/authSlice";
import { toTeamApiError } from "@/lib/team/mappers";
import type { TeamApiError } from "@/lib/team/types";

// Shared reaction to a failed Team request. Returns the normalized error so
// the caller can show it inline, or null when it was fully handled here.
export function useTeamFailure() {
  const dispatch = useAppDispatch();

  return useCallback(
    (error: unknown, fallback: string): TeamApiError | null => {
      // The session ended while the request was in flight; nothing to show.
      if (axios.isCancel(error)) return null;

      const apiError = toTeamApiError(error, fallback);

      // Suspended or removed since this page loaded.
      if (apiError.code === "MEMBERSHIP_INACTIVE") {
        void endSession();
        return null;
      }

      // The caller's role changed under them: re-read permissions so menus
      // stop offering what the API now refuses.
      if (apiError.code === "FORBIDDEN") {
        dispatch(reqToRefreshProfile({ data: null }));
        notify("Your permissions changed. The page has been updated.", { type: "info" });
        return null;
      }

      return apiError;
    },
    [dispatch],
  );
}
