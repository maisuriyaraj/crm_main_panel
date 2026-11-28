"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFromUrl } from "@/hooks/useCreateFromUrl";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToCreateProduct,
  reqToGetProducts,
  reqToSetProductStatus,
  reqToUpdateProduct,
  type ProductListQuery,
} from "@/lib/store/slices/billingProductsSlice";
import { reqToGetTaxRates } from "@/lib/store/slices/billingSettingsSlice";
import {
  mapProductApiErrorsToForm,
  mapProductFormToApi,
  type ProductFormValues,
} from "@/lib/products/mappers";
import {
  PRODUCT_UNITS,
  PRODUCT_UNIT_SHORT,
  PRODUCT_ERROR,
  formatMinor,
  productErrorCodeOf,
  productErrorMessage,
  productErrorTargetOf,
  taxRateLabel,
  type BillingProduct,
  type ProductErrorTarget,
  type ProductStatus,
  type ProductStatusFilter,
  type ProductUnit,
} from "@/lib/products/types";
import { DEFAULT_PER_PAGE, type ListSort, type PerPage } from "@/lib/lists/types";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";

import { NoAccess } from "@/components/auth/no-access";
import { ProductFormDialog, type ProductFormServerError } from "@/components/billing/product-form-dialog";
import { ProductSkuConflictDialog } from "@/components/billing/product-sku-conflict-dialog";
import { ServerList, type ServerListColumn } from "@/components/shared/server-list";
import { Truncated } from "@/components/shared/field-help";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// The products and services this organization sells (SRS 7.8, BI-PR1, BI-PR2).
//
// This is the management screen, so it shows active and inactive items together
// with a badge on each: an item is never deleted, and a tenant has to be able to
// find a retired one and bring it back. The API's own default is active only,
// which is what a future invoice item-picker asks for — not this list.
//
// Products are not on the shared list contract — they have no owner, so no
// record scope — so there is no column chooser and no saved views here. The API
// still answers the same pager and empty state, so the shared list surface is
// used for everything else.
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_FILTERS: Array<{ value: ProductStatusFilter; label: string }> = [
  { value: "all", label: "All items" },
  { value: "active", label: "Active only" },
  { value: "inactive", label: "Inactive only" },
];

const ALL_UNITS = "all";

export default function BillingProductsPage() {
  const { can } = useAuth();
  // `/auth/me` drops every products key while the billing module is off for the
  // organization, so this one check covers the plan, the feature flag and the role.
  if (!can("products.view")) {
    return <NoAccess title="Products & services" area="billing and invoices" module="invoices" />;
  }
  return <ProductsWorkspace />;
}

function ProductsWorkspace() {
  const dispatch = useAppDispatch();
  const params = useParams<{ orgnization: string }>();
  const orgSlug = params?.orgnization ?? "";
  const { can } = useAuth();
  const canManage = can("products.manage");

  const { products, pagination, emptyState, hasAnyWithoutFilters, currency, messages, isLoading, error } =
    useAppSelector((state) => state.billingProducts);
  // The organization's own rates, from Invoice settings: the form picks from
  // them rather than repeating a percentage per item.
  const taxRates = useAppSelector((state) => state.billingSettings.taxRates);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Both statuses by default: this is where a retired item is found again.
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [unit, setUnit] = useState<ProductUnit | typeof ALL_UNITS>(ALL_UNITS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPage>(DEFAULT_PER_PAGE);
  const [sort, setSort] = useState<ListSort>({ sortBy: "name", sortDir: "ASC" });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editProduct, setEditProduct] = useState<BillingProduct | null>(null);
  const [serverErrors, setServerErrors] = useState<ProductFormServerError[]>([]);
  const [skuConflict, setSkuConflict] = useState<ProductErrorTarget | null>(null);

  const query = useMemo<ProductListQuery>(
    () => ({
      search: search.trim() || undefined,
      status,
      unit: unit === ALL_UNITS ? undefined : unit,
      sort_by: sort.sortBy,
      sort_dir: sort.sortDir,
      page,
      per_page: perPage,
    }),
    [search, status, unit, sort, page, perPage],
  );

  const refresh = useCallback(() => {
    dispatch(reqToGetProducts({ data: query }));
  }, [dispatch, query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Fetched once for the form's tax-rate picker, not per open: the rates change
  // on the Invoice settings screen, not here.
  useEffect(() => {
    dispatch(reqToGetTaxRates({}));
  }, [dispatch]);

  // Typing a name should not fire a request per keystroke, and a new search
  // always starts at the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openCreate = useCallback(() => {
    setFormMode("create");
    setEditProduct(null);
    setServerErrors([]);
    setFormOpen(true);
  }, []);

  // Opens this form when the top bar's Create menu links here with ?new=1.
  useCreateFromUrl(openCreate);

  const openEdit = useCallback((product: BillingProduct) => {
    setFormMode("edit");
    setEditProduct(product);
    setServerErrors([]);
    setFormOpen(true);
  }, []);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setUnit(ALL_UNITS);
    setPage(1);
  };

  const hasFilters = search.trim() !== "" || status !== "all" || unit !== ALL_UNITS;

  const taxRatesHref = buildOrgRoute(orgSlug, pageRoutes.settingsBillingSettings);

  // Resolves false when the server rejected the write, so the dialog stays open
  // with the field errors on it and nothing typed is lost.
  const handleSubmit = (values: ProductFormValues): Promise<boolean> =>
    new Promise((resolve) => {
      setServerErrors([]);
      const body = mapProductFormToApi(values);

      const onFailure = (failure: any) => {
        const data = failure?.response?.data;

        // A clashing item code has one way forward — look at the item that holds
        // it — so it gets its own dialog rather than a field error with no action.
        if (productErrorCodeOf(failure) === PRODUCT_ERROR.skuAlreadyExists) {
          setSkuConflict(productErrorTargetOf(failure));
          resolve(false);
          return;
        }

        const fieldErrors = mapProductApiErrorsToForm(data?.errors);
        if (fieldErrors.length) {
          setServerErrors(fieldErrors);
        } else {
          notify(productErrorMessage(failure, "Something went wrong"), { type: "error" });
        }
        resolve(false);
      };

      const onSuccess = () => {
        notify(formMode === "create" ? "Item added" : "Item saved", { type: "success" });
        refresh();
        resolve(true);
      };

      if (formMode === "create") {
        dispatch(reqToCreateProduct({ data: body, onSuccess, onFailure }));
      } else if (editProduct) {
        dispatch(reqToUpdateProduct({ data: { id: editProduct.id, values: body }, onSuccess, onFailure }));
      } else {
        resolve(false);
      }
    });

  // Active ↔ inactive is the only way an item leaves the list: SRS 7.8 has no
  // delete, because an invoice must keep reading correctly forever.
  const handleToggleStatus = (product: BillingProduct) => {
    const next: ProductStatus = product.status === "active" ? "inactive" : "active";
    dispatch(
      reqToSetProductStatus({
        data: { id: product.id, status: next },
        onSuccess: () => {
          notify(next === "active" ? `${product.name} is active again` : `${product.name} is now inactive`, {
            type: "success",
          });
          refresh();
        },
        onFailure: (failure: any) => {
          // Reactivating can clash with another item that took this code
          // meanwhile; it is the same warning as on save.
          if (productErrorCodeOf(failure) === PRODUCT_ERROR.skuAlreadyExists) {
            setSkuConflict(productErrorTargetOf(failure));
            return;
          }
          notify(productErrorMessage(failure, "Couldn't change that item's status"), { type: "error" });
        },
      }),
    );
  };

  const columns: ServerListColumn<BillingProduct>[] = [
    {
      key: "name",
      header: "Item",
      sortBy: "name",
      render: (row) => (
        <div className="min-w-0">
          <Truncated value={row.name} className="font-medium" />
          {row.description && <p className="truncate text-xs text-muted-foreground">{row.description}</p>}
        </div>
      ),
    },
    { key: "sku", header: "Code", sortBy: "sku", render: (row) => <Truncated value={row.sku} /> },
    {
      key: "unit_price_minor",
      header: "Unit price",
      sortBy: "unit_price_minor",
      className: "text-right",
      render: (row) => <span className="text-sm tabular-nums">{formatMinor(row.unitPriceMinor, row.currency)}</span>,
    },
    {
      key: "unit",
      header: "Per",
      render: (row) => <span className="text-sm">{PRODUCT_UNIT_SHORT[row.unit]}</span>,
    },
    {
      key: "tax_rate",
      header: "Tax",
      render: (row) => (
        <span className={`text-sm ${row.taxRate && !row.taxRate.active ? "text-amber-600 dark:text-amber-500" : ""}`}>
          {taxRateLabel(row.taxRate)}
        </span>
      ),
    },
    { key: "hsn_sac_code", header: "HSN / SAC", render: (row) => row.hsnSacCode ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "secondary" : "outline"}>
          {row.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const trailing: ServerListColumn<BillingProduct>[] = canManage
    ? [
        {
          key: "actions",
          header: "",
          className: "w-44 text-right",
          render: (row) => (
            <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    {row.status === "active" ? "Make inactive" : "Make active"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {row.status === "active" ? `Make ${row.name} inactive?` : `Make ${row.name} active again?`}
                    </AlertDialogTitle>
                    {/* BI-PR2 in plain words: this is the whole point of there being no delete. */}
                    <AlertDialogDescription>
                      {row.status === "active"
                        ? "It stops being offered on new invoices. Nothing is deleted, and any invoice it is already on keeps it exactly as it was — including its name, price and tax at the time."
                        : "It can go on new invoices again and will show as active in your list."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleToggleStatus(row)}>
                      {row.status === "active" ? "Make inactive" : "Make active"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ),
        },
      ]
    : [];

  const hasRetiredRate = products.some((row) => row.taxRate && !row.taxRate.active);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Package className="size-6 text-primary" aria-hidden /> Products &amp; services
          </h1>
          <p className="text-sm text-muted-foreground">
            What you sell, and what it costs.{" "}
            {pagination ? `${pagination.total.toLocaleString("en-IN")} ${pagination.total === 1 ? "item" : "items"}.` : ""}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            New item
          </Button>
        )}
      </div>

      {/* Said once here rather than on every row, and it is what the catalogue is for. */}
      <Alert>
        <AlertTitle>This is your price list for invoices</AlertTitle>
        <AlertDescription>
          {messages[0] ?? "Invoicing is not available yet."} Build the list up now and each item will fill in an
          invoice line in one click — its name, price, unit, tax and HSN/SAC code — once creating invoices is ready.
          An invoice keeps its own copy of what was sold, so changing an item here never changes an invoice already sent.
        </AlertDescription>
      </Alert>

      {!canManage && (
        <Alert>
          <AlertTitle>You can look, but not change</AlertTitle>
          <AlertDescription>
            Adding or editing an item needs the &quot;Manage products and services&quot; permission — ask an owner or
            admin.
          </AlertDescription>
        </Alert>
      )}

      {hasRetiredRate && (
        <Alert>
          <AlertTitle>Some items use a tax rate you&apos;ve turned off</AlertTitle>
          <AlertDescription>
            Those are marked in the Tax column. Pick an active rate for them, or turn that rate back on in{" "}
            <Link href={taxRatesHref} className="underline">
              Invoice settings
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your products and services</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, code or description..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ProductStatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={unit}
          onValueChange={(value) => {
            setUnit(value as ProductUnit | typeof ALL_UNITS);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_UNITS}>Any unit</SelectItem>
            {PRODUCT_UNITS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <ServerList<BillingProduct>
        rows={products}
        getRowId={(row) => row.id}
        columns={columns}
        trailing={trailing}
        isLoading={isLoading}
        pagination={pagination}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(next) => {
          setPerPage(next);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(sortBy, sortDir) => {
          setSort({ sortBy, sortDir });
          setPage(1);
        }}
        emptyState={emptyState}
        noun="item"
        nounPlural="items"
        hasFilters={hasFilters}
        hasAnyWithoutFilters={hasAnyWithoutFilters}
        onClearFilters={clearFilters}
        createAction={canManage ? { label: "New item", onClick: openCreate } : undefined}
        // There is no item page: a row opens the form it is edited in, which is
        // the only thing there is to do with one.
        onRowClick={canManage ? (row) => openEdit(row) : undefined}
      />

      <ProductFormDialog
        mode={formMode}
        initialProduct={editProduct ?? undefined}
        currency={currency}
        taxRates={taxRates}
        taxRatesHref={taxRatesHref}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
      />

      <ProductSkuConflictDialog
        product={skuConflict}
        open={!!skuConflict}
        onOpenChange={(open) => !open && setSkuConflict(null)}
        onOpenProduct={(target) => {
          setSkuConflict(null);
          // The item holding the code may be inactive and so not in the current
          // page: it is looked for in what is loaded, and when it is not there
          // the filters are cleared so it can be found.
          const loaded = products.find((row) => row.id === target.id);
          if (loaded) {
            openEdit(loaded);
          } else {
            setFormOpen(false);
            clearFilters();
            setSearchInput(target.sku ?? target.name);
            notify(`Showing all items so you can find ${target.name}.`, { type: "info" });
          }
        }}
      />
    </div>
  );
}
