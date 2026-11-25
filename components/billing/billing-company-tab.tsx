"use client";

import { useEffect, useState } from "react";

import { apiErrorMessage, apiFieldErrors } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToSaveBillingCompany,
  type BillingCompany,
  type BillingCompanyInput,
} from "@/lib/store/slices/billingSettingsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// What the invoice feature would still need, said in words rather than field names.
const MISSING_LABELS: Record<string, string> = {
  legal_name: "your registered business name",
  address_line1: "your address",
  country: "your country",
  state_code: "your GST state",
};

type Form = {
  legal_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  state_code: string;
  tax_id: string;
  default_currency: string;
  default_payment_terms_days: string;
  invoice_prefix: string;
  require_approval: boolean;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
  upi_id: string;
  bank_notes: string;
};

const formFrom = (company: BillingCompany): Form => ({
  legal_name: company.legalName ?? "",
  address_line1: company.addressLine1 ?? "",
  address_line2: company.addressLine2 ?? "",
  city: company.city ?? "",
  postal_code: company.postalCode ?? "",
  country: company.country ?? "",
  state_code: company.stateCode ?? "",
  tax_id: company.taxId ?? "",
  default_currency: company.defaultCurrency,
  default_payment_terms_days: String(company.defaultPaymentTermsDays),
  invoice_prefix: company.invoicePrefix,
  require_approval: company.requireApproval,
  bank_name: company.bankDetails?.bank_name ?? "",
  account_name: company.bankDetails?.account_name ?? "",
  account_number: company.bankDetails?.account_number ?? "",
  ifsc: company.bankDetails?.ifsc ?? "",
  branch: company.bankDetails?.branch ?? "",
  upi_id: company.bankDetails?.upi_id ?? "",
  bank_notes: company.bankDetails?.notes ?? "",
});

// The country name for a two-letter code, so a typed code is checked by eye. The
// setup wizard shows the country the same way.
const countryName = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code) ?? null;
  } catch {
    return null;
  }
};

// Blank text means "clear it": the API replaces this section as a whole.
const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

// The company's billing identity, invoice numbering and the bank block that would be
// printed on an invoice. Read-only for a member who may see billing but not change it.
export function BillingCompanyTab({ company, canManage }: { company: BillingCompany; canManage: boolean }) {
  const dispatch = useAppDispatch();
  const { isSaving } = useAppSelector((state) => state.billingSettings);
  const [form, setForm] = useState<Form>(() => formFrom(company));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // A save answers with the saved values, so the form follows what was stored.
  useEffect(() => setForm(formFrom(company)), [company]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const india = form.country === "IN";

  const save = async () => {
    setError(null);
    setFieldErrors({});

    const bank: Record<string, string | null> = {
      bank_name: orNull(form.bank_name),
      account_name: orNull(form.account_name),
      account_number: orNull(form.account_number),
      ifsc: orNull(form.ifsc),
      branch: orNull(form.branch),
      upi_id: orNull(form.upi_id),
      notes: orNull(form.bank_notes),
    };
    const anyBank = Object.values(bank).some((value) => value !== null);

    const payload: BillingCompanyInput = {
      legal_name: orNull(form.legal_name),
      address_line1: orNull(form.address_line1),
      address_line2: orNull(form.address_line2),
      city: orNull(form.city),
      postal_code: orNull(form.postal_code),
      country: orNull(form.country),
      // Outside India there is no GST state to send; the API clears it anyway.
      state_code: india ? orNull(form.state_code) : null,
      tax_id: orNull(form.tax_id),
      default_currency: form.default_currency,
      default_payment_terms_days: Number(form.default_payment_terms_days || 0),
      invoice_prefix: form.invoice_prefix.toUpperCase(),
      require_approval: form.require_approval,
      bank_details: anyBank ? bank : null,
    };

    const action = await dispatch(reqToSaveBillingCompany({
      data: payload,
      onFailure: (failure) => {
        setError(apiErrorMessage(failure, "Couldn't save your billing settings."));
        const byField: Record<string, string> = {};
        apiFieldErrors(failure).forEach((entry) => { byField[entry.field] = entry.message; });
        setFieldErrors(byField);
      },
    }));
    if (reqToSaveBillingCompany.fulfilled.match(action)) {
      notify("Billing settings saved.", { type: "success" });
    }
  };

  const fieldError = (name: string) => fieldErrors[name] ?? null;

  const field = (name: keyof Form, label: string, props: { placeholder?: string; type?: string; apiName?: string } = {}) => (
    <div className="space-y-2">
      <Label htmlFor={`billing-${name}`}>{label}</Label>
      <Input
        id={`billing-${name}`}
        type={props.type ?? "text"}
        value={String(form[name] ?? "")}
        placeholder={props.placeholder}
        disabled={!canManage || isSaving}
        onChange={(event) => set(name, event.target.value as Form[typeof name])}
      />
      {fieldError(props.apiName ?? name) && (
        <p className="text-sm text-destructive">{fieldError(props.apiName ?? name)}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {company.missing.length > 0 && (
        <Alert>
          <AlertTitle>A few details are still missing</AlertTitle>
          <AlertDescription>
            Before an invoice could be issued you would need{" "}
            {company.missing.map((key) => MISSING_LABELS[key] ?? key).join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Who the invoice comes from</CardTitle>
          <CardDescription>
            Printed at the top of every invoice you send a client, exactly as entered here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("legal_name", "Registered business name", { placeholder: "Acme Trading Private Limited" })}</div>
          <div className="sm:col-span-2">{field("address_line1", "Address line 1")}</div>
          <div className="sm:col-span-2">{field("address_line2", "Address line 2 (optional)")}</div>
          {field("city", "City")}
          {field("postal_code", "Postal code")}

          {/* The same two-letter code the setup wizard asks for, with the country
              name shown back so a typo is obvious. */}
          <div className="space-y-2">
            <Label htmlFor="billing-country">Country code</Label>
            <Input
              id="billing-country"
              value={form.country}
              maxLength={2}
              className="uppercase"
              placeholder="IN"
              disabled={!canManage || isSaving}
              onChange={(event) => set("country", event.target.value.toUpperCase())}
            />
            <p className="text-sm text-muted-foreground">
              {countryName(form.country) ?? "Two letters, for example IN or US."}
            </p>
            {fieldError("country") && <p className="text-sm text-destructive">{fieldError("country")}</p>}
          </div>

          {/* A GST state only exists in India, and it is what decides CGST + SGST
              against IGST once invoices are built. */}
          {india && (
            <div className="space-y-2">
              <Label htmlFor="billing-state">GST state</Label>
              <Select value={form.state_code} disabled={!canManage || isSaving} onValueChange={(value) => set("state_code", value)}>
                <SelectTrigger id="billing-state"><SelectValue placeholder="Choose your state" /></SelectTrigger>
                <SelectContent>
                  {company.states.map((state) => (
                    <SelectItem key={state.code} value={state.code}>{state.code} — {state.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("state_code") && <p className="text-sm text-destructive">{fieldError("state_code")}</p>}
            </div>
          )}

          <div className="sm:col-span-2">
            {field("tax_id", india ? "GSTIN" : "Tax registration number", { placeholder: india ? "24AAAAA0000A1Z5" : "Optional" })}
            <p className="mt-2 text-sm text-muted-foreground">
              Optional. Leave it blank if your business is not registered for tax. Check it with your accountant.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice defaults</CardTitle>
          <CardDescription>
            Used when an invoice is created. Numbering restarts each financial year (April to March).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing-currency">Default currency</Label>
            <Select value={form.default_currency} disabled={!canManage || isSaving} onValueChange={(value) => set("default_currency", value)}>
              <SelectTrigger id="billing-currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(company.currencies.length ? company.currencies : [form.default_currency]).map((code) => (
                  <SelectItem key={code} value={code}>{code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field("default_payment_terms_days", "Payment terms (days)", { type: "number" })}
          <div>
            {field("invoice_prefix", "Invoice number prefix", { placeholder: "INV" })}
            <p className="mt-2 text-sm text-muted-foreground">
              1 to 3 letters or digits. Your next invoice number would be{" "}
              <span className="font-medium text-foreground">
                {company.nextInvoiceNumber ?? `${form.invoice_prefix || "INV"}/…/0001`}
              </span>
              .
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-4 sm:col-span-2">
            <div className="min-w-0">
              <Label htmlFor="billing-approval" className="text-base">Require approval before sending</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                When on, an invoice must be approved by someone with the approve permission before it can be emailed
                to a client. It takes effect once invoices can be created.
              </p>
            </div>
            <Switch
              id="billing-approval"
              checked={form.require_approval}
              disabled={!canManage || isSaving}
              onCheckedChange={(checked) => set("require_approval", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank details</CardTitle>
          <CardDescription>
            Printed in the invoice footer so a client knows where to pay. Nothing here is secret, and nothing is charged
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("bank_name", "Bank name")}
          {field("account_name", "Account name")}
          {field("account_number", "Account number")}
          {field("ifsc", "IFSC code", { placeholder: "HDFC0001234" })}
          {field("branch", "Branch")}
          {field("upi_id", "UPI id", { placeholder: "acme@okhdfcbank" })}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="billing-bank_notes">Payment notes</Label>
            <Textarea
              id="billing-bank_notes"
              rows={3}
              value={form.bank_notes}
              disabled={!canManage || isSaving}
              onChange={(event) => set("bank_notes", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save billing settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
