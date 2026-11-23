import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import type { ThunkArg } from "./leadAttachmentsSlice";

// What OrbitOps has invoiced this organization. Read only: only OrbitOps issues,
// voids or records payment against one, so there is nothing to write from here.
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

interface BillingState {
  invoices: TenantInvoice[];
  totals: OwedTotal[];
  credit: CreditBalance[];
  page: number;
  totalPages: number;
  total: number;
  isLoaded: boolean;
  isLoading: boolean;
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
  Partial<ThunkArg<{ page?: number } | null, InvoicesResult>>,
  { rejectValue: { message: string } }
>(
  "billing/reqToGetInvoices",
  async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
    try {
      const response = await Axios.get(apiRoutes.billingInvoices, { params: { page: data?.page ?? 1 } });
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
  },
});

export default billingSlice.reducer;
