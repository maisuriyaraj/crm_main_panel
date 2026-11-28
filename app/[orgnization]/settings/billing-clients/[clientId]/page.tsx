"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Pencil, ReceiptText } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  clearActiveClient,
  reqToGetClient,
  reqToSetClientStatus,
  reqToUpdateClient,
} from "@/lib/store/slices/billingClientsSlice";
import {
  mapClientApiErrorsToForm,
  mapClientFormToApi,
  type ClientFormValues,
} from "@/lib/clients/mappers";
import {
  CLIENT_ERROR,
  PAYMENT_TERMS_SHORT,
  addressLines,
  clientErrorCodeOf,
  clientErrorMatchedOn,
  clientErrorMessage,
  clientErrorTargetOf,
  creditLimitLabel,
  formatMinor,
  type BillingClientDetail,
  type ClientErrorTarget,
  type ClientStatus,
} from "@/lib/clients/types";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";

import { NoAccess } from "@/components/auth/no-access";
import { ClientDuplicateDialog } from "@/components/billing/client-duplicate-dialog";
import { ClientFormDialog, type ClientFormServerError } from "@/components/billing/client-form-dialog";
import { CreditLimitWarning } from "@/components/billing/credit-limit-warning";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

// One client (SRS 7.7, BI-CL2): their profile, the CRM lead they came from, and
// where their invoices, payments and balance will go.
//
// Those last three cannot be shown: no invoice exists anywhere in the product
// yet. The API answers them as empty with `invoicesAvailable: false`, and this
// page says so in words — an empty "No invoices" table would read as "never
// invoiced", which is a different claim and not one anybody can make.
export default function BillingClientPage() {
  const { can } = useAuth();
  if (!can("clients.view")) {
    return <NoAccess title="Client" area="billing and invoices" module="invoices" />;
  }
  return <ClientDetail />;
}

function ClientDetail() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ orgnization: string; clientId: string }>();
  const orgSlug = params?.orgnization ?? "";
  const clientId = params?.clientId ?? "";
  const { can } = useAuth();
  const canManage = can("clients.manage");

  const { activeClient, isLoadingOne, error } = useAppSelector((state) => state.billingClients);

  const [formOpen, setFormOpen] = useState(false);
  const [serverErrors, setServerErrors] = useState<ClientFormServerError[]>([]);
  const [duplicate, setDuplicate] = useState<{ client: ClientErrorTarget | null; matchedOn: string[] } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    dispatch(reqToGetClient({ data: { id: clientId } }));
    // Dropped on the way out, so the next client never opens showing this one.
    return () => {
      dispatch(clearActiveClient());
    };
  }, [dispatch, clientId]);

  const clientsHref = buildOrgRoute(orgSlug, pageRoutes.billingClients);

  const handleSubmit = (values: ClientFormValues): Promise<boolean> =>
    new Promise((resolve) => {
      setServerErrors([]);
      dispatch(
        reqToUpdateClient({
          data: { id: clientId, values: mapClientFormToApi(values) },
          onSuccess: () => {
            notify("Client saved", { type: "success" });
            resolve(true);
          },
          onFailure: (failure: any) => {
            if (clientErrorCodeOf(failure) === CLIENT_ERROR.alreadyExists) {
              setDuplicate({ client: clientErrorTargetOf(failure), matchedOn: clientErrorMatchedOn(failure) });
              resolve(false);
              return;
            }
            const fieldErrors = mapClientApiErrorsToForm(failure?.response?.data?.errors);
            if (fieldErrors.length) {
              setServerErrors(fieldErrors);
            } else {
              notify(clientErrorMessage(failure, "Couldn't save that client"), { type: "error" });
            }
            resolve(false);
          },
        }),
      );
    });

  const handleToggleStatus = (client: BillingClientDetail) => {
    const next: ClientStatus = client.status === "active" ? "inactive" : "active";
    dispatch(
      reqToSetClientStatus({
        data: { id: client.id, status: next },
        onSuccess: () =>
          notify(next === "active" ? `${client.companyName} is active again` : `${client.companyName} is now inactive`, {
            type: "success",
          }),
        onFailure: (failure: any) => {
          if (clientErrorCodeOf(failure) === CLIENT_ERROR.alreadyExists) {
            setDuplicate({ client: clientErrorTargetOf(failure), matchedOn: clientErrorMatchedOn(failure) });
            return;
          }
          notify(clientErrorMessage(failure, "Couldn't change that client's status"), { type: "error" });
        },
      }),
    );
  };

  if (isLoadingOne && !activeClient) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Button variant="ghost" asChild>
          <Link href={clientsHref}>
            <ArrowLeft className="mr-1 size-4" /> All clients
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t open that client</AlertTitle>
          <AlertDescription>{error ?? "It may have been removed."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const client = activeClient;
  const billing = addressLines(client.billingAddress);
  const shipping = addressLines(client.shippingAddress);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={clientsHref}>
            <ArrowLeft className="mr-1 size-4" /> All clients
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{client.companyName}</h1>
            <Badge variant={client.status === "active" ? "secondary" : "outline"}>
              {client.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
          {client.contactPerson && <p className="text-muted-foreground">{client.contactPerson}</p>}
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="mr-1 size-4" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost">{client.status === "active" ? "Deactivate" : "Activate"}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {client.status === "active"
                      ? `Make ${client.companyName} inactive?`
                      : `Make ${client.companyName} active again?`}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {client.status === "active"
                      ? "They stop being offered on new invoices. Nothing is deleted, and any invoice already raised for them is kept exactly as it is."
                      : "They can be invoiced again and will appear in your active list."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleToggleStatus(client)}>
                    {client.status === "active" ? "Make inactive" : "Make active"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {client.status === "inactive" && (
        <Alert>
          <AlertTitle>This client is inactive</AlertTitle>
          <AlertDescription>
            They won&apos;t be offered on a new invoice. Anything already raised for them is kept. Activate them again
            to bill them.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={client.phone} />
            <Field label="GSTIN / tax id" value={client.gstin} />
            <Field
              label="Payment terms"
              value={`${PAYMENT_TERMS_SHORT[client.paymentTerms]}${
                client.paymentTermsDays !== null ? ` (${client.paymentTermsDays} days)` : ""
              }`}
            />
            <Field
              label={`Credit limit (${client.creditLimitCurrency})`}
              value={creditLimitLabel(client.creditLimitMinor, client.creditLimitCurrency)}
            />
            <Field label="Tax" value={client.taxExempt ? "Tax exempt" : "Taxed as normal"} />

            <div className="sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing address</p>
              {billing.length ? (
                <address className="mt-1 whitespace-pre-line text-sm not-italic">{billing.join("\n")}</address>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Not set</p>
              )}
            </div>

            <div className="sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shipping address</p>
              {client.shippingSameAsBilling ? (
                <p className="mt-1 text-sm text-muted-foreground">Same as the billing address</p>
              ) : shipping.length ? (
                <address className="mt-1 whitespace-pre-line text-sm not-italic">{shipping.join("\n")}</address>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Not set</p>
              )}
            </div>

            {client.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* BI-CL2's link back to the CRM lead this client came from. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where this client came from</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {client.sourceLead ? (
                <>
                  <p className="font-medium">{client.sourceLead.name ?? `Lead #${client.sourceLead.id}`}</p>
                  {client.sourceLead.deleted ? (
                    // A deleted lead is named but not linked: the client did come
                    // from it, and a link to a deleted record reads as broken.
                    <p className="text-muted-foreground">
                      Converted from a lead that has since been deleted, so there is nothing left to open.
                    </p>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${buildOrgRoute(orgSlug, pageRoutes.leads)}?lead=${client.sourceLead.id}`}>
                        Open the lead <ExternalLink className="ml-1 size-3.5" />
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Added by hand, not converted from a lead.
                  {client.createdBy ? ` Added by ${client.createdBy.fullName}.` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <Row label="Outstanding" value={formatMinor(client.outstandingBalance, client.totals.currency)} />
                <Row label="Invoiced" value={formatMinor(client.totals.invoicedMinor, client.totals.currency)} />
                <Row label="Paid" value={formatMinor(client.totals.paidMinor, client.totals.currency)} />
                <Row label="Overdue" value={formatMinor(client.totals.overdueMinor, client.totals.currency)} />
                {/* The limit itself is in the Details card above, and the
                    warning below states it again in words; a third copy here
                    would just be a number to reconcile. */}
                {client.credit.hasLimit && (
                  <Row label="Credit left" value={formatMinor(client.credit.availableMinor, client.credit.currency)} />
                )}
              </div>

              {/* BI-CL3's warning, in the one state it can be in today: the limit
                  is real, what they owe is not knowable, so it says so. The same
                  component is what the invoice form will warn with. */}
              <CreditLimitWarning
                client={client}
                clientName={client.companyName}
                currency={client.credit.currency}
                currentOutstandingMinor={client.credit.outstandingMinor}
              />

              <p className="text-xs text-muted-foreground">
                Nothing can be worked out yet: there are no invoices or payments in OrbitOps.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Where BI-CL2's invoices and payments will go. Said in words rather than
          shown as an empty table, which would read as "never invoiced". */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-primary" aria-hidden /> Invoices and payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.invoicesAvailable ? (
            <p className="text-sm text-muted-foreground">No invoices for this client yet.</p>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-6 text-sm">
              <FileText className="size-6 text-muted-foreground" aria-hidden />
              <div className="space-y-1">
                <p className="font-medium">
                  {client.messages[0] ?? "Invoicing is not available yet."}
                </p>
                <p className="text-muted-foreground">
                  Creating, sending and getting paid for a client invoice is still being built. When it arrives, this
                  client&apos;s invoices, payments and outstanding balance will show here — and you&apos;ll be warned if
                  an invoice would take them past their credit limit.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={buildOrgRoute(orgSlug, pageRoutes.settingsBillingSettings)}>
                  Set up your invoice details
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        mode="edit"
        initialClient={client}
        currency={client.creditLimitCurrency}
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
        onOpenClient={(id) => {
          setDuplicate(null);
          setFormOpen(false);
          router.push(`${clientsHref}/${id}`);
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm">{value || <span className="text-muted-foreground">Not set</span>}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
