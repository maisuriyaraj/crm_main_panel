"use client";

import { useState } from "react";
import { ArrowUpCircle } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToRequestUpgrade } from "@/lib/store/slices/billingSlice";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// A plan is changed by OrbitOps, not from here, so this sends a message rather
// than making a change. Once it is sent the dialog stays open and says so, so
// nobody sends the same request twice: the API allows one an hour per workspace.
export function UpgradeRequestDialog({
  planName,
  variant = "default",
  label = "Request an upgrade",
}: {
  planName?: string | null;
  variant?: "default" | "outline";
  label?: string;
}) {
  const dispatch = useAppDispatch();
  const isSending = useAppSelector((state) => state.billing.isRequestingUpgrade);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  // The API's own sentence: it says whether the email went out as well, which
  // only OrbitOps can fix, so it is shown rather than reworded here.
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = (next: boolean) => {
    setOpen(next);
    if (next) return;
    // Reopening starts clean, but a sent request is not offered again in the
    // same visit: the next one would only be refused for an hour anyway.
    setError(null);
    if (sent) setMessage("");
  };

  const send = async () => {
    setError(null);
    const trimmed = message.trim();
    const action = await dispatch(reqToRequestUpgrade({
      data: { message: trimmed ? trimmed : null },
      onFailure: (failure) => setError(apiErrorMessage(failure, "Couldn't send your request. Please try again.")),
    }));
    if (reqToRequestUpgrade.fulfilled.match(action)) {
      setSent(true);
      setConfirmation(action.payload.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <ArrowUpCircle className="size-4" aria-hidden /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sent ? "Request sent" : "Ask about a different plan"}</DialogTitle>
          <DialogDescription>
            {sent
              ? "Our team will be in touch."
              : `Tell us what you need and the OrbitOps team will get back to you.${planName ? ` You're on ${planName} today.` : ""}`}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <Alert>
            <AlertDescription>
              Our team will be in touch. {confirmation} You can send another request in an hour if you need to add
              anything.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="upgrade-message">
              Message <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="upgrade-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="For example: we need more seats and a higher lead limit."
            />
            <p className="text-xs text-muted-foreground">
              We already know your workspace, your current plan and who is asking, so a message is only if you want to add
              something. {1000 - message.length} characters left.
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {sent ? (
            <Button onClick={() => close(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={send} disabled={isSending}>
                {isSending ? "Sending…" : "Send request"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
