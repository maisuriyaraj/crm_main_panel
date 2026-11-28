// Converts the Billing Clients API's snake_case responses (SRS 7.7) into the
// camelCase shapes in `lib/clients/types.ts`, and a form's values back into the
// body the API expects. The same split the leads and contacts mappers use.

import type {
  BillingClient,
  BillingClientDetail,
  ClientAddress,
  ClientPaymentTerms,
  ClientSourceLead,
  ClientStatus,
} from "./types";

type Row = Record<string, any>;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

// A money column arrives as a number or as a string (BIGINT over JSON), and
// null genuinely means "not known" or "no limit" — never 0.
const minor = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const mapAddress = (raw: Row | null | undefined): ClientAddress | null => {
  if (!raw) return null;
  return {
    line1: text(raw.line1),
    line2: text(raw.line2),
    city: text(raw.city),
    state: text(raw.state),
    postalCode: text(raw.postal_code),
    country: text(raw.country),
  };
};

const mapSourceLead = (raw: Row | null | undefined): ClientSourceLead | null => {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    publicId: text(raw.public_id),
    name: text(raw.name),
    deleted: raw.deleted === null || raw.deleted === undefined ? null : raw.deleted === true,
    path: text(raw.path),
  };
};

export const mapClientFromApi = (raw: Row = {}): BillingClient => ({
  id: String(raw.id),
  companyName: raw.company_name ?? "",
  contactPerson: text(raw.contact_person),
  email: text(raw.email),
  phone: text(raw.phone),
  gstin: text(raw.gstin),
  billingAddress: mapAddress(raw.billing_address),
  shippingAddress: mapAddress(raw.shipping_address),
  shippingSameAsBilling: raw.shipping_same_as_billing === true,
  paymentTerms: (raw.payment_terms as ClientPaymentTerms) ?? "net_30",
  paymentTermsDays: raw.payment_terms_days === null || raw.payment_terms_days === undefined ? null : Number(raw.payment_terms_days),
  creditLimitMinor: minor(raw.credit_limit_minor),
  creditLimitCurrency: raw.credit_limit_currency ?? "INR",
  taxExempt: raw.tax_exempt === true,
  notes: text(raw.notes),
  status: (raw.status as ClientStatus) ?? "active",
  sourceLead: mapSourceLead(raw.source_lead),
  createdBy: raw.created_by?.id
    ? { id: String(raw.created_by.id), fullName: raw.created_by.full_name ?? "" }
    : null,
  createdAt: text(raw.created_at),
  updatedAt: text(raw.updated_at),
});

export const mapClientDetailFromApi = (raw: Row = {}): BillingClientDetail => {
  const totals = (raw.totals ?? {}) as Row;
  const credit = (raw.credit ?? {}) as Row;
  const currency = raw.credit_limit_currency ?? totals.currency ?? "INR";

  return {
    ...mapClientFromApi(raw),
    invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
    payments: Array.isArray(raw.payments) ? raw.payments : [],
    outstandingBalance: minor(raw.outstanding_balance),
    totals: {
      currency: totals.currency ?? currency,
      invoicedMinor: minor(totals.invoiced_minor),
      paidMinor: minor(totals.paid_minor),
      outstandingMinor: minor(totals.outstanding_minor),
      overdueMinor: minor(totals.overdue_minor),
      invoiceCount: Number(totals.invoice_count ?? 0),
      paymentCount: Number(totals.payment_count ?? 0),
    },
    credit: {
      currency: credit.currency ?? currency,
      hasLimit: credit.has_limit === true,
      limitMinor: minor(credit.limit_minor),
      outstandingMinor: minor(credit.outstanding_minor),
      availableMinor: minor(credit.available_minor),
      exceeds: credit.exceeds === null || credit.exceeds === undefined ? null : credit.exceeds === true,
    },
    // Only true once the invoice feature exists. Absent means not available.
    invoicesAvailable: raw.invoices_available === true,
    messages: Array.isArray(raw.messages) ? raw.messages.map(String) : [],
  };
};

// ─── The form, going out ─────────────────────────────────────────────────────

// What the client form holds. Everything is a string in the form, because an
// input never holds a number or a null; the mapper below turns it back.
export interface ClientFormValues {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  billingLine1: string;
  billingLine2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  // Ticked, the billing address is copied into the shipping fields on submit.
  // There is no stored flag: an empty shipping address already means "same".
  shippingSameAsBilling: boolean;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  paymentTerms: ClientPaymentTerms;
  // In major units, as a person types it ("50000.00"); empty means no limit.
  creditLimit: string;
  taxExempt: boolean;
  notes: string;
}

export const emptyClientFormValues = (): ClientFormValues => ({
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  gstin: "",
  billingLine1: "",
  billingLine2: "",
  billingCity: "",
  billingState: "",
  billingPostalCode: "",
  billingCountry: "",
  shippingSameAsBilling: true,
  shippingLine1: "",
  shippingLine2: "",
  shippingCity: "",
  shippingState: "",
  shippingPostalCode: "",
  shippingCountry: "",
  paymentTerms: "net_30",
  creditLimit: "",
  taxExempt: false,
  notes: "",
});

export const clientToFormValues = (client: BillingClient): ClientFormValues => ({
  companyName: client.companyName,
  contactPerson: client.contactPerson ?? "",
  email: client.email ?? "",
  phone: client.phone ?? "",
  gstin: client.gstin ?? "",
  billingLine1: client.billingAddress?.line1 ?? "",
  billingLine2: client.billingAddress?.line2 ?? "",
  billingCity: client.billingAddress?.city ?? "",
  billingState: client.billingAddress?.state ?? "",
  billingPostalCode: client.billingAddress?.postalCode ?? "",
  billingCountry: client.billingAddress?.country ?? "",
  shippingSameAsBilling: client.shippingSameAsBilling,
  shippingLine1: client.shippingAddress?.line1 ?? "",
  shippingLine2: client.shippingAddress?.line2 ?? "",
  shippingCity: client.shippingAddress?.city ?? "",
  shippingState: client.shippingAddress?.state ?? "",
  shippingPostalCode: client.shippingAddress?.postalCode ?? "",
  shippingCountry: client.shippingAddress?.country ?? "",
  paymentTerms: client.paymentTerms,
  creditLimit: client.creditLimitMinor === null ? "" : String(client.creditLimitMinor / 100),
  taxExempt: client.taxExempt,
  notes: client.notes ?? "",
});

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

// An address with nothing in it is sent as null, not as six nulls: null is what
// the API reads as "no address", and for shipping as "ship to the billing one".
const addressToApi = (parts: {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}) => {
  const body = {
    line1: blankToNull(parts.line1),
    line2: blankToNull(parts.line2),
    city: blankToNull(parts.city),
    state: blankToNull(parts.state),
    postal_code: blankToNull(parts.postalCode),
    // The API wants a two-letter ISO code and upper-cases it anyway; doing it
    // here keeps a typed "in" from looking like a different value in the form.
    country: blankToNull(parts.country)?.toUpperCase() ?? null,
  };
  return Object.values(body).some((value) => value !== null) ? body : null;
};

// A typed amount to whole minor units. Empty is null ("no limit"); a typed 0 is
// kept as 0, because "no credit" is a real answer and not the same as no limit.
export const creditLimitToMinor = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
};

export const mapClientFormToApi = (values: ClientFormValues) => {
  // "Same as billing" is the checkbox's whole effect: the billing fields are
  // copied across here, once, on submit. Nothing stores that it was ticked.
  const billing = addressToApi({
    line1: values.billingLine1,
    line2: values.billingLine2,
    city: values.billingCity,
    state: values.billingState,
    postalCode: values.billingPostalCode,
    country: values.billingCountry,
  });

  const shipping = values.shippingSameAsBilling
    ? billing
    : addressToApi({
        line1: values.shippingLine1,
        line2: values.shippingLine2,
        city: values.shippingCity,
        state: values.shippingState,
        postalCode: values.shippingPostalCode,
        country: values.shippingCountry,
      });

  return {
    company_name: values.companyName.trim(),
    contact_person: blankToNull(values.contactPerson),
    email: blankToNull(values.email)?.toLowerCase() ?? null,
    phone: blankToNull(values.phone),
    gstin: blankToNull(values.gstin)?.toUpperCase() ?? null,
    billing_address: billing,
    // Ticked and no billing address typed: both go as null, which still means
    // "ship where the invoice is addressed".
    shipping_address: values.shippingSameAsBilling ? null : shipping,
    payment_terms: values.paymentTerms,
    credit_limit_minor: creditLimitToMinor(values.creditLimit),
    tax_exempt: values.taxExempt,
    notes: blankToNull(values.notes),
  };
};

// The API's 400 `errors` array onto the form's own field names, so a rejected
// value is painted on the input that holds it instead of becoming a toast.
const API_TO_FORM_FIELD: Record<string, keyof ClientFormValues> = {
  company_name: "companyName",
  contact_person: "contactPerson",
  email: "email",
  phone: "phone",
  gstin: "gstin",
  payment_terms: "paymentTerms",
  credit_limit_minor: "creditLimit",
  notes: "notes",
  "billing_address.line1": "billingLine1",
  "billing_address.city": "billingCity",
  "billing_address.postal_code": "billingPostalCode",
  "billing_address.country": "billingCountry",
  "shipping_address.line1": "shippingLine1",
  "shipping_address.city": "shippingCity",
  "shipping_address.postal_code": "shippingPostalCode",
  "shipping_address.country": "shippingCountry",
};

export const mapClientApiErrorsToForm = (
  errors?: Array<{ field?: string; message: string }>,
): Array<{ field: keyof ClientFormValues; message: string }> => {
  if (!Array.isArray(errors)) return [];
  return errors
    .filter((error) => error.field && API_TO_FORM_FIELD[error.field])
    .map((error) => ({ field: API_TO_FORM_FIELD[error.field as string], message: error.message }));
};
