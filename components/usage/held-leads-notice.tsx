"use client";

import { Inbox } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUsage } from "@/hooks/useUsage";
import { formatCount } from "@/lib/usage/mappers";

const dateText = (value: string | null) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null);

// For admins only (the API decides who is one): leads from integrations that
// arrived at the lead limit are kept and added later, never lost.
export function HeldLeadsNotice() {
  const { summary, heldLeads } = useUsage({ withHeldLeads: true });
  if (!summary?.isAdmin || !heldLeads || heldLeads.held <= 0) return null;

  const count = heldLeads.held;
  const since = dateText(heldLeads.oldestAt);

  return (
    <Alert variant="warning">
      <Inbox className="size-4" aria-hidden />
      <AlertTitle>
        {formatCount(count)} lead{count === 1 ? "" : "s"} from your integrations {count === 1 ? "is" : "are"} waiting
      </AlertTitle>
      <AlertDescription>
        {count === 1 ? "It is" : "They are"} waiting because the lead limit is reached; {count === 1 ? "it" : "they"} will be added
        automatically when there is room{since ? ` (oldest since ${since})` : ""}. {summary.upgradeMessage}
        {heldLeads.tooOldToRelease > 0 &&
          ` ${formatCount(heldLeads.tooOldToRelease)} waited more than ${heldLeads.releaseMaxAgeDays} days and will not be added on their own.`}
      </AlertDescription>
    </Alert>
  );
}
