import { useCallback, useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetHeldLeads, reqToGetUsage } from "@/lib/store/slices/usageSlice";

// The organization's usage, loaded once and shared by the banner, the Plan &
// usage page, Leads and Team. `refresh` re-reads it after a create or a refusal.
// Held leads are read only when the API says the caller is an admin, since it
// refuses them to anyone else.
export function useUsage({ withHeldLeads = false }: { withHeldLeads?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const { summary, heldLeads, isLoaded, isLoading, error } = useAppSelector((state) => state.usage);
  const isAdmin = summary?.isAdmin === true;

  const refresh = useCallback(() => {
    dispatch(reqToGetUsage({}));
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded && !isLoading && !error) dispatch(reqToGetUsage({}));
  }, [dispatch, isLoaded, isLoading, error]);

  useEffect(() => {
    if (withHeldLeads && isAdmin) dispatch(reqToGetHeldLeads({}));
  }, [dispatch, withHeldLeads, isAdmin]);

  return { summary, heldLeads, isLoaded, isLoading, error, refresh };
}
