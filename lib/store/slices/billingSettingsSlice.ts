import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import type { ThunkArg } from "./leadAttachmentsSlice";

// How this organization invoices its own clients: its billing identity, invoice
// numbering, tax rates, invoice email wording and payment gateway keys.
//
// Not the same thing as `billingSlice`, which is what OrbitOps charges this
// organization. Nothing here creates or sends an invoice: the invoice screens do not
// exist yet, so this is configuration held ready for them.

export interface BankDetails {
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  branch: string | null;
  upi_id: string | null;
  notes: string | null;
}

export interface BillingCompany {
  legalName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  stateCode: string | null;
  stateName: string | null;
  taxId: string | null;
  defaultCurrency: string;
  defaultPaymentTermsDays: number;
  bankDetails: BankDetails | null;
  invoicePrefix: string;
  requireApproval: boolean;
  // What the invoice feature would still need before it could issue anything.
  missing: string[];
  ready: boolean;
  nextInvoiceNumber: string | null;
  currencies: string[];
  states: Array<{ code: string; name: string }>;
  notes: string[];
}

// What the company form sends. Text left out is cleared, as the API replaces the
// section as a whole.
export interface BillingCompanyInput {
  legal_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  state_code?: string | null;
  tax_id: string | null;
  default_currency?: string;
  default_payment_terms_days?: number;
  bank_details?: Partial<BankDetails> | null;
  invoice_prefix?: string;
  require_approval?: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rateBp: number;
  ratePercent: number;
  isDefault: boolean;
  active: boolean;
}

export interface EmailTemplate {
  key: string;
  label: string;
  describes: string;
  subject: string;
  body: string;
  customised: boolean;
  defaultSubject: string;
  defaultBody: string;
}

export interface Placeholder {
  token: string;
  describes: string;
}

export interface PaymentGateway {
  provider: string;
  configured: boolean;
  keyIdMasked: string | null;
  hasSecret: boolean;
  active: boolean;
}

interface BillingSettingsState {
  company: BillingCompany | null;
  taxRates: TaxRate[];
  templates: EmailTemplate[];
  placeholders: Placeholder[];
  gateways: PaymentGateway[];
  accounting: AccountingConnection[];
  syncItems: AccountingSyncItem[];
  // Empty until the invoice feature can produce a document to push, which is what the
  // tab uses to explain why nothing syncs.
  syncableEntities: string[];
  accountingNotes: string[];
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: BillingSettingsState = {
  company: null,
  taxRates: [],
  templates: [],
  placeholders: [],
  gateways: [],
  accounting: [],
  syncItems: [],
  syncableEntities: [],
  accountingNotes: [],
  isLoaded: false,
  isLoading: false,
  isSaving: false,
  error: null,
};

type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : null);
const num = (value: unknown) => Number(value ?? 0);

const messageOf = (error: unknown, fallback: string) =>
  (axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message) || fallback;

const mapCompany = (row: Row): BillingCompany => ({
  legalName: text(row.legal_name),
  addressLine1: text(row.address_line1),
  addressLine2: text(row.address_line2),
  city: text(row.city),
  postalCode: text(row.postal_code),
  country: text(row.country),
  stateCode: text(row.state_code),
  stateName: text(row.state_name),
  taxId: text(row.tax_id),
  defaultCurrency: (row.default_currency as string) ?? "INR",
  defaultPaymentTermsDays: num(row.default_payment_terms_days),
  bankDetails: (row.bank_details as BankDetails) ?? null,
  invoicePrefix: (row.invoice_prefix as string) ?? "INV",
  requireApproval: row.require_approval === true,
  missing: (row.missing as string[]) ?? [],
  ready: row.ready === true,
  nextInvoiceNumber: text((row.next_invoice_number as Row | undefined)?.number),
  currencies: ((row.options as Row | undefined)?.currencies as string[]) ?? [],
  states: ((row.options as Row | undefined)?.states as Array<{ code: string; name: string }>) ?? [],
  notes: (row.notes as string[]) ?? [],
});

const mapTaxRate = (row: Row): TaxRate => ({
  id: String(row.id),
  name: (row.name as string) ?? "",
  rateBp: num(row.rate_bp),
  ratePercent: num(row.rate_percent),
  isDefault: row.is_default === true,
  active: row.active === true,
});

const mapTemplate = (row: Row): EmailTemplate => ({
  key: (row.key as string) ?? "",
  label: (row.label as string) ?? "",
  describes: (row.describes as string) ?? "",
  subject: (row.subject as string) ?? "",
  body: (row.body as string) ?? "",
  customised: row.customised === true,
  defaultSubject: (row.default_subject as string) ?? "",
  defaultBody: (row.default_body as string) ?? "",
});

const mapGateway = (row: Row): PaymentGateway => ({
  provider: (row.provider as string) ?? "",
  configured: row.configured === true,
  keyIdMasked: text(row.key_id_masked),
  hasSecret: row.has_secret === true,
  active: row.active === true,
});

// ─── Company ─────────────────────────────────────────────────────────────────

export const reqToGetBillingCompany = createAsyncThunk<
  BillingCompany,
  Partial<ThunkArg<null, BillingCompany>>,
  { rejectValue: { message: string } }
>("billingSettings/getCompany", async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingSettingsCompany);
    const result = mapCompany(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't load your billing settings") });
  }
});

export const reqToSaveBillingCompany = createAsyncThunk<
  BillingCompany,
  Partial<ThunkArg<BillingCompanyInput, BillingCompany>>,
  { rejectValue: { message: string } }
>("billingSettings/saveCompany", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.put(apiRoutes.billingSettingsCompany, data ?? {});
    const result = mapCompany(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't save your billing settings") });
  }
});

// ─── Tax rates ───────────────────────────────────────────────────────────────

export const reqToGetTaxRates = createAsyncThunk<
  TaxRate[],
  Partial<ThunkArg<null, TaxRate[]>>,
  { rejectValue: { message: string } }
>("billingSettings/getTaxRates", async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingSettingsTaxRates);
    const result = ((response.data?.data ?? []) as Row[]).map(mapTaxRate);
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't load your tax rates") });
  }
});

export interface TaxRateInput {
  name?: string;
  rate_bp?: number;
  is_default?: boolean;
  active?: boolean;
}

export const reqToCreateTaxRate = createAsyncThunk<
  TaxRate,
  Partial<ThunkArg<TaxRateInput, TaxRate>>,
  { rejectValue: { message: string } }
>("billingSettings/createTaxRate", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.post(apiRoutes.billingSettingsTaxRates, data ?? {});
    const result = mapTaxRate(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't add that tax rate") });
  }
});

export const reqToUpdateTaxRate = createAsyncThunk<
  TaxRate,
  Partial<ThunkArg<{ id: string; values: TaxRateInput }, TaxRate>>,
  { rejectValue: { message: string } }
>("billingSettings/updateTaxRate", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.patch(`${apiRoutes.billingSettingsTaxRates}/${data?.id}`, data?.values ?? {});
    const result = mapTaxRate(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't save that tax rate") });
  }
});

export const reqToDeleteTaxRate = createAsyncThunk<
  { id: string },
  Partial<ThunkArg<{ id: string }, { id: string }>>,
  { rejectValue: { message: string } }
>("billingSettings/deleteTaxRate", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    await Axios.delete(`${apiRoutes.billingSettingsTaxRates}/${data?.id}`);
    const result = { id: String(data?.id) };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't remove that tax rate") });
  }
});

// ─── Email templates ─────────────────────────────────────────────────────────

type TemplatesResult = { templates: EmailTemplate[]; placeholders: Placeholder[] };

export const reqToGetEmailTemplates = createAsyncThunk<
  TemplatesResult,
  Partial<ThunkArg<null, TemplatesResult>>,
  { rejectValue: { message: string } }
>("billingSettings/getEmailTemplates", async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingSettingsEmailTemplates);
    const body = (response.data?.data ?? {}) as Row;
    const result: TemplatesResult = {
      templates: ((body.templates ?? []) as Row[]).map(mapTemplate),
      placeholders: (body.placeholders as Placeholder[]) ?? [],
    };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't load your invoice emails") });
  }
});

export const reqToSaveEmailTemplate = createAsyncThunk<
  EmailTemplate,
  Partial<ThunkArg<{ key: string; subject: string; body: string }, EmailTemplate>>,
  { rejectValue: { message: string } }
>("billingSettings/saveEmailTemplate", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.put(`${apiRoutes.billingSettingsEmailTemplates}/${data?.key}`, {
      subject: data?.subject,
      body: data?.body,
    });
    const result = mapTemplate(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't save that email") });
  }
});

// Goes back to the built-in wording by removing this organization's own copy.
export const reqToResetEmailTemplate = createAsyncThunk<
  EmailTemplate,
  Partial<ThunkArg<{ key: string }, EmailTemplate>>,
  { rejectValue: { message: string } }
>("billingSettings/resetEmailTemplate", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.delete(`${apiRoutes.billingSettingsEmailTemplates}/${data?.key}`);
    const result = mapTemplate(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't reset that email") });
  }
});

// ─── Payment gateways ────────────────────────────────────────────────────────

export const reqToGetPaymentGateways = createAsyncThunk<
  PaymentGateway[],
  Partial<ThunkArg<null, PaymentGateway[]>>,
  { rejectValue: { message: string } }
>("billingSettings/getPaymentGateways", async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingSettingsPaymentGateways);
    const body = (response.data?.data ?? {}) as Row;
    const result = ((body.gateways ?? []) as Row[]).map(mapGateway);
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't load your payment gateways") });
  }
});

// The secret is write-only: it is sent, never read back, so it is left out of a save
// that only changes the key id or the switch.
export const reqToSavePaymentGateway = createAsyncThunk<
  PaymentGateway,
  Partial<ThunkArg<{ provider: string; key_id?: string | null; key_secret?: string; active?: boolean }, PaymentGateway>>,
  { rejectValue: { message: string } }
>("billingSettings/savePaymentGateway", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const { provider, ...values } = data ?? { provider: "" };
    const response = await Axios.put(`${apiRoutes.billingSettingsPaymentGateways}/${provider}`, values);
    const result = mapGateway(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't save those gateway keys") });
  }
});

export const reqToDeletePaymentGateway = createAsyncThunk<
  PaymentGateway,
  Partial<ThunkArg<{ provider: string }, PaymentGateway>>,
  { rejectValue: { message: string } }
>("billingSettings/deletePaymentGateway", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.delete(`${apiRoutes.billingSettingsPaymentGateways}/${data?.provider}`);
    const result = mapGateway(response.data?.data ?? { provider: data?.provider });
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't remove those gateway keys") });
  }
});

// ─── Accounting sync (BI-S4) ─────────────────────────────────────────────────
// The tenant's own Zoho Books, QuickBooks or Tally. Credentials belong to the tenant
// and are never read back: a connection only says which fields are filled in.

export interface AccountingConnection {
  provider: string;
  label: string;
  // "api" talks to the provider; "file" (Tally) means OrbitOps builds a voucher file
  // the tenant imports itself, so there is nothing to push or test.
  kind: "api" | "file";
  connected: boolean;
  status: string;
  externalOrgId: string | null;
  externalOrgIdLabel: string | null;
  needsExternalOrgId: boolean;
  credentialFields: string[];
  credentials: Record<string, "set" | "missing">;
  settings: Record<string, string | number | boolean | null>;
  settingFields: string[];
  missingSettings: string[];
  autoSync: boolean;
  connectedAt: string | null;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  counts: Record<string, number>;
}

export interface AccountingSyncItem {
  id: string;
  provider: string;
  entity: string;
  entityId: string;
  status: string;
  attempts: number;
  externalId: string | null;
  externalNumber: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  syncedAt: string | null;
}

const mapConnection = (row: Row): AccountingConnection => ({
  provider: (row.provider as string) ?? "",
  label: (row.label as string) ?? "",
  kind: (row.kind as "api" | "file") ?? "api",
  connected: row.connected === true,
  status: (row.status as string) ?? "disconnected",
  externalOrgId: text(row.external_org_id),
  externalOrgIdLabel: text(row.external_org_id_label),
  needsExternalOrgId: row.needs_external_org_id === true,
  credentialFields: (row.credential_fields as string[]) ?? [],
  credentials: (row.credentials as Record<string, "set" | "missing">) ?? {},
  settings: (row.settings as Record<string, string | number | boolean | null>) ?? {},
  settingFields: (row.setting_fields as string[]) ?? [],
  missingSettings: (row.missing_settings as string[]) ?? [],
  autoSync: row.auto_sync === true,
  connectedAt: text(row.connected_at),
  lastCheckedAt: text(row.last_checked_at),
  lastSyncedAt: text(row.last_synced_at),
  lastError: text(row.last_error),
  counts: (row.counts as Record<string, number>) ?? {},
});

const mapSyncItem = (row: Row): AccountingSyncItem => ({
  id: String(row.id),
  provider: (row.provider as string) ?? "",
  entity: (row.entity as string) ?? "",
  entityId: String(row.entity_id ?? ""),
  status: (row.status as string) ?? "pending",
  attempts: num(row.attempts),
  externalId: text(row.external_id),
  externalNumber: text(row.external_number),
  lastError: text(row.last_error),
  lastErrorCode: text(row.last_error_code),
  syncedAt: text(row.synced_at),
});

type AccountingResult = {
  connections: AccountingConnection[];
  syncableEntities: string[];
  readyToSync: boolean;
  notes: string[];
};

export const reqToGetAccounting = createAsyncThunk<
  AccountingResult,
  Partial<ThunkArg<null, AccountingResult>>,
  { rejectValue: { message: string } }
>("billingSettings/getAccounting", async ({ onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingSettingsAccounting);
    const body = (response.data?.data ?? {}) as Row;
    const result: AccountingResult = {
      connections: ((body.connections ?? []) as Row[]).map(mapConnection),
      syncableEntities: (body.syncable_entities as string[]) ?? [],
      readyToSync: body.ready_to_sync === true,
      notes: (body.notes as string[]) ?? [],
    };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't load your accounting connections") });
  }
});

export interface ConnectAccountingInput {
  provider: string;
  credentials?: Record<string, string>;
  external_org_id?: string | null;
  settings?: Record<string, string | number | boolean | null>;
  auto_sync?: boolean;
}

export const reqToConnectAccounting = createAsyncThunk<
  AccountingConnection,
  Partial<ThunkArg<ConnectAccountingInput, AccountingConnection>>,
  { rejectValue: { message: string } }
>("billingSettings/connectAccounting", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const { provider, ...values } = data ?? { provider: "" };
    const response = await Axios.put(`${apiRoutes.billingSettingsAccounting}/${provider}`, values);
    const result = mapConnection(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't connect that accounting software") });
  }
});

export const reqToUpdateAccountingSettings = createAsyncThunk<
  AccountingConnection,
  Partial<ThunkArg<{ provider: string; settings?: Record<string, string | number | boolean | null>; auto_sync?: boolean }, AccountingConnection>>,
  { rejectValue: { message: string } }
>("billingSettings/updateAccountingSettings", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const { provider, ...values } = data ?? { provider: "" };
    const response = await Axios.patch(`${apiRoutes.billingSettingsAccounting}/${provider}`, values);
    const result = mapConnection(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't save those accounting settings") });
  }
});

// Read-only at the provider: it confirms the credentials and changes nothing in the
// tenant's books.
export const reqToTestAccounting = createAsyncThunk<
  { provider: string; ok: boolean; message: string },
  Partial<ThunkArg<{ provider: string }, { provider: string; ok: boolean; message: string }>>,
  { rejectValue: { message: string } }
>("billingSettings/testAccounting", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.post(`${apiRoutes.billingSettingsAccounting}/${data?.provider}/test`);
    const body = (response.data?.data ?? {}) as Row;
    const result = {
      provider: (body.provider as string) ?? String(data?.provider),
      ok: body.ok === true,
      message: (body.message as string) ?? "The connection works.",
    };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't reach that accounting software") });
  }
});

export const reqToDisconnectAccounting = createAsyncThunk<
  AccountingConnection,
  Partial<ThunkArg<{ provider: string }, AccountingConnection>>,
  { rejectValue: { message: string } }
>("billingSettings/disconnectAccounting", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.delete(`${apiRoutes.billingSettingsAccounting}/${data?.provider}`);
    const result = mapConnection(response.data?.data ?? { provider: data?.provider });
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't disconnect that accounting software") });
  }
});

export const reqToGetAccountingSyncItems = createAsyncThunk<
  AccountingSyncItem[],
  Partial<ThunkArg<{ provider?: string; status?: string } | null, AccountingSyncItem[]>>,
  { rejectValue: { message: string } }
>("billingSettings/getAccountingSyncItems", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const params: Record<string, string> = {};
    if (data?.provider) params.provider = data.provider;
    if (data?.status) params.status = data.status;
    const response = await Axios.get(apiRoutes.billingSettingsAccountingItems, { params });
    const result = ((response.data?.data ?? []) as Row[]).map(mapSyncItem);
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't load the sync history") });
  }
});

// Queues everything that failed for one provider again.
export const reqToRetryAccountingSync = createAsyncThunk<
  { queued: number },
  Partial<ThunkArg<{ provider: string }, { queued: number }>>,
  { rejectValue: { message: string } }
>("billingSettings/retryAccountingSync", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.post(`${apiRoutes.billingSettingsAccounting}/${data?.provider}/retry`);
    const result = { queued: num((response.data?.data ?? {}).queued) };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: messageOf(error, "Couldn't queue those records again") });
  }
});

const billingSettingsSlice = createSlice({
  name: "billingSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(reqToGetBillingCompany.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetBillingCompany.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isLoaded = true;
      state.error = null;
      state.company = action.payload;
    });
    builder.addCase(reqToGetBillingCompany.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToSaveBillingCompany.pending, (state) => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(reqToSaveBillingCompany.fulfilled, (state, action) => {
      state.isSaving = false;
      state.error = null;
      // The save answers with the saved company but without the option lists the
      // read carries, so those are kept.
      state.company = state.company
        ? { ...action.payload, currencies: state.company.currencies, states: state.company.states, notes: state.company.notes, nextInvoiceNumber: state.company.nextInvoiceNumber }
        : action.payload;
    });
    builder.addCase(reqToSaveBillingCompany.rejected, (state, action) => {
      state.isSaving = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetTaxRates.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetTaxRates.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.taxRates = action.payload;
    });
    builder.addCase(reqToGetTaxRates.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetEmailTemplates.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetEmailTemplates.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.templates = action.payload.templates;
      state.placeholders = action.payload.placeholders;
    });
    builder.addCase(reqToGetEmailTemplates.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetPaymentGateways.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetPaymentGateways.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.gateways = action.payload;
    });
    builder.addCase(reqToGetPaymentGateways.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    // Every write answers with the row it changed, so the list is patched in place
    // rather than reloaded: a saved default clears the others, so those tax-rate
    // writes reload instead (see the tab).
    [reqToCreateTaxRate, reqToUpdateTaxRate, reqToDeleteTaxRate, reqToSaveEmailTemplate, reqToResetEmailTemplate, reqToSavePaymentGateway, reqToDeletePaymentGateway].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = (action.payload as { message?: string } | undefined)?.message || "An error occurred";
      });
    });

    builder.addCase(reqToUpdateTaxRate.fulfilled, (state, action) => {
      state.isSaving = false;
      state.taxRates = state.taxRates.map((row) => (row.id === action.payload.id ? action.payload : row));
    });
    builder.addCase(reqToCreateTaxRate.fulfilled, (state, action) => {
      state.isSaving = false;
      state.taxRates = [...state.taxRates, action.payload];
    });
    builder.addCase(reqToDeleteTaxRate.fulfilled, (state, action) => {
      state.isSaving = false;
      state.taxRates = state.taxRates.filter((row) => row.id !== action.payload.id);
    });
    [reqToSaveEmailTemplate, reqToResetEmailTemplate].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const saved = action.payload as EmailTemplate;
        state.templates = state.templates.map((row) => (row.key === saved.key ? saved : row));
      });
    });
    [reqToSavePaymentGateway, reqToDeletePaymentGateway].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const saved = action.payload as PaymentGateway;
        state.gateways = state.gateways.map((row) => (row.provider === saved.provider ? saved : row));
      });
    });
    builder.addCase(reqToGetAccounting.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetAccounting.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.accounting = action.payload.connections;
      state.syncableEntities = action.payload.syncableEntities;
      state.accountingNotes = action.payload.notes;
    });
    builder.addCase(reqToGetAccounting.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    builder.addCase(reqToGetAccountingSyncItems.fulfilled, (state, action) => {
      state.syncItems = action.payload;
    });

    // Connecting, saving settings, testing, disconnecting and retrying all share the
    // saving flag; each one that answers with the connection patches that row.
    [reqToConnectAccounting, reqToUpdateAccountingSettings, reqToTestAccounting, reqToDisconnectAccounting, reqToRetryAccountingSync].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = (action.payload as { message?: string } | undefined)?.message || "An error occurred";
      });
    });
    [reqToTestAccounting, reqToRetryAccountingSync].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state) => {
        state.isSaving = false;
      });
    });
    [reqToConnectAccounting, reqToUpdateAccountingSettings, reqToDisconnectAccounting].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const saved = action.payload as AccountingConnection;
        state.accounting = state.accounting.map((row) => (row.provider === saved.provider ? { ...saved, counts: row.counts } : row));
      });
    });
  },
});

export default billingSettingsSlice.reducer;
