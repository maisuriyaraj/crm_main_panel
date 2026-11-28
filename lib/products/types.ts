// The products and services this organization sells (SRS 7.8, BI-PR1, BI-PR2).
// `lib/products/mappers.ts` converts the API's snake_case wire format into the
// camelCase shapes here.
//
// This is a catalogue of **defaults**, not a record of what was billed. Once
// invoicing exists, an invoice line copies an item's name, price, unit, tax rate
// and HSN/SAC code at the moment the line is added and never reads the item
// again — which is why editing or deactivating an item here can never change an
// invoice that was already sent, and why nothing is ever deleted.

import { formatMinor } from "@/lib/clients/types";

export type ProductStatus = "active" | "inactive";

// What the list can be filtered by. "all" is this management screen's default:
// an item is never deleted, so a tenant needs to see the retired ones to bring
// one back. The API's own default is active only, which is what a future invoice
// item-picker wants, not what this tab shows.
export type ProductStatusFilter = ProductStatus | "all";

// SRS 7.8's four units, and nothing else.
export type ProductUnit = "pieces" | "hours" | "days" | "months";

export const PRODUCT_UNITS: Array<{ value: ProductUnit; label: string; short: string }> = [
  { value: "pieces", label: "Pieces — sold by the item", short: "Pieces" },
  { value: "hours", label: "Hours — billed by the hour", short: "Hours" },
  { value: "days", label: "Days — billed by the day", short: "Days" },
  { value: "months", label: "Months — billed by the month", short: "Months" },
];

export const PRODUCT_UNIT_SHORT: Record<ProductUnit, string> = {
  pieces: "Pieces",
  hours: "Hours",
  days: "Days",
  months: "Months",
};

// The tax rate an item carries, resolved from the organization's own rates
// (the ones on the Invoice settings screen). `active: false` means the tenant
// has since retired this rate — the item keeps it, and the screen flags it.
export interface ProductTaxRate {
  id: string;
  name: string;
  rateBp: number;
  ratePercent: number;
  active: boolean;
}

export interface BillingProduct {
  id: string;
  name: string;
  // The tenant's own item code. Optional, and unique per organization.
  sku: string | null;
  description: string | null;
  // Whole minor units (paise for INR) in the organization's business currency.
  unitPriceMinor: number;
  currency: string;
  unit: ProductUnit;
  taxRateId: string | null;
  // Null is a real answer: this item carries no tax. Not "unknown".
  taxRate: ProductTaxRate | null;
  hsnSacCode: string | null;
  status: ProductStatus;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// What an invoice line will copy off this item, in the exact shape the API
// publishes it. Shown nowhere yet; carried so the detail read has somewhere to
// put it and the shape is settled before the invoice feature depends on it.
export interface ProductInvoiceLineDefaults {
  name: string;
  sku: string | null;
  description: string | null;
  unitPriceMinor: number;
  unit: ProductUnit;
  taxRateBp: number | null;
  taxRateName: string | null;
  hsnSacCode: string | null;
  productId: string;
}

export interface BillingProductDetail extends BillingProduct {
  invoiceLineDefaults: ProductInvoiceLineDefaults | null;
  // False while no invoice can be raised anywhere in the product.
  invoicesAvailable: boolean;
  // The API's own plain-words explanation, shown rather than reworded here so a
  // change to the wording ships from the API alone.
  messages: string[];
}

// What the form sends. A text field left out of a save is cleared, because the
// API replaces what it is given.
export interface BillingProductInput {
  name?: string;
  sku?: string | null;
  description?: string | null;
  unit_price_minor?: number;
  unit?: ProductUnit;
  tax_rate_id?: number | null;
  hsn_sac_code?: string | null;
}

// ─── Error codes, in plain words ─────────────────────────────────────────────

export const PRODUCT_ERROR = {
  skuAlreadyExists: "SKU_ALREADY_EXISTS",
  notFound: "PRODUCT_NOT_FOUND",
  inactive: "PRODUCT_INACTIVE",
  taxRateNotFound: "TAX_RATE_NOT_FOUND",
  taxRateInactive: "TAX_RATE_INACTIVE",
  validationFailed: "VALIDATION_FAILED",
} as const;

export const productErrorCodeOf = (error: any): string | undefined => error?.response?.data?.code;

// The item an error points at: the one already using a code. It arrives under
// `data.product`, with its status, because the clash holds against an inactive
// item too — which is the part that confuses people, so it is named.
export interface ProductErrorTarget {
  id: string;
  name: string;
  sku: string | null;
  status: ProductStatus;
}

export const productErrorTargetOf = (error: any): ProductErrorTarget | null => {
  const raw = error?.response?.data?.data?.product;
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    name: raw.name ?? "that item",
    sku: raw.sku ?? null,
    status: (raw.status as ProductStatus) ?? "active",
  };
};

// Every code this feature can answer with, turned into something a person can
// act on. Kept in one place so the list, the form and the status toggle all say
// the same thing about the same code. Anything else falls back to the API's own
// message, which is already written for a reader.
export const productErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  switch (data?.code) {
    case PRODUCT_ERROR.skuAlreadyExists: {
      const target = productErrorTargetOf(error);
      if (!target) return "Another item already uses this code.";
      const where = target.status === "inactive" ? " It is an inactive item, so you may not see it in this list." : "";
      return `${target.name} already uses the code ${target.sku ?? ""}.${where} Change the code, or edit that item instead.`;
    }
    case PRODUCT_ERROR.taxRateInactive:
      return "That tax rate has been turned off, so it can't be put on an item. Pick an active rate, or turn that one back on in Invoice settings.";
    case PRODUCT_ERROR.taxRateNotFound:
      return "That tax rate no longer exists. Pick another one, or add it in Invoice settings.";
    case PRODUCT_ERROR.notFound:
      return "That item no longer exists. It may have been removed while this page was open.";
    case PRODUCT_ERROR.inactive:
      return "That item is inactive, so it can't go on a new invoice. Make it active first.";
    default:
      return data?.message ?? fallback;
  }
};

// ─── Money and wording ──────────────────────────────────────────────────────

// One formatter for the whole Billing area rather than a second one here, so a
// price on this screen and a credit limit on the clients screen can never be
// grouped differently (Indian grouping for INR, SRS NFR-U4).
export { formatMinor };

// A price with its unit, as it reads on a price list: "₹2,500.00 per hour".
export const PRODUCT_UNIT_PER: Record<ProductUnit, string> = {
  pieces: "per piece",
  hours: "per hour",
  days: "per day",
  months: "per month",
};

export const priceWithUnit = (minor: number, currency: string, unit: ProductUnit): string =>
  `${formatMinor(minor, currency)} ${PRODUCT_UNIT_PER[unit]}`;

// What an item's tax says in a cell. "No tax" is a real setting and must not
// read as a missing value, and a retired rate is called out rather than shown as
// if it were fine.
export const taxRateLabel = (taxRate: ProductTaxRate | null): string => {
  if (!taxRate) return "No tax";
  return `${taxRate.name} (${taxRate.ratePercent}%)${taxRate.active ? "" : " — turned off"}`;
};
