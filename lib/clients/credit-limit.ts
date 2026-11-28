// SRS 7.7, BI-CL3: "Warn when a new invoice takes the client over its credit limit."
//
// This is the panel's copy of the rule the server holds in
// `crm_backend/src/services/billing-clients/credit-limit.js`. It exists so the
// invoice form can warn **while someone is still typing**, before anything is
// sent: a warning that only arrived after a save would be too late to be a
// warning at all.
//
// The two must agree, and the server is the authority. Every rule below is the
// server's, deliberately repeated rather than reinterpreted:
//   - a null limit means no limit, and answers false whatever the amounts are;
//   - a limit of 0 is a real limit — "no credit, pays up front" — and is not
//     the same as no limit;
//   - the comparison is strictly greater, so an invoice landing exactly on the
//     limit is within it;
//   - every amount is whole minor units (paise for INR) in the organization's
//     business currency, which is the only currency a credit limit is ever in.
//
// If this file and the server ever disagree, the server wins and this is the
// bug: it refuses or allows nothing, it only tells someone what will happen.

import { formatMinor } from "./types";

// Only the one field is needed, so an invoice form can pass a client it loaded
// itself without having to build a whole `BillingClient`.
export interface CreditLimited {
  creditLimitMinor: number | null;
}

export const hasCreditLimit = (client: CreditLimited | null | undefined): boolean =>
  !!client && client.creditLimitMinor !== null && client.creditLimitMinor !== undefined;

const toMinor = (value: number | null | undefined): number => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
};

// Would this new invoice take the client past their limit?
//
//   client                   the client, for its `creditLimitMinor`
//   newInvoiceTotalMinor     the invoice about to be raised
//   currentOutstandingMinor  what they already owe
//
// False when there is no limit, so a caller never has to check first. On an
// **edit** pass the difference the edit makes, not the invoice's whole total,
// or the invoice is counted twice — the same rule as on the server.
export const wouldExceedCreditLimit = (
  client: CreditLimited | null | undefined,
  newInvoiceTotalMinor: number | null | undefined,
  currentOutstandingMinor: number | null | undefined = 0,
): boolean => {
  if (!hasCreditLimit(client)) return false;
  const limit = toMinor(client!.creditLimitMinor);
  return toMinor(currentOutstandingMinor) + toMinor(newInvoiceTotalMinor) > limit;
};

export interface CreditLimitCheck {
  hasLimit: boolean;
  limitMinor: number | null;
  // Null when nobody knows what the client owes, which is the case until the
  // invoice feature exists. Never 0 for "unknown": 0 would read as "owes
  // nothing", which is a different claim.
  outstandingMinor: number | null;
  // How much room is left before the limit, never below zero: "minus ₹5,000
  // available" reads as a different kind of number than it is.
  availableMinor: number | null;
  afterMinor: number | null;
  // Null when it cannot be worked out, so a screen can tell "within the limit"
  // from "we cannot say".
  exceeds: boolean | null;
  overByMinor: number;
  // True when the limit is 0: they are expected to pay before anything is
  // raised, which is worth saying differently from going over a real limit.
  payUpFront: boolean;
}

// The same comparison with its workings shown, for the warning's wording and
// for the client page. `currentOutstandingMinor` of null means "not known", and
// then nothing is compared: `exceeds` comes back null rather than false, so a
// screen never tells someone an invoice is within a limit nobody has measured.
export const creditLimitCheck = (
  client: CreditLimited | null | undefined,
  newInvoiceTotalMinor: number | null | undefined = 0,
  currentOutstandingMinor: number | null | undefined = 0,
): CreditLimitCheck => {
  if (!hasCreditLimit(client)) {
    return {
      hasLimit: false,
      limitMinor: null,
      outstandingMinor: currentOutstandingMinor === null || currentOutstandingMinor === undefined ? null : toMinor(currentOutstandingMinor),
      availableMinor: null,
      afterMinor: null,
      exceeds: false,
      overByMinor: 0,
      payUpFront: false,
    };
  }

  const limit = toMinor(client!.creditLimitMinor);
  const unknown = currentOutstandingMinor === null || currentOutstandingMinor === undefined;

  if (unknown) {
    return {
      hasLimit: true,
      limitMinor: limit,
      outstandingMinor: null,
      availableMinor: null,
      afterMinor: null,
      exceeds: null,
      overByMinor: 0,
      payUpFront: limit === 0,
    };
  }

  const outstanding = toMinor(currentOutstandingMinor);
  const after = outstanding + toMinor(newInvoiceTotalMinor);

  return {
    hasLimit: true,
    limitMinor: limit,
    outstandingMinor: outstanding,
    availableMinor: Math.max(0, limit - outstanding),
    afterMinor: after,
    exceeds: after > limit,
    overByMinor: Math.max(0, after - limit),
    payUpFront: limit === 0,
  };
};

// What the warning says, in one place, so the inline alert and the confirm
// dialog cannot word the same situation two ways.
export interface CreditLimitWording {
  title: string;
  body: string;
}

export const creditLimitWording = (
  check: CreditLimitCheck,
  currency: string,
  clientName: string,
): CreditLimitWording | null => {
  if (!check.hasLimit) return null;

  const limit = formatMinor(check.limitMinor, currency);

  // Nothing to compare against yet: say what the limit is and why it has not
  // been checked, rather than implying the invoice is fine.
  if (check.exceeds === null) {
    return {
      title: check.payUpFront
        ? `${clientName} is set to pay up front`
        : `${clientName} has a credit limit of ${limit}`,
      body: check.payUpFront
        ? "Their credit limit is zero, so they are meant to pay before work is invoiced. OrbitOps can't check this against anything yet, because there are no invoices in it."
        : "OrbitOps can't check an invoice against this yet, because there are no invoices in it. Once invoicing arrives, you'll be warned here if a new invoice would take them past this limit.",
    };
  }

  if (!check.exceeds) {
    return {
      title: `Within ${clientName}'s credit limit`,
      body: `This invoice leaves them at ${formatMinor(check.afterMinor, currency)} of their ${limit} limit — ${formatMinor(
        Math.max(0, (check.limitMinor ?? 0) - (check.afterMinor ?? 0)),
        currency,
      )} still available.`,
    };
  }

  if (check.payUpFront) {
    return {
      title: `${clientName} is meant to pay up front`,
      body: `Their credit limit is zero, so any unpaid invoice puts them over it. This one would leave ${formatMinor(
        check.afterMinor,
        currency,
      )} outstanding. You can still raise it.`,
    };
  }

  return {
    title: `This takes ${clientName} over their credit limit`,
    body: `They already owe ${formatMinor(check.outstandingMinor, currency)}. This invoice would take them to ${formatMinor(
      check.afterMinor,
      currency,
    )}, which is ${formatMinor(check.overByMinor, currency)} over their ${limit} limit. You can still raise it — this is a warning, not a block.`,
  };
};
