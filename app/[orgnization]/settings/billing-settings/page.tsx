"use client";

import { useEffect } from "react";
import { ReceiptText } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToGetAccounting,
  reqToGetBillingCompany,
  reqToGetEmailTemplates,
  reqToGetPaymentGateways,
  reqToGetTaxRates,
} from "@/lib/store/slices/billingSettingsSlice";
import { NoAccess } from "@/components/auth/no-access";
import { BillingCompanyTab } from "@/components/billing/billing-company-tab";
import { TaxRatesTab } from "@/components/billing/tax-rates-tab";
import { InvoiceEmailsTab } from "@/components/billing/invoice-emails-tab";
import { PaymentGatewaysTab } from "@/components/billing/payment-gateways-tab";
import { AccountingSyncTab } from "@/components/billing/accounting-sync-tab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// How this organization invoices its own clients. Separate from /settings/billing,
// which is what OrbitOps charges the organization.
//
// Only the settings exist today: there is no screen to write, send or get paid for an
// invoice, because that part of the product is not built. Everything set here is kept
// ready for it, which the page says plainly so nobody waits for an invoice that cannot
// be made yet.
export default function BillingSettingsPage() {
  const dispatch = useAppDispatch();
  const { can } = useAuth();
  const { company, isLoaded, isLoading, error } = useAppSelector((state) => state.billingSettings);

  // `/auth/me` drops every invoices key while the billing module is off for the
  // organization, so this one check covers the plan, the feature flag and the role.
  const canView = can("invoices.view");
  const canManage = can("invoices.settings_manage");

  useEffect(() => {
    if (!canView) return;
    dispatch(reqToGetBillingCompany({ data: null }));
    dispatch(reqToGetTaxRates({ data: null }));
    dispatch(reqToGetEmailTemplates({ data: null }));
    dispatch(reqToGetPaymentGateways({ data: null }));
    dispatch(reqToGetAccounting({ data: null }));
  }, [dispatch, canView]);

  // Fires no request without the permission, so a typed-in URL costs nothing.
  if (!canView) {
    return <NoAccess title="Invoice settings" area="billing and invoices" module="invoices" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ReceiptText className="size-6 text-primary" aria-hidden /> Invoice settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          How your invoices to your own clients will look: your billing details, numbering, tax rates, the emails that
          go with an invoice, your payment gateway keys and the accounting software your books live in.
        </p>
      </div>

      {/* The one thing a reader most needs to know on this screen. */}
      <Alert>
        <AlertTitle>Invoices themselves aren&apos;t available yet</AlertTitle>
        <AlertDescription>
          You can&apos;t create, send or record payment on a client invoice in OrbitOps today — that part is still being
          built. Everything you set here is saved and will be used by your first invoice, so it is worth filling in now.
        </AlertDescription>
      </Alert>

      {!canManage && (
        <Alert>
          <AlertTitle>You can look, but not change</AlertTitle>
          <AlertDescription>
            You can see how billing is set up. Changing it needs the &quot;Manage billing settings&quot; permission —
            ask an owner or admin.
          </AlertDescription>
        </Alert>
      )}

      {error && !isLoaded && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your billing settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoaded || !company ? (
        isLoading || !error ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </CardContent>
          </Card>
        ) : null
      ) : (
        <Tabs defaultValue="company">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="tax">Tax rates</TabsTrigger>
            <TabsTrigger value="emails">Invoice emails</TabsTrigger>
            <TabsTrigger value="gateways">Payment gateways</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="pt-6">
            <BillingCompanyTab company={company} canManage={canManage} />
          </TabsContent>
          <TabsContent value="tax" className="pt-6">
            <TaxRatesTab canManage={canManage} />
          </TabsContent>
          <TabsContent value="emails" className="pt-6">
            <InvoiceEmailsTab canManage={canManage} />
          </TabsContent>
          <TabsContent value="gateways" className="pt-6">
            <PaymentGatewaysTab canManage={canManage} />
          </TabsContent>
          <TabsContent value="accounting" className="pt-6">
            <AccountingSyncTab canManage={canManage} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
