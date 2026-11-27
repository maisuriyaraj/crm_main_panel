"use client";

import { AlertTriangle } from "lucide-react";

import { leadDisplayName, type DuplicateLeadResult } from "@/lib/leads/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// What the member sees when the lead they are adding matches one that already
// exists (LD-A1). The two ways out of it are the SRS's own: open the match, or
// add this one anyway.
//
// A match the member's role does not let them see is reported only as existing.
// The API deliberately sends no name, owner or id for it, so there is nothing
// to open and nothing to show — which is why "add it anyway" is the only way
// forward in that case.

interface DuplicateLeadDialogProps {
  result: DuplicateLeadResult | null;
  onOpenChange: (open: boolean) => void;
  onOpenLead: (leadId: string) => void;
  onCreateAnyway: () => void;
}

const matchedOnLabel = (matchedOn: ("email" | "mobile")[]): string => {
  if (matchedOn.length === 2) return "Same email and mobile";
  if (matchedOn[0] === "email") return "Same email";
  if (matchedOn[0] === "mobile") return "Same mobile";
  return "Matching lead";
};

export function DuplicateLeadDialog({
  result,
  onOpenChange,
  onOpenLead,
  onCreateAnyway,
}: DuplicateLeadDialogProps) {
  if (!result) return null;

  const { matches, hasHiddenMatches } = result;
  const hiddenCount = Math.max(result.total - matches.length, 0);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            This lead may already exist
          </DialogTitle>
          <DialogDescription>
            {matches.length > 0
              ? "The email address or mobile number you entered is already on a lead. Open the existing one, or add this lead anyway."
              : "The email address or mobile number you entered is already on a lead."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{leadDisplayName(match)}</span>
                <Badge variant="outline" className="text-xs">
                  {matchedOnLabel(match.matchedOn)}
                </Badge>
                {match.stageName && (
                  <Badge variant="secondary" className="text-xs">
                    {match.stageName}
                  </Badge>
                )}
              </div>

              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {match.companyName && <p>{match.companyName}</p>}
                {match.email && <p>{match.email}</p>}
                {match.mobile && <p>{match.mobile}</p>}
                <p>Owner: {match.ownerName ?? "Unassigned"}</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onOpenLead(match.id)}
              >
                Open it
              </Button>
            </div>
          ))}

          {hasHiddenMatches && (
            <Alert>
              <AlertTitle>
                {hiddenCount > 0
                  ? `${hiddenCount} matching lead${hiddenCount === 1 ? "" : "s"} you cannot see`
                  : "A matching lead you cannot see"}
              </AlertTitle>
              <AlertDescription>
                Someone else in your organization already has a lead with these details, and your role does not let you
                open it. Ask a manager before adding this one.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
          <Button onClick={onCreateAnyway}>Add it anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
