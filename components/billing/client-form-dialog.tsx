"use client";

import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  clientToFormValues,
  emptyClientFormValues,
  type ClientFormValues,
} from "@/lib/clients/mappers";
import { PAYMENT_TERMS, type BillingClient } from "@/lib/clients/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Add or edit a client this organization invoices (SRS 7.7, BI-CL1).
//
// Caps match the API's validators, so a too-long value is caught here with the
// field named rather than coming back as a toast after the request.
const clientFormSchema = z.object({
  companyName: z.string().trim().min(1, "Enter the company name").max(255, "Company name is too long"),
  contactPerson: z.string().trim().max(255, "Contact person is too long"),
  email: z.string().trim().max(255, "Email is too long").email("Enter a valid email address").or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number is too long")
    .regex(/^[+]?[0-9][0-9 ()-]{5,49}$/, "Enter a valid phone number")
    .or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .max(50, "Tax id is too long")
    .regex(/^[A-Za-z0-9-]{4,50}$/, "Use letters, digits and hyphens only")
    .or(z.literal("")),
  billingLine1: z.string().trim().max(255, "Address line 1 is too long"),
  billingLine2: z.string().trim().max(255, "Address line 2 is too long"),
  billingCity: z.string().trim().max(100, "City is too long"),
  billingState: z.string().trim().max(100, "State is too long"),
  billingPostalCode: z.string().trim().max(20, "Postal code is too long"),
  billingCountry: z.string().trim().max(2, "Use the two-letter country code").or(z.literal("")),
  shippingSameAsBilling: z.boolean(),
  shippingLine1: z.string().trim().max(255, "Address line 1 is too long"),
  shippingLine2: z.string().trim().max(255, "Address line 2 is too long"),
  shippingCity: z.string().trim().max(100, "City is too long"),
  shippingState: z.string().trim().max(100, "State is too long"),
  shippingPostalCode: z.string().trim().max(20, "Postal code is too long"),
  shippingCountry: z.string().trim().max(2, "Use the two-letter country code").or(z.literal("")),
  paymentTerms: z.enum(["net_30", "net_60", "net_90", "due_on_receipt"]),
  // Left empty, the client has no credit limit. A typed 0 is a real answer:
  // "no credit, pays up front", which is why 0 is allowed and not treated as
  // an empty box.
  creditLimit: z
    .string()
    .trim()
    .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0), "Enter an amount, or leave it empty for no limit"),
  taxExempt: z.boolean(),
  notes: z.string().max(5000, "The notes are too long"),
});

export interface ClientFormServerError {
  field: keyof ClientFormValues;
  message: string;
}

interface ClientFormDialogProps {
  mode: "create" | "edit";
  initialClient?: BillingClient;
  // The organization's business currency, which a credit limit is always in.
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Resolves false when the server rejected the write, so the dialog stays open
  // with the field errors painted on and nothing typed is lost.
  onSubmit: (values: ClientFormValues) => Promise<boolean>;
  serverErrors?: ClientFormServerError[];
}

export function ClientFormDialog({
  mode,
  initialClient,
  currency,
  open,
  onOpenChange,
  onSubmit,
  serverErrors,
}: ClientFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(mode === "edit" && initialClient ? clientToFormValues(initialClient) : emptyClientFormValues());
  }, [open, mode, initialClient, form]);

  useEffect(() => {
    if (!serverErrors?.length) return;
    serverErrors.forEach(({ field, message }) => form.setError(field, { type: "server", message }));
  }, [serverErrors, form]);

  // Ticked, the shipping fields are hidden and the billing address is copied
  // across on submit. Nothing stores that the box was ticked: an empty shipping
  // address already means "ship where the invoice is addressed".
  const sameAsBilling = form.watch("shippingSameAsBilling");

  const handleSubmit = async (values: ClientFormValues) => {
    setSubmitting(true);
    try {
      const ok = await onSubmit(values);
      if (ok) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New client" : "Edit client"}</DialogTitle>
          <DialogDescription>
            Who you invoice, where the invoice goes and the terms you bill them on. Only the company name is required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tata Digital" {...field} />
                    </FormControl>
                    <FormDescription>What the invoice is addressed to. A sole trader can use their own name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact person</FormLabel>
                    <FormControl>
                      <Input placeholder="Arjun Mehta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN / tax id</FormLabel>
                    <FormControl>
                      <Input placeholder="24AAACT2727Q1ZW" {...field} />
                    </FormControl>
                    <FormDescription>Their GSTIN in India, or their local registration number elsewhere.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="accounts@tatadigital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Billing address</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AddressFields form={form} prefix="billing" />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold">Shipping address</h3>
              </div>

              <FormField
                control={form.control}
                name="shippingSameAsBilling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">Same as the billing address</FormLabel>
                      <FormDescription>
                        Leave this ticked and the billing address above is used for shipping too.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {!sameAsBilling && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AddressFields form={form} prefix="shipping" />
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment terms</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>How long after an invoice is issued they have to pay.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit limit ({currency})</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="Leave empty for no limit" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter 0 if they must pay up front. Empty means no limit. You&apos;ll be warned when an invoice
                      would take them past it, once invoicing is available.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxExempt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 sm:col-span-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">Tax exempt</FormLabel>
                      <FormDescription>Their invoices are raised without tax.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Anything your team should know when billing them." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : mode === "create" ? "Add client" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Every text field of an address, on both blocks. Only these names are allowed,
// so a mistyped prefix is a compile error rather than a field that silently
// never saves.
type AddressFieldName =
  | "billingLine1"
  | "billingLine2"
  | "billingCity"
  | "billingState"
  | "billingPostalCode"
  | "billingCountry"
  | "shippingLine1"
  | "shippingLine2"
  | "shippingCity"
  | "shippingState"
  | "shippingPostalCode"
  | "shippingCountry";

const ADDRESS_PARTS: Array<{
  part: "Line1" | "Line2" | "City" | "State" | "PostalCode" | "Country";
  label: string;
  placeholder: string;
  full: boolean;
  maxLength?: number;
}> = [
  { part: "Line1", label: "Address line 1", placeholder: "4th floor, Lotus Tower", full: true },
  { part: "Line2", label: "Address line 2", placeholder: "Ring Road", full: true },
  { part: "City", label: "City", placeholder: "Surat", full: false },
  { part: "State", label: "State or region", placeholder: "Gujarat", full: false },
  { part: "PostalCode", label: "Postal code", placeholder: "395002", full: false },
  { part: "Country", label: "Country", placeholder: "IN", full: false, maxLength: 2 },
];

// The same six fields twice over, so the billing and shipping blocks can never
// drift apart in their labels, caps or placeholders.
function AddressFields({
  form,
  prefix,
}: {
  form: UseFormReturn<ClientFormValues>;
  prefix: "billing" | "shipping";
}) {
  return (
    <>
      {ADDRESS_PARTS.map(({ part, label, placeholder, full, maxLength }) => (
        <FormField
          key={part}
          control={form.control}
          name={`${prefix}${part}` as AddressFieldName}
          render={({ field }) => (
            <FormItem className={full ? "sm:col-span-2" : undefined}>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input placeholder={placeholder} maxLength={maxLength} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </>
  );
}
