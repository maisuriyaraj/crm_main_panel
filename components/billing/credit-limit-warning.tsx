"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";

import {
  creditLimitCheck,
  creditLimitWording,
  type CreditLimited,
} from "@/lib/clients/credit-limit";
import { formatMinor } from "@/lib/clients/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// SRS 7.7, BI-CL3: the credit-limit warning itself.
//
// One component for every place the limit is mentioned, so the inline warning
// on an invoice form, the confirm dialog behind it and the client page cannot
// word the same situation three ways. It renders nothing at all for a client
// with no limit, so a caller can drop it in without checking first.
//
// **Where it is used today:** the client page, in the state where the limit is
// known but what they owe is not. **Where it belongs next:** the invoice form
// (SRS 7.3), which passes the invoice's running total and the client's
// outstanding balance and gets the real warning. That form does not exist yet,
// so the over-limit state has never been shown to anyone — it is written and
// waiting, the same way the server's own rule is.
export function CreditLimitWarning({
  client,
  clientName,
  currency,
  // The invoice being raised, in minor units. On an **edit**, pass the
  // difference the edit makes, not the whole total, or the invoice counts twice.
  newInvoiceTotalMinor = 0,
  // What the client already owes, in minor units. **Null means nobody knows**,
  // which is the case until the invoice feature exists: the component then says
  // what the limit is and that it has not been checked, instead of implying the
  // invoice is fine.
  currentOutstandingMinor = null,
  // Whether to say anything when the invoice is comfortably inside the limit.
  // Off by default: a form that reassures on every keystroke is noise, and the
  // warning is what BI-CL3 asks for.
  showWhenWithin = false,
  className,
}: {
  client: CreditLimited | null | undefined;
  clientName: string;
  currency: string;
  newInvoiceTotalMinor?: number | null;
  currentOutstandingMinor?: number | null;
  showWhenWithin?: boolean;
  className?: string;
}) {
  const check = creditLimitCheck(client, newInvoiceTotalMinor, currentOutstandingMinor);
  const wording = creditLimitWording(check, currency, clientName);

  // No limit set: there is nothing to warn about, so nothing is shown.
  if (!wording) return null;
  if (check.exceeds === false && !showWhenWithin) return null;

  const over = check.exceeds === true;
  const unknown = check.exceeds === null;
  const Icon = over ? CircleAlert : unknown ? Info : CircleCheck;

  return (
    <Alert
      // `warning`, deliberately not `destructive`: going over a credit limit is
      // a business decision the person is allowed to make, not an error. Red
      // would read as "this failed", and the invoice has not failed.
      variant={over ? "warning" : "default"}
      className={className}
    >
      <Icon className="size-4" aria-hidden />
      <AlertTitle>{wording.title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{wording.body}</p>

        {/* The workings, so nobody has to take the sentence on trust. Only
            shown once the figures are actually known. */}
        {!unknown && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-4">
            <Figure label="Already owed" value={formatMinor(check.outstandingMinor, currency)} />
            <Figure label="This invoice" value={formatMinor(newInvoiceTotalMinor ?? 0, currency)} />
            <Figure label="Would owe" value={formatMinor(check.afterMinor, currency)} />
            <Figure
              label={over ? "Over by" : "Credit left"}
              value={formatMinor(over ? check.overByMinor : check.availableMinor, currency)}
            />
          </dl>
        )}
      </AlertDescription>
    </Alert>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
