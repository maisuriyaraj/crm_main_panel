"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, Copy } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import type { InvitationDelivery } from "@/lib/team/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The raw link only exists in this response (the server keeps a hash), so this
// is the one chance to copy it.
export function InviteLinkView({ result }: { result: InvitationDelivery }) {
  const [copied, setCopied] = useState(false);
  const { invitation, delivery, inviteUrl } = result;

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      notify("Invite link copied.", { type: "success" });
    } catch {
      notify("Couldn't copy automatically. Select the link and copy it.", { type: "error" });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {delivery === "failed"
          ? `We couldn't email ${invitation.email}. Copy this link and send it to them yourself, or try Resend later.`
          : `Email delivery isn't set up yet. Copy this link and send it to ${invitation.email}.`}
      </p>
      <div className="flex gap-2">
        <Input readOnly value={inviteUrl ?? ""} onFocus={(event) => event.target.select()} aria-label="Invite link" />
        <Button type="button" variant="outline" onClick={copy} disabled={!inviteUrl}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {invitation.expiresAt && (
        <p className="text-xs text-muted-foreground">
          This link is shown once and expires on {format(new Date(invitation.expiresAt), "PPp")}.
        </p>
      )}
    </div>
  );
}

// Standalone dialog for links produced by Resend.
export function InviteLinkDialog({
  result,
  onClose,
}: {
  result: InvitationDelivery | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New invite link</DialogTitle>
          <DialogDescription>The previous link for this invitation no longer works.</DialogDescription>
        </DialogHeader>
        {result && <InviteLinkView result={result} />}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
