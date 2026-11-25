"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_REASON = 500;

export interface StageReasonRequest {
  leadId: string;
  leadName: string;
  statusId: string;
  stageName: string;
  // Set when the API refused a move that was already tried, so the prompt can
  // say why it is asking a second time.
  refused?: boolean;
}

interface StageReasonDialogProps {
  request: StageReasonRequest | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

// Some stages are not entered silently: the organization has marked them
// "require a reason", and the API refuses the move without one. Asking here,
// before the request goes out, keeps the member from losing the drag they just
// made to an error toast.
export function StageReasonDialog({ request, onCancel, onConfirm }: StageReasonDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (request) setReason("");
  }, [request]);

  const trimmed = reason.trim();
  const tooLong = trimmed.length > MAX_REASON;
  const canSubmit = trimmed.length > 0 && !tooLong;

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Why is this moving to {request?.stageName}?</DialogTitle>
          <DialogDescription>
            {request?.refused
              ? `This stage needs a reason before a lead can move into it. Add one to move ${request?.leadName}.`
              : `Your team requires a reason for this stage. It is saved to ${request?.leadName}'s timeline.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="stage-reason">Reason</Label>
          <Textarea
            id="stage-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Budget moved to next quarter"
            rows={3}
            autoFocus
          />
          <p className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {trimmed.length}/{MAX_REASON} characters
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={() => onConfirm(trimmed)}>
            Move lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
