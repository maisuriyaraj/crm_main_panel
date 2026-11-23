"use client";

import { useEffect } from "react";
import { CreditCard, Download, RefreshCw } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetInvoices, type TenantInvoice } from "@/lib/store/slices/billingSlice";
import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { notify } from "@/lib/commonFunctions";
import { apiErrorMessage } from "@/lib/auth/errors";
import { NoAccess } from "@/components/auth/no-access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

// Amounts arrive in the currency's smallest unit (paise, cents) as integers, so
// nothing is ever added up in floating point. Only the display divides.
const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

const dateText = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "secondary",
  pending: "default",
  overdue: "destructive",
  void: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Due",
  overdue: "Overdue",
  void: "Cancelled",
};

// What OrbitOps has charged this organization. Read only: paying is arranged with
// OrbitOps directly, there is no card on file to charge. Lives under /settings so
// it stays reachable when the subscription has ended, which is when it matters most.
export default function BillingPage() {
  const dispatch = useAppDispatch();
  const { can } = useAuth();
  const { invoices, totals, credit, isLoaded, isLoading, error, total } = useAppSelector((state) => state.billing);
  const allowed = can("billing.view");

  useEffect(() => {
    if (allowed) dispatch(reqToGetInvoices({ data: { page: 1 } }));
  }, [dispatch, allowed]);

  // Fires no request without the permission, so a typed-in URL costs nothing.
  if (!allowed) {
    return <NoAccess title="Billing" area="billing" module="billing" />;
  }

  const openPdf = async (invoice: TenantInvoice) => {
    try {
      const response = await Axios.get(`${apiRoutes.billingInvoices}/${invoice.id}/pdf`);
      const url = response.data?.data?.url;
      if (!url) throw new Error("no link");
      // A fresh short-lived link from storage, so it is opened rather than stored.
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      notify(apiErrorMessage(err, "Couldn't open that invoice yet. It is prepared shortly after it is issued."), { type: "error" });
    }
  };

  const columns: DataTableColumn<TenantInvoice>[] = [
    {
      key: "number",
      header: "Invoice",
      sortable: true,
      accessor: (row) => row.number,
      render: (row) => <span className="font-medium">{row.number ?? "—"}</span>,
    },
    {
      key: "issueDate",
      header: "Issued",
      sortable: true,
      accessor: (row) => row.issueDate,
      render: (row) => dateText(row.issueDate),
    },
    {
      key: "dueDate",
      header: "Due",
      sortable: true,
      accessor: (row) => row.dueDate,
      // Narrow phones get the essentials; due date is the first to go.
      className: "hidden sm:table-cell",
      render: (row) => dateText(row.dueDate),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (row) => row.status,
      render: (row) => (
        <span className="flex flex-wrap items-center gap-1">
          <Badge variant={STATUS_TONE[row.status] ?? "default"}>{STATUS_LABEL[row.status] ?? row.status}</Badge>
          {row.partlyPaid && <span className="text-xs text-muted-foreground">part paid</span>}
        </span>
      ),
    },
    {
      key: "totalMinor",
      header: "Amount",
      sortable: true,
      accessor: (row) => row.totalMinor,
      render: (row) => money(row.totalMinor, row.currency),
    },
    {
      key: "balanceMinor",
      header: "Outstanding",
      sortable: true,
      accessor: (row) => row.balanceMinor,
      className: "hidden md:table-cell",
      render: (row) => money(row.balanceMinor, row.currency),
    },
    {
      key: "pdf",
      header: "",
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => openPdf(row)}>
          <Download className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">PDF</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CreditCard className="size-6 text-primary" aria-hidden /> Billing
          </h1>
          <p className="mt-1 text-muted-foreground">
            What OrbitOps has invoiced your organization. To pay an invoice or change your plan, contact OrbitOps.
          </p>
        </div>
        <Button variant="outline" onClick={() => dispatch(reqToGetInvoices({ data: { page: 1 } }))} disabled={isLoading}>
          <RefreshCw className="size-4" aria-hidden /> Refresh
        </Button>
      </div>

      {(totals.length > 0 || credit.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {totals.map((row) => (
            <Card key={`owed-${row.currency}`}>
              <CardHeader className="pb-2">
                <CardDescription>Outstanding</CardDescription>
                <CardTitle className="text-2xl">{money(row.outstandingMinor, row.currency)}</CardTitle>
              </CardHeader>
              {row.overdueMinor > 0 && (
                <CardContent className="pt-0 text-sm text-destructive">
                  {money(row.overdueMinor, row.currency)} overdue
                </CardContent>
              )}
            </Card>
          ))}
          {credit
            .filter((row) => row.balanceMinor > 0)
            .map((row) => (
              <Card key={`credit-${row.currency}`}>
                <CardHeader className="pb-2">
                  <CardDescription>Credit with OrbitOps</CardDescription>
                  <CardTitle className="text-2xl">{money(row.balanceMinor, row.currency)}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  Applied automatically to your next invoice.
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {error && !isLoaded ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your invoices</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !isLoaded ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              {total === 0 ? "No invoices yet." : `${total} invoice${total === 1 ? "" : "s"}, newest first.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={invoices}
              getRowId={(row) => row.id}
              searchKeys={["number", "status"]}
              searchPlaceholder="Search invoices"
              isLoading={isLoading}
              emptyMessage="No invoices yet. Your first one appears after your billing period is invoiced."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
