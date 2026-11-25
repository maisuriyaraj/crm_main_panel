import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import type { ThunkArg } from "./leadAttachmentsSlice";

// What OrbitOps has invoiced this organization, and asking OrbitOps about a
// different plan. The invoices are read only: only OrbitOps issues, voids or
// records payment against one. A tenant cannot change its own plan either, so the
// one write here sends a message rather than making a change.
export interface TenantInvoice {
  id: string;
  number: string | null;
  status: string;
  kind: string;
  currency: string;
  totalMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  issueDate: string | null;
  dueDate: string | null;
  partlyPaid: boolean;
}

// What is still owed, per currency: one organization can hold invoices in more
// than one, so a single total would be wrong to add up.
export interface OwedTotal {
  currency: string;
  outstandingMinor: number;
  overdueMinor: number;
}

export interface CreditBalance {
  currency: string;
  balanceMinor: number;
}

// The filters the API takes. A draft invoice is never shown to a tenant, so DRAFT
// is not one of them.
export type InvoiceStatusFilter = "PENDING" | "PAID" | "OVERDUE" | "VOID";

export interface InvoiceQuery {
  page?: number;
  status?: InvoiceStatusFilter | null;
  issue_from?: string | null;
  issue_to?: string | null;
}

interface BillingState {
  invoices: TenantInvoice[];
  totals: OwedTotal[];
  credit: CreditBalance[];
  page: number;
  totalPages: number;
  total: number;
  isLoaded: boolean;
  isLoading: boolean;
  isRequestingUpgrade: boolean;
  error: string | null;
}

const initialState: BillingState = {
  invoices: [],
  totals: [],
  credit: [],
  page: 1,
  totalPages: 1,
  total: 0,
  isLoaded: false,
  isLoading: false,
  isRequestingUpgrade: false,
  error: null,
};

const num = (value: unknown) => Number(value ?? 0);

const mapInvoice = (row: Record<string, unknown>): TenantInvoice => ({
  id: String(row.id),
  number: (row.number as string) ?? null,
  status: (row.status as string) ?? "pending",
  kind: (row.kind as string) ?? "subscription",
  currency: (row.currency as string) ?? "INR",
  totalMinor: num(row.total_minor),
  amountPaidMinor: num(row.amount_paid_minor),
  balanceMinor: num(row.balance_minor),
  issueDate: (row.issue_date as string) ?? null,
  dueDate: (row.due_date as string) ?? null,
  partlyPaid: row.partly_paid === true,
});

type InvoicesResult = Pick<BillingState, "invoices" | "totals" | "credit" | "page" | "totalPages" | "total">;

export const reqToGetInvoices = createAsyncThunk<
  InvoicesResult,
  Partial<ThunkArg<InvoiceQuery | null, InvoicesResult>>,
  { rejectValue: { message: string } }
>(
  "billing/reqToGetInvoices",
  async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      // Only the filters that are set are sent: an empty one would be refused.
      const params: Record<string, string | number> = { page: data?.page ?? 1 };
      if (data?.status) params.status = data.status;
      if (data?.issue_from) params.issue_from = data.issue_from;
      if (data?.issue_to) params.issue_to = data.issue_to;
      const response = await Axios.get(apiRoutes.billingInvoices, { params });
      const body = response.data ?? {};
      const result: InvoicesResult = {
        invoices: (body.data ?? []).map(mapInvoice),
        totals: (body.totals ?? []).map((row: Record<string, unknown>) => ({
          currency: (row.currency as string) ?? "INR",
          outstandingMinor: num(row.outstanding_minor),
          overdueMinor: num(row.overdue_minor),
        })),
        credit: (body.credit ?? []).map((row: Record<string, unknown>) => ({
          currency: (row.currency as string) ?? "INR",
          balanceMinor: num(row.balance_minor),
        })),
        page: num(body.pagination?.page) || 1,
        totalPages: num(body.pagination?.totalPages) || 1,
        total: num(body.pagination?.total),
      };

      onSuccess?.(result);
      return result;
    } catch (error: unknown) {
      onFailure?.(error);

      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || "Couldn't load your invoices";
      return rejectWithValue({ message });
    }
  },
);

// Asking OrbitOps about a different plan. `queued` says whether the email went;
// either way OrbitOps staff see the request, and the API's own sentence is what
// the dialog shows.
export interface UpgradeRequestResult {
  queued: boolean;
  message: string;
  planName: string | null;
}

export const reqToRequestUpgrade = createAsyncThunk<
  UpgradeRequestResult,
  Partial<ThunkArg<{ message?: string | null } | null, UpgradeRequestResult>>,
  { rejectValue: { message: string } }
>(
  "billing/reqToRequestUpgrade",
  async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const body = data?.message ? { message: data.message } : {};
      const response = await Axios.post(apiRoutes.billingUpgradeRequest, body);
      const payload = response.data?.data ?? {};
      const result: UpgradeRequestResult = {
        queued: payload.queued === true,
        message: payload.message ?? "Your request has been sent to the OrbitOps team.",
        planName: payload.plan_name ?? null,
      };
      onSuccess?.(result);
      return result;
    } catch (error: unknown) {
      onFailure?.(error);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || "Couldn't send your request";
      return rejectWithValue({ message });
    }
  },
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(reqToGetInvoices.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetInvoices.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.isLoaded = true;
      state.invoices = action.payload.invoices;
      state.totals = action.payload.totals;
      state.credit = action.payload.credit;
      state.page = action.payload.page;
      state.totalPages = action.payload.totalPages;
      state.total = action.payload.total;
    });
    builder.addCase(reqToGetInvoices.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });
    // The request changes nothing here, so only its own button's state is kept;
    // its failure is shown by the dialog, not on the invoice list.
    builder.addCase(reqToRequestUpgrade.pending, (state) => {
      state.isRequestingUpgrade = true;
    });
    builder.addCase(reqToRequestUpgrade.fulfilled, (state) => {
      state.isRequestingUpgrade = false;
    });
    builder.addCase(reqToRequestUpgrade.rejected, (state) => {
      state.isRequestingUpgrade = false;
    });
  },
});

export default billingSlice.reducer;
