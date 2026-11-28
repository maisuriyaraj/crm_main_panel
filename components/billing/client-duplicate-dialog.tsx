"use client";

import { ArrowRight } from "lucide-react";

import type { ClientErrorTarget } from "@/lib/clients/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The 409 CLIENT_ALREADY_EXISTS warning (SRS 7.7).
//
// Deliberately unlike the lead duplicate dialog, which offers "Add it anyway":
// there is no override here, because two client records for one company means
// two sets of invoices and two balances. The only way forward is to open the
// client that already exists, so that is the one action this offers.
export function ClientDuplicateDialog({
  client,
  matchedOn,
  open,
  onOpenChange,
  onOpenClient,
}: {
  client: ClientErrorTarget | null;
  // "email", "phone", or both.
  matchedOn: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenClient: (clientId: string) => void;
}) {
  const field = matchedOn.includes("email")
    ? "email address"
    : matchedOn.includes("phone")
      ? "phone number"
      : "email address or phone number";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>You already have this client</DialogTitle>
          <DialogDescription>
            Another active client uses the same {field}, so this one wasn&apos;t added. Billing the same company twice
            would split their invoices and their balance across two records.
          </DialogDescription>
        </DialogHeader>

        {client && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{client.companyName}</p>
            {client.email && <p className="text-muted-foreground">{client.email}</p>}
            {client.phone && <p className="text-muted-foreground">{client.phone}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          {client && (
            <Button onClick={() => onOpenClient(client.id)}>
              Open {client.companyName} <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
