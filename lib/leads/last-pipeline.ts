// Which board the member was last looking at, so returning to Leads opens the
// same one instead of jumping back to the organization's default. Kept per
// member, because two people sharing a browser work different boards.
//
// This is a convenience only: the id is checked against the pipelines the API
// returns before it is used, so a removed or renamed board falls back to the
// default rather than showing an empty screen.

import { handleLocalStorageActions } from "@/lib/commonFunctions";

const keyFor = (userId: string) => `orbitops.leads.pipeline.${userId}`;

export const readLastPipeline = (userId?: string): string | null => {
  if (!userId || typeof window === "undefined") return null;
  try {
    const stored = handleLocalStorageActions("get", keyFor(userId));
    return typeof stored === "string" && stored ? stored : null;
  } catch {
    // Private browsing and storage-blocking extensions both throw here; the
    // default pipeline is a fine answer.
    return null;
  }
};

export const writeLastPipeline = (userId: string | undefined, pipelineId: string) => {
  if (!userId || typeof window === "undefined") return;
  try {
    handleLocalStorageActions("set", keyFor(userId), pipelineId);
  } catch {
    // Nothing to do: the board still works, it just will not be remembered.
  }
};
