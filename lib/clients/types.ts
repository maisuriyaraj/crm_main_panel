// The clients this organization invoices (SRS 7.7). `lib/clients/mappers.ts`
// converts the API's snake_case wire format into these camelCase shapes.
//
// These are the organization's own customers — not its CRM contacts, and not
// the OrbitOps invoices it receives itself (that is `lib/store/slices/billingSlice`).
//
// Nothing invoices a client yet: the invoice screens do not exist, so a client's
// invoices, payments and balance come back empty with `invoicesAvailable: false`.
// The detail screen says so rather than showing an empty table, because an empty
// table reads as "never invoiced", which nobody knows.

export type ClientStatus = "active" | "inactive";

export type ClientPaymentTerms = "net_30" | "net_60" | "net_90" | "due_on_receipt";

// SRS 7.7's Net 30/60/90, plus paying on receipt.
export const PAYMENT_TERMS: Array<{ value: ClientPaymentTerms; label: string }> = [
  { value: "net_30", label: "Net 30 — due 30 days after the invoice" },
  { value: "net_60", label: "Net 60 — due 60 days after the invoice" },
  { value: "net_90", label: "Net 90 — due 90 days after the invoice" },
  { value: "due_on_receipt", label: "Due on receipt — payable straight away" },
];

export const PAYMENT_TERMS_SHORT: Record<ClientPaymentTerms, string> = {
  net_30: "Net 30",
  net_60: "Net 60",
  net_90: "Net 90",
  due_on_receipt: "On receipt",
};

export interface ClientAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

// The lead this client was converted from (BI-CL2). `path` is the route back to
// it, which the API builds so neither panel has to know the other's URLs.
export interface ClientSourceLead {
  id: string;
  publicId: string | null;
  name: string | null;
  deleted: boolean | null;
  path: string | null;
}

export interface BillingClient {
  id: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  billingAddress: ClientAddress | null;
  shippingAddress: ClientAddress | null;
  // Derived by the API from an empty shipping address, not a stored flag.
  shippingSameAsBilling: boolean;
  paymentTerms: ClientPaymentTerms;
  paymentTermsDays: number | null;
  // Whole minor units (paise for INR). null means no credit limit at all, which
  // is a different thing from a limit of 0 ("no credit, pays up front").
  creditLimitMinor: number | null;
  creditLimitCurrency: string;
  taxExempt: boolean;
  notes: string | null;
  status: ClientStatus;
  sourceLead: ClientSourceLead | null;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// What the detail read adds on top of the client itself. Every money figure is
// null today, because no invoice exists to add up.
export interface ClientCredit {
  currency: string;
  hasLimit: boolean;
  limitMinor: number | null;
  outstandingMinor: number | null;
  availableMinor: number | null;
  exceeds: boolean | null;
}

export interface ClientTotals {
  currency: string;
  invoicedMinor: number | null;
  paidMinor: number | null;
  outstandingMinor: number | null;
  overdueMinor: number | null;
  invoiceCount: number;
  paymentCount: number;
}

export interface BillingClientDetail extends BillingClient {
  // Both stay empty until the invoice feature exists.
  invoices: unknown[];
  payments: unknown[];
  outstandingBalance: number | null;
  totals: ClientTotals;
  credit: ClientCredit;
  // False while no invoice can be raised anywhere in the product.
  invoicesAvailable: boolean;
  // The API's own plain-words explanation, shown rather than reworded here so a
  // change to the wording ships from the API alone.
  messages: string[];
}

// What the form sends. Text left out of a save is cleared, because the API
// replaces the section as a whole.
export interface BillingClientInput {
  company_name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  billing_address?: Partial<Record<"line1" | "line2" | "city" | "state" | "postal_code" | "country", string | null>> | null;
  shipping_address?: Partial<Record<"line1" | "line2" | "city" | "state" | "postal_code" | "country", string | null>> | null;
  payment_terms?: ClientPaymentTerms;
  credit_limit_minor?: number | null;
  tax_exempt?: boolean;
  notes?: string | null;
}

// ─── Error codes, in plain words ─────────────────────────────────────────────

// The codes the clients and conversion routes answer with. Each one is turned
// into something a person can act on; anything else falls back to the API's own
// message, which is already written for a reader.
export const CLIENT_ERROR = {
  alreadyExists: "CLIENT_ALREADY_EXISTS",
  notFound: "CLIENT_NOT_FOUND",
  leadNotFound: "LEAD_NOT_FOUND",
  leadAlreadyConverted: "LEAD_ALREADY_CONVERTED",
  nameRequired: "CLIENT_NAME_REQUIRED",
  validationFailed: "VALIDATION_FAILED",
} as const;

export const clientErrorCodeOf = (error: any): string | undefined => error?.response?.data?.code;

// The client an error points at: the one that already exists, or the one a lead
// was already converted into. Both arrive under `data.client`.
export interface ClientErrorTarget {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
}

export const clientErrorTargetOf = (error: any): ClientErrorTarget | null => {
  const raw = error?.response?.data?.data?.client;
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    companyName: raw.company_name ?? "that client",
    email: raw.email ?? null,
    phone: raw.phone ?? null,
  };
};

// Which field the duplicate matched on, so the warning can name it.
export const clientErrorMatchedOn = (error: any): string[] => {
  const raw = error?.response?.data?.data?.matched_on;
  return Array.isArray(raw) ? raw.map(String) : [];
};

export const clientErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  switch (data?.code) {
    case CLIENT_ERROR.alreadyExists: {
      const matched = clientErrorMatchedOn(error);
      const field = matched.includes("email") ? "email address" : matched.includes("phone") ? "phone number" : "email or phone";
      const target = clientErrorTargetOf(error);
      return target
        ? `${target.companyName} already uses this ${field}. Open that client instead of adding a second record for them.`
        : `Another client already uses this ${field}.`;
    }
    case CLIENT_ERROR.leadAlreadyConverted: {
      const target = clientErrorTargetOf(error);
      return target
        ? `This lead is already a client: ${target.companyName}.`
        : "This lead has already been turned into a client.";
    }
    case CLIENT_ERROR.nameRequired:
      return "This lead has no company or contact name, so there is nothing to call the client. Add a name to the lead first, or create the client by hand.";
    case CLIENT_ERROR.notFound:
      return "That client no longer exists. It may have been removed while this page was open.";
    case CLIENT_ERROR.leadNotFound:
      return "That lead no longer exists, or it is not one your role lets you open.";
    default:
      return data?.message ?? fallback;
  }
};

// ─── Money ───────────────────────────────────────────────────────────────────

// Minor units in, a readable amount out. Indian grouping for INR (SRS NFR-U4),
// the locale's own grouping otherwise.
export const formatMinor = (minor: number | null | undefined, currency: string): string => {
  if (minor === null || minor === undefined) return "—";
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
};

// What a credit limit says in words. The three cases read very differently and
// must not be flattened into one.
export const creditLimitLabel = (minor: number | null, currency: string): string => {
  if (minor === null) return "No limit set";
  if (minor === 0) return "No credit — pays up front";
  return formatMinor(minor, currency);
};

export const addressLines = (address: ClientAddress | null): string[] => {
  if (!address) return [];
  return [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(", ") || null,
    [address.postalCode, address.country].filter(Boolean).join(" ") || null,
  ].filter((line): line is string => !!line && line.trim() !== "");
};
