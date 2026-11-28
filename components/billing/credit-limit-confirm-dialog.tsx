"use client";

import { useState } from "react";

import { creditLimitCheck, type CreditLimited } from "@/lib/clients/credit-limit";
import { CreditLimitWarning } from "@/components/billing/credit-limit-warning";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// SRS 7.7, BI-CL3: the step that lets someone go ahead anyway.
//
// The SRS asks for a **warning**, not a block, so this is a confirm and never a
// refusal: "Raise it anyway" is always available. Blocking would stop a tenant
// invoicing a good customer because somebody set a limit a year ago and forgot
// it — which is the server's reasoning too, written into its own rule.
//
// **Nothing opens this yet.** It is the drop-in for the invoice form (SRS 7.3),
// which does not exist: on save, that form calls `wouldExceedCreditLimit`, and
// opens this instead of submitting when it comes back true. Built now so the
// wording, the workings and the "you may continue" promise are settled in one
// place rather than invented again inside the invoice form.
export function CreditLimitConfirmDialog({
  client,
  clientName,
  currency,
  newInvoiceTotalMinor,
  currentOutstandingMinor,
  open,
  onOpenChange,
  onConfirm,
  // What the button that goes ahead says. An invoice form saving a draft and
  // one sending an invoice are different promises, so the caller names it.
  confirmLabel = "Raise it anyway",
}: {
  client: CreditLimited | null | undefined;
  clientName: string;
  currency: string;
  newInvoiceTotalMinor: number | null;
  currentOutstandingMinor: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // May be async: the dialog stays open and the button shows it is working
  // until it settles, so the invoice is never submitted twice.
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
}) {
  const [working, setWorking] = useState(false);
  const check = creditLimitCheck(client, newInvoiceTotalMinor, currentOutstandingMinor);

  const handleConfirm = async () => {
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {check.payUpFront ? `${clientName} is meant to pay up front` : `${clientName} would go over their credit limit`}
          </DialogTitle>
          <DialogDescription>
            This is a warning, not a block. Check the figures and decide — nothing has been saved yet.
          </DialogDescription>
        </DialogHeader>

        <CreditLimitWarning
          client={client}
          clientName={clientName}
          currency={currency}
          newInvoiceTotalMinor={newInvoiceTotalMinor}
          currentOutstandingMinor={currentOutstandingMinor}
          showWhenWithin
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={working}>
            Go back
          </Button>
          <Button onClick={handleConfirm} disabled={working}>
            {working ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
