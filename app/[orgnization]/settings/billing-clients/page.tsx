"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFromUrl } from "@/hooks/useCreateFromUrl";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToCreateClient,
  reqToGetClients,
  reqToSetClientStatus,
  reqToUpdateClient,
  type ClientListQuery,
} from "@/lib/store/slices/billingClientsSlice";
import {
  mapClientApiErrorsToForm,
  mapClientFormToApi,
  type ClientFormValues,
} from "@/lib/clients/mappers";
import {
  CLIENT_ERROR,
  PAYMENT_TERMS_SHORT,
  clientErrorCodeOf,
  clientErrorMatchedOn,
  clientErrorMessage,
  clientErrorTargetOf,
  creditLimitLabel,
  type BillingClient,
  type ClientErrorTarget,
  type ClientStatus,
} from "@/lib/clients/types";
import { DEFAULT_PER_PAGE, type ListSort, type PerPage } from "@/lib/lists/types";
import { billingClientRoute, buildOrgRoute } from "@/lib/constants";

import { NoAccess } from "@/components/auth/no-access";
import { ClientDuplicateDialog } from "@/components/billing/client-duplicate-dialog";
import { ClientFormDialog, type ClientFormServerError } from "@/components/billing/client-form-dialog";
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

// The clients this organization invoices (SRS 7.7, BI-CL1).
//
// Not the OrbitOps invoices the organization receives (that is /settings/billing)
// and not its CRM contacts. Nothing can be invoiced yet, which the page says once
// rather than on every row.
//
// Clients are not on the shared list contract — they have no owner, so no record
// scope — so there is no column chooser and no saved views here. The API still
// answers the same pager and empty state, so the shared list surface is used for
// everything else.
const SEARCH_DEBOUNCE_MS = 350;

export default function BillingClientsPage() {
  const { can } = useAuth();
  // `/auth/me` drops every clients key while the billing module is off for the
  // organization, so this one check covers the plan, the feature flag and the role.
  if (!can("clients.view")) {
    return <NoAccess title="Clients" area="billing and invoices" module="invoices" />;
  }
  return <ClientsWorkspace />;
}

function ClientsWorkspace() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ orgnization: string }>();
  const orgSlug = params?.orgnization ?? "";
  const { can } = useAuth();
  const canManage = can("clients.manage");

  const { clients, pagination, emptyState, hasAnyWithoutFilters, currency, isLoading, error } = useAppSelector(
    (state) => state.billingClients,
  );

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPage>(DEFAULT_PER_PAGE);
  const [sort, setSort] = useState<ListSort>({ sortBy: "company_name", sortDir: "ASC" });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editClient, setEditClient] = useState<BillingClient | null>(null);
  const [serverErrors, setServerErrors] = useState<ClientFormServerError[]>([]);
  const [duplicate, setDuplicate] = useState<{ client: ClientErrorTarget | null; matchedOn: string[] } | null>(null);

  const query = useMemo<ClientListQuery>(
    () => ({
      search: search.trim() || undefined,
      status,
      sort_by: sort.sortBy,
      sort_dir: sort.sortDir,
      page,
      per_page: perPage,
    }),
    [search, status, sort, page, perPage],
  );

  const refresh = useCallback(() => {
    dispatch(reqToGetClients({ data: query }));
  }, [dispatch, query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Typing a name should not fire a request per keystroke, and a new search
  // always starts at the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openClient = (clientId: string) => router.push(buildOrgRoute(orgSlug, billingClientRoute(clientId)));

  const openCreate = useCallback(() => {
    setFormMode("create");
    setEditClient(null);
    setServerErrors([]);
    setFormOpen(true);
  }, []);

  // Opens this form when the top bar's Create menu links here with ?new=1.
  useCreateFromUrl(openCreate);

  const openEdit = (client: BillingClient) => {
    setFormMode("edit");
    setEditClient(client);
    setServerErrors([]);
    setFormOpen(true);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("active");
    setPage(1);
  };

  const hasFilters = search.trim() !== "" || status !== "active";

  // Resolves false when the server rejected the write, so the dialog stays open
  // with the field errors on it and nothing typed is lost.
  const handleSubmit = (values: ClientFormValues): Promise<boolean> =>
    new Promise((resolve) => {
      setServerErrors([]);
      const body = mapClientFormToApi(values);

      const onFailure = (failure: any) => {
        const data = failure?.response?.data;

        // A duplicate has one way forward — open the client that already exists —
        // so it gets its own dialog rather than a field error with no action.
        if (clientErrorCodeOf(failure) === CLIENT_ERROR.alreadyExists) {
          setDuplicate({ client: clientErrorTargetOf(failure), matchedOn: clientErrorMatchedOn(failure) });
          resolve(false);
          return;
        }

        const fieldErrors = mapClientApiErrorsToForm(data?.errors);
        if (fieldErrors.length) {
          setServerErrors(fieldErrors);
        } else {
          notify(clientErrorMessage(failure, "Something went wrong"), { type: "error" });
        }
        resolve(false);
      };

      const onSuccess = () => {
        notify(formMode === "create" ? "Client added" : "Client saved", { type: "success" });
        refresh();
        resolve(true);
      };

      if (formMode === "create") {
        dispatch(reqToCreateClient({ data: body, onSuccess, onFailure }));
      } else if (editClient) {
        dispatch(reqToUpdateClient({ data: { id: editClient.id, values: body }, onSuccess, onFailure }));
      } else {
        resolve(false);
      }
    });

  // Active ↔ inactive is the only way a client leaves the list: SRS 7.7 has no
  // delete, because an invoice must keep reading correctly forever.
  const handleToggleStatus = (client: BillingClient) => {
    const next: ClientStatus = client.status === "active" ? "inactive" : "active";
    dispatch(
      reqToSetClientStatus({
        data: { id: client.id, status: next },
        onSuccess: () => {
          notify(next === "active" ? `${client.companyName} is active again` : `${client.companyName} is now inactive`, {
            type: "success",
          });
          refresh();
        },
        onFailure: (failure: any) => {
          // Reactivating can clash with another active client that took this
          // email or phone meanwhile; it is the same warning as on create.
          if (clientErrorCodeOf(failure) === CLIENT_ERROR.alreadyExists) {
            setDuplicate({ client: clientErrorTargetOf(failure), matchedOn: clientErrorMatchedOn(failure) });
            return;
          }
          notify(clientErrorMessage(failure, "Couldn't change that client's status"), { type: "error" });
        },
      }),
    );
  };

  const columns: ServerListColumn<BillingClient>[] = [
    {
      key: "company_name",
      header: "Client",
      sortBy: "company_name",
      render: (row) => (
        <div className="min-w-0">
          <Truncated value={row.companyName} className="font-medium" />
          {row.contactPerson && <p className="truncate text-xs text-muted-foreground">{row.contactPerson}</p>}
        </div>
      ),
    },
    { key: "email", header: "Email", render: (row) => <Truncated value={row.email} /> },
    { key: "phone", header: "Phone", render: (row) => row.phone ?? "—" },
    { key: "gstin", header: "GSTIN / tax id", render: (row) => <Truncated value={row.gstin} /> },
    {
      key: "payment_terms",
      header: "Terms",
      render: (row) => <span className="text-sm">{PAYMENT_TERMS_SHORT[row.paymentTerms]}</span>,
    },
    {
      key: "credit_limit",
      header: "Credit limit",
      className: "text-right",
      render: (row) => (
        <span className="text-sm tabular-nums">{creditLimitLabel(row.creditLimitMinor, row.creditLimitCurrency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "secondary" : "outline"}>
          {row.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "source_lead",
      header: "From lead",
      render: (row) => (row.sourceLead ? <Truncated value={row.sourceLead.name ?? `Lead #${row.sourceLead.id}`} /> : "—"),
    },
  ];

  const trailing: ServerListColumn<BillingClient>[] = canManage
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
                    {row.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {row.status === "active" ? `Make ${row.companyName} inactive?` : `Make ${row.companyName} active again?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {row.status === "active"
                        ? "They stop being offered on new invoices. Nothing is deleted, and any invoice already raised for them is kept exactly as it is."
                        : "They can be invoiced again and will appear in your active list."}
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

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="size-6 text-primary" aria-hidden /> Clients
          </h1>
          <p className="text-sm text-muted-foreground">
            The companies you invoice.{" "}
            {pagination ? `${pagination.total.toLocaleString("en-IN")} ${status === "active" ? "active" : "inactive"}.` : ""}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            New client
          </Button>
        )}
      </div>

      {/* Said once here rather than on every row. */}
      <Alert>
        <AlertTitle>Invoicing isn&apos;t available yet</AlertTitle>
        <AlertDescription>
          You can keep your client list, their tax details and their terms here now. Creating and sending an invoice is
          still being built, so a client has no invoices or balance yet.
        </AlertDescription>
      </Alert>

      {!canManage && (
        <Alert>
          <AlertTitle>You can look, but not change</AlertTitle>
          <AlertDescription>
            Adding or editing a client needs the &quot;Manage clients&quot; permission — ask an owner or admin.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your clients</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search company, contact, email or phone..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ClientStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active clients</SelectItem>
            <SelectItem value="inactive">Inactive clients</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <ServerList<BillingClient>
        rows={clients}
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
        noun="client"
        nounPlural="clients"
        hasFilters={hasFilters}
        hasAnyWithoutFilters={hasAnyWithoutFilters}
        onClearFilters={clearFilters}
        createAction={canManage ? { label: "New client", onClick: openCreate } : undefined}
        onRowClick={(row) => openClient(row.id)}
      />

      <ClientFormDialog
        mode={formMode}
        initialClient={editClient ?? undefined}
        currency={currency}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
      />

      <ClientDuplicateDialog
        client={duplicate?.client ?? null}
        matchedOn={duplicate?.matchedOn ?? []}
        open={!!duplicate}
        onOpenChange={(open) => !open && setDuplicate(null)}
        onOpenClient={(clientId) => {
          setDuplicate(null);
          setFormOpen(false);
          openClient(clientId);
        }}
      />
    </div>
  );
}
