// Converts the Billing Products API's snake_case responses (SRS 7.8) into the
// camelCase shapes in `lib/products/types.ts`, and a form's values back into the
// body the API expects. The same split the clients, leads and contacts mappers use.

import type {
  BillingProduct,
  BillingProductDetail,
  ProductInvoiceLineDefaults,
  ProductStatus,
  ProductTaxRate,
  ProductUnit,
} from "./types";

type Row = Record<string, any>;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

// A money column arrives as a number or as a string (BIGINT over JSON).
const minor = (value: unknown): number => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const mapTaxRate = (raw: Row | null | undefined): ProductTaxRate | null => {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    name: raw.name ?? "",
    rateBp: Number(raw.rate_bp ?? 0),
    ratePercent: Number(raw.rate_percent ?? 0),
    active: raw.active === true,
  };
};

export const mapProductFromApi = (raw: Row = {}): BillingProduct => ({
  id: String(raw.id),
  name: raw.name ?? "",
  sku: text(raw.sku),
  description: text(raw.description),
  unitPriceMinor: minor(raw.unit_price_minor),
  currency: raw.currency ?? "INR",
  unit: (raw.unit as ProductUnit) ?? "pieces",
  taxRateId: raw.tax_rate_id === null || raw.tax_rate_id === undefined ? null : String(raw.tax_rate_id),
  taxRate: mapTaxRate(raw.tax_rate),
  hsnSacCode: text(raw.hsn_sac_code),
  status: (raw.status as ProductStatus) ?? "active",
  createdBy: raw.created_by?.id
    ? { id: String(raw.created_by.id), fullName: raw.created_by.full_name ?? "" }
    : null,
  createdAt: text(raw.created_at),
  updatedAt: text(raw.updated_at),
});

const mapInvoiceLineDefaults = (raw: Row | null | undefined): ProductInvoiceLineDefaults | null => {
  if (!raw) return null;
  return {
    name: raw.name ?? "",
    sku: text(raw.sku),
    description: text(raw.description),
    unitPriceMinor: minor(raw.unit_price_minor),
    unit: (raw.unit as ProductUnit) ?? "pieces",
    // Null means no tax on the line, which is a real answer and not unknown.
    taxRateBp: raw.tax_rate_bp === null || raw.tax_rate_bp === undefined ? null : Number(raw.tax_rate_bp),
    taxRateName: text(raw.tax_rate_name),
    hsnSacCode: text(raw.hsn_sac_code),
    productId: String(raw.product_id ?? ""),
  };
};

export const mapProductDetailFromApi = (raw: Row = {}): BillingProductDetail => ({
  ...mapProductFromApi(raw),
  invoiceLineDefaults: mapInvoiceLineDefaults(raw.invoice_line_defaults),
  // Only true once the invoice feature exists. Absent means not available.
  invoicesAvailable: raw.invoices_available === true,
  messages: Array.isArray(raw.messages) ? raw.messages.map(String) : [],
});

// ─── The form, going out ─────────────────────────────────────────────────────

// What the product form holds. Everything is a string in the form, because an
// input never holds a number or a null; the mapper below turns it back.
export interface ProductFormValues {
  name: string;
  sku: string;
  description: string;
  // In major units, as a person types it ("2500.00").
  unitPrice: string;
  unit: ProductUnit;
  // The rate's id, or the sentinel below for "no tax on this item". A Select
  // cannot hold an empty string as a value, so the sentinel is what sits there.
  taxRateId: string;
  hsnSacCode: string;
}

// "No tax" is a choice someone makes, not an empty box, so it is an option with
// a value of its own rather than a blank one.
export const NO_TAX_RATE = "none";

export const emptyProductFormValues = (): ProductFormValues => ({
  name: "",
  sku: "",
  description: "",
  unitPrice: "",
  unit: "pieces",
  taxRateId: NO_TAX_RATE,
  hsnSacCode: "",
});

export const productToFormValues = (product: BillingProduct): ProductFormValues => ({
  name: product.name,
  sku: product.sku ?? "",
  description: product.description ?? "",
  unitPrice: String(product.unitPriceMinor / 100),
  unit: product.unit,
  taxRateId: product.taxRateId ?? NO_TAX_RATE,
  hsnSacCode: product.hsnSacCode ?? "",
});

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

// A typed amount to whole minor units. Empty is 0, not null: an item always has
// a price, and a free line is a real line.
export const priceToMinor = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
};

export const mapProductFormToApi = (values: ProductFormValues) => ({
  name: values.name.trim(),
  sku: blankToNull(values.sku)?.toUpperCase() ?? null,
  description: blankToNull(values.description),
  unit_price_minor: priceToMinor(values.unitPrice),
  unit: values.unit,
  // The sentinel back to null, which the API reads as "no tax on this item".
  tax_rate_id: values.taxRateId === NO_TAX_RATE ? null : Number(values.taxRateId),
  hsn_sac_code: blankToNull(values.hsnSacCode),
});

// The API's 400 `errors` array onto the form's own field names, so a rejected
// value is painted on the input that holds it instead of becoming a toast.
const API_TO_FORM_FIELD: Record<string, keyof ProductFormValues> = {
  name: "name",
  sku: "sku",
  description: "description",
  unit_price_minor: "unitPrice",
  unit: "unit",
  tax_rate_id: "taxRateId",
  hsn_sac_code: "hsnSacCode",
};

export const mapProductApiErrorsToForm = (
  errors?: Array<{ field?: string; message: string }>,
): Array<{ field: keyof ProductFormValues; message: string }> => {
  if (!Array.isArray(errors)) return [];
  return errors
    .filter((error) => error.field && API_TO_FORM_FIELD[error.field])
    .map((error) => ({ field: API_TO_FORM_FIELD[error.field as string], message: error.message }));
};
