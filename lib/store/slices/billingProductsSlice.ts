import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import {
  mapEmptyStateFromApi,
  mapPaginationFromApi,
  type ListEmptyState,
  type ListPagination,
} from "@/lib/lists/types";
import { mapProductDetailFromApi, mapProductFromApi } from "@/lib/products/mappers";
import {
  productErrorMessage,
  type BillingProduct,
  type BillingProductDetail,
  type BillingProductInput,
  type ProductStatus,
  type ProductStatusFilter,
  type ProductUnit,
} from "@/lib/products/types";
import type { ThunkArg } from "./leadAttachmentsSlice";

// The products and services this organization sells (SRS 7.8). Not
// `billingSettingsSlice`, which is how its invoices will be numbered and worded,
// and not `billingSlice`, which is what OrbitOps charges it.
//
// Products are not on the shared list contract (they have no owner, so no record
// scope and no column chooser), but the API answers the same pager and the same
// empty state, so both are mapped through `lib/lists/types`.

interface BillingProductsState {
  products: BillingProduct[];
  pagination: ListPagination | null;
  emptyState: ListEmptyState | null;
  hasAnyWithoutFilters: boolean;
  // The organization's business currency, which every price here is in.
  currency: string;
  // The API's own "invoicing isn't available yet" line, so the wording ships
  // from the server rather than being repeated here.
  messages: string[];
  invoicesAvailable: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: BillingProductsState = {
  products: [],
  pagination: null,
  emptyState: null,
  hasAnyWithoutFilters: false,
  currency: "INR",
  messages: [],
  invoicesAvailable: false,
  isLoading: false,
  isSaving: false,
  error: null,
};

export interface ProductListQuery {
  search?: string;
  // The API defaults to active only; this screen asks for "all" on purpose, so a
  // retired item can be found and brought back.
  status?: ProductStatusFilter;
  unit?: ProductUnit;
  sort_by?: string;
  sort_dir?: "ASC" | "DESC";
  page?: number;
  per_page?: number;
}

interface ProductListResult {
  products: BillingProduct[];
  pagination: ListPagination | null;
  emptyState: ListEmptyState | null;
  hasAnyWithoutFilters: boolean;
  currency: string;
  messages: string[];
  invoicesAvailable: boolean;
}

export const reqToGetProducts = createAsyncThunk<
  ProductListResult,
  Partial<ThunkArg<ProductListQuery, ProductListResult>>,
  { rejectValue: { message: string } }
>("billingProducts/list", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(apiRoutes.billingProducts, { params: data ?? {} });
    const body = response.data ?? {};
    const meta = body.meta ?? {};
    const result: ProductListResult = {
      products: ((body.data ?? []) as any[]).map(mapProductFromApi),
      pagination: mapPaginationFromApi(body.pagination),
      emptyState: mapEmptyStateFromApi(meta.empty_state),
      hasAnyWithoutFilters: meta.has_any_without_filters === true,
      currency: meta.currency ?? "INR",
      messages: Array.isArray(meta.messages) ? meta.messages.map(String) : [],
      invoicesAvailable: meta.invoices_available === true,
    };
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: productErrorMessage(error, "Couldn't load your products and services") });
  }
});

export const reqToGetProduct = createAsyncThunk<
  BillingProductDetail,
  Partial<ThunkArg<{ id: string }, BillingProductDetail>>,
  { rejectValue: { message: string } }
>("billingProducts/get", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.get(`${apiRoutes.billingProducts}/${data?.id}`);
    const result = mapProductDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: productErrorMessage(error, "Couldn't load that item") });
  }
});

export const reqToCreateProduct = createAsyncThunk<
  BillingProductDetail,
  Partial<ThunkArg<BillingProductInput, BillingProductDetail>>,
  { rejectValue: { message: string } }
>("billingProducts/create", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.post(apiRoutes.billingProducts, data ?? {});
    const result = mapProductDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: productErrorMessage(error, "Couldn't add that item") });
  }
});

export const reqToUpdateProduct = createAsyncThunk<
  BillingProductDetail,
  Partial<ThunkArg<{ id: string; values: BillingProductInput }, BillingProductDetail>>,
  { rejectValue: { message: string } }
>("billingProducts/update", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.patch(`${apiRoutes.billingProducts}/${data?.id}`, data?.values ?? {});
    const result = mapProductDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: productErrorMessage(error, "Couldn't save that item") });
  }
});

// Active ↔ inactive. There is no delete: an inactive item is kept out of new
// invoices and stays on the old ones, so nothing a tenant has billed is lost.
export const reqToSetProductStatus = createAsyncThunk<
  BillingProductDetail,
  Partial<ThunkArg<{ id: string; status: ProductStatus }, BillingProductDetail>>,
  { rejectValue: { message: string } }
>("billingProducts/setStatus", async ({ data, onSuccess, onFailure } = {}, { rejectWithValue }) => {
  try {
    const response = await Axios.patch(`${apiRoutes.billingProducts}/${data?.id}/status`, { status: data?.status });
    const result = mapProductDetailFromApi(response.data?.data ?? {});
    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return rejectWithValue({ message: productErrorMessage(error, "Couldn't change that item's status") });
  }
});

const billingProductsSlice = createSlice({
  name: "billingProducts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(reqToGetProducts.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(reqToGetProducts.fulfilled, (state, action) => {
      state.isLoading = false;
      state.error = null;
      state.products = action.payload.products;
      state.pagination = action.payload.pagination;
      state.emptyState = action.payload.emptyState;
      state.hasAnyWithoutFilters = action.payload.hasAnyWithoutFilters;
      state.currency = action.payload.currency;
      state.messages = action.payload.messages;
      state.invoicesAvailable = action.payload.invoicesAvailable;
    });
    builder.addCase(reqToGetProducts.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload?.message || "An error occurred";
    });

    // Create, edit and the status toggle all answer with the saved item, so each
    // one patches the row already in the list.
    [reqToCreateProduct, reqToUpdateProduct, reqToSetProductStatus].forEach((thunk) => {
      builder.addCase(thunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const saved = action.payload as BillingProductDetail;
        state.products = state.products.map((row) => (row.id === saved.id ? saved : row));
      });
      builder.addCase(thunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = (action.payload as { message?: string } | undefined)?.message || "An error occurred";
      });
    });

    builder.addCase(reqToGetProduct.rejected, (state, action) => {
      state.error = action.payload?.message || "An error occurred";
    });
  },
});

export default billingProductsSlice.reducer;
