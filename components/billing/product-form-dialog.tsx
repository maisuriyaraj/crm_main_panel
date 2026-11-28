"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import {
  NO_TAX_RATE,
  emptyProductFormValues,
  productToFormValues,
  type ProductFormValues,
} from "@/lib/products/mappers";
import { PRODUCT_UNITS, type BillingProduct } from "@/lib/products/types";
import type { TaxRate } from "@/lib/store/slices/billingSettingsSlice";
import { Button } from "@/components/ui/button";
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

// Add or edit a product or service (SRS 7.8, BI-PR1).
//
// Caps and formats match the API's validators, so a too-long or badly-shaped
// value is caught here with the field named rather than coming back as a toast
// after the request.
const productFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name for the item").max(255, "The name is too long"),
  sku: z
    .string()
    .trim()
    .max(64, "The item code is too long")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/, "Use letters, digits, dots, dashes, slashes or underscores")
    .or(z.literal("")),
  description: z.string().trim().max(5000, "The description is too long"),
  // A price is always a real number, and 0 is allowed: a free line is a real
  // line. Empty is read as 0 rather than refused, so an item can be added before
  // its price is decided.
  unitPrice: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Enter a price, or leave it empty for 0",
    ),
  unit: z.enum(["pieces", "hours", "days", "months"]),
  taxRateId: z.string().min(1),
  // Free text on purpose: the published HSN/SAC lists change, and refusing a
  // valid new code would be worse than accepting a wrong one.
  hsnSacCode: z.string().trim().max(20, "The HSN/SAC code is too long"),
});

export interface ProductFormServerError {
  field: keyof ProductFormValues;
  message: string;
}

interface ProductFormDialogProps {
  mode: "create" | "edit";
  initialProduct?: BillingProduct;
  // The organization's business currency, which every price is in.
  currency: string;
  // The organization's own tax rates, from Invoice settings. Only the active
  // ones can be chosen; the API refuses an inactive one.
  taxRates: TaxRate[];
  // Where to send someone who has no rates to pick from yet.
  taxRatesHref: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Resolves false when the server rejected the write, so the dialog stays open
  // with the field errors painted on and nothing typed is lost.
  onSubmit: (values: ProductFormValues) => Promise<boolean>;
  serverErrors?: ProductFormServerError[];
}

export function ProductFormDialog({
  mode,
  initialProduct,
  currency,
  taxRates,
  taxRatesHref,
  open,
  onOpenChange,
  onSubmit,
  serverErrors,
}: ProductFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProductFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(mode === "edit" && initialProduct ? productToFormValues(initialProduct) : emptyProductFormValues());
  }, [open, mode, initialProduct, form]);

  useEffect(() => {
    if (!serverErrors?.length) return;
    serverErrors.forEach(({ field, message }) => form.setError(field, { type: "server", message }));
  }, [serverErrors, form]);

  const activeRates = taxRates.filter((rate) => rate.active);
  // An item being edited may carry a rate that has since been turned off. It
  // stays selectable so saving another field does not silently change its tax.
  const editingRate =
    mode === "edit" && initialProduct?.taxRate && !initialProduct.taxRate.active ? initialProduct.taxRate : null;

  const handleSubmit = async (values: ProductFormValues) => {
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New product or service" : "Edit product or service"}</DialogTitle>
          <DialogDescription>
            What you sell, what it costs and the tax on it. Only the name is required. These become the defaults on an
            invoice line once invoicing is available.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Website design" {...field} />
                    </FormControl>
                    <FormDescription>What an invoice line will say was sold.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item code (SKU)</FormLabel>
                    <FormControl>
                      <Input placeholder="WEB-DSGN-01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your own code for it. Optional, but no two items can share one.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hsnSacCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN / SAC code</FormLabel>
                    <FormControl>
                      <Input placeholder="998314" {...field} />
                    </FormControl>
                    <FormDescription>
                      HSN for goods, SAC for services. Check the code with your accountant — it is not validated here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="What this covers, as the client should read it." {...field} />
                    </FormControl>
                    <FormDescription>Copied onto the invoice line, so write it for the client.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit price ({currency})</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="2500.00" {...field} />
                    </FormControl>
                    <FormDescription>The price for one unit, before tax. 0 is allowed.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>What one of it is: a piece, an hour, a day or a month.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxRateId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Tax rate</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* A real choice, not an empty box: some items genuinely carry no tax. */}
                        <SelectItem value={NO_TAX_RATE}>No tax on this item</SelectItem>
                        {activeRates.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id}>
                            {rate.name} ({rate.ratePercent}%){rate.isDefault ? " — your default" : ""}
                          </SelectItem>
                        ))}
                        {editingRate && (
                          <SelectItem value={editingRate.id}>
                            {editingRate.name} ({editingRate.ratePercent}%) — turned off
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {activeRates.length === 0 ? (
                        <>
                          You have no active tax rates yet.{" "}
                          <Link href={taxRatesHref} className="underline">
                            Add one in Invoice settings
                          </Link>{" "}
                          if this item is taxed.
                        </>
                      ) : (
                        <>
                          From your own rates in Invoice settings, so changing a rate there changes it in one place.
                          {editingRate ? " This item is on a rate that has since been turned off." : ""}
                        </>
                      )}
                    </FormDescription>
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
                {submitting ? "Saving..." : mode === "create" ? "Add item" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
