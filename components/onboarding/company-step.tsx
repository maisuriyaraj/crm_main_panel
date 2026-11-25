"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ComponentProps } from "react";
import { apiFieldErrors } from "@/lib/auth/errors";
import { GST_COUNTRY, GST_STATE_CODES, GST_STATES, GSTIN_PATTERN, gstinMatchesState } from "@/lib/gst";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CompanyInput, OnboardingCompany } from "@/lib/store/slices/onboardingSlice";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StepAlert } from "@/components/auth/mfa/code-form";
import { StepActions } from "./step-actions";

const optional = (max: number, label: string) => z.string().trim().max(max, `${label} is too long`);

// Mirrors the API's rules so most mistakes show before saving; the API still
// checks everything and its field errors are shown on the same fields.
const companySchema = z
  .object({
    legal_name: z.string().trim().min(2, "Enter the legal name (at least 2 characters)").max(255, "Legal name is too long"),
    display_name: z.string().trim().min(2, "Enter the name to show (at least 2 characters)").max(255, "Display name is too long"),
    line1: optional(255, "Address line 1"),
    line2: optional(255, "Address line 2"),
    city: optional(100, "City"),
    state: optional(100, "State or region"),
    postal_code: z.string().trim().max(20, "Postal code is too long").refine((v) => !v || /^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(v), "Enter a valid postal code"),
    country: z.string().trim().toUpperCase().refine((v) => !v || /^[A-Z]{2}$/.test(v), "Use the two-letter country code, for example IN"),
    phone: z.string().trim().refine((v) => !v || /^\+?[0-9][0-9\s-]{6,19}$/.test(v), "Enter a valid phone number"),
    website: z.string().trim().max(255, "Website is too long").refine((v) => !v || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(v), "Start with https:// or http://"),
    industry: z.string().trim().max(100, "Industry is too long").refine((v) => !v || v.length >= 2, "At least 2 characters"),
    gstin: z.string().trim().toUpperCase().refine((v) => !v || GSTIN_PATTERN.test(v), "Enter a valid 15-character GSTIN"),
    gst_state_code: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    // An address is all or nothing: once any part is given, these three are needed.
    const anyAddress = [values.line1, values.line2, values.city, values.state, values.postal_code].some(Boolean);
    if (!anyAddress) return;
    if (!values.line1) ctx.addIssue({ code: "custom", path: ["line1"], message: "Enter the first address line" });
    if (!values.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Enter the city" });
    if (!values.country) ctx.addIssue({ code: "custom", path: ["country"], message: "Enter the country code" });
  })
  .superRefine((values, ctx) => {
    // GST is Indian, and a GSTIN always starts with its own state's code. Both
    // rules are the API's; checking them here saves a round trip.
    const indian = values.country.toUpperCase() === GST_COUNTRY;
    if (!indian && values.gstin) ctx.addIssue({ code: "custom", path: ["gstin"], message: "A GSTIN is only for a company in India" });
    if (!indian && values.gst_state_code) ctx.addIssue({ code: "custom", path: ["gst_state_code"], message: "A GST state is only for a company in India" });
    if (!gstinMatchesState(values.gstin, values.gst_state_code)) {
      ctx.addIssue({ code: "custom", path: ["gstin"], message: "This GSTIN is not from the chosen state: a GSTIN starts with its state code" });
    }
  });

type CompanyValues = z.infer<typeof companySchema>;

// The API names nested fields "address.city"; the form keeps them flat.
const FIELD_FROM_API: Record<string, keyof CompanyValues> = {
  legal_name: "legal_name",
  display_name: "display_name",
  "address.line1": "line1",
  "address.line2": "line2",
  "address.city": "city",
  "address.state": "state",
  "address.postal_code": "postal_code",
  "address.country": "country",
  phone: "phone",
  website: "website",
  industry: "industry",
  gstin: "gstin",
  gst_state_code: "gst_state_code",
};

const countryName = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code) ?? null;
  } catch {
    return null;
  }
};

export function CompanyStep({
  company,
  isSaving,
  error,
  onSave,
  onSkip,
  onBack,
  canSkip,
  submitLabel = "Save and continue",
}: {
  company: OnboardingCompany;
  isSaving: boolean;
  error: string | null;
  // Resolves with the API failure, or null when saved.
  onSave: (input: CompanyInput) => Promise<unknown | null>;
  onSkip?: () => void;
  onBack?: () => void;
  canSkip: boolean;
  // Settings shows "Save changes": the same form with nothing to continue to.
  submitLabel?: string;
}) {
  const form = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      legal_name: company.legal_name ?? "",
      display_name: company.display_name ?? "",
      line1: company.address.line1 ?? "",
      line2: company.address.line2 ?? "",
      city: company.address.city ?? "",
      state: company.address.state ?? "",
      postal_code: company.address.postal_code ?? "",
      country: company.address.country ?? "",
      phone: company.phone ?? "",
      website: company.website ?? "",
      industry: company.industry ?? "",
      gstin: company.gstin ?? "",
      gst_state_code: company.gst_state_code ?? "",
    },
  });
  const country = useWatch({ control: form.control, name: "country" });
  const isIndian = (country ?? "").toUpperCase() === GST_COUNTRY;

  const submit = async (values: CompanyValues) => {
    const hasAddress = [values.line1, values.line2, values.city, values.state, values.postal_code].some(Boolean);
    const failure = await onSave({
      legal_name: values.legal_name,
      display_name: values.display_name,
      address: hasAddress
        ? { line1: values.line1, line2: values.line2, city: values.city, state: values.state, postal_code: values.postal_code, country: values.country }
        : null,
      phone: values.phone,
      website: values.website,
      industry: values.industry,
      // Cleared rather than left alone: on this form an empty box means the
      // member removed the value, and null is how the API is told so.
      gstin: values.gstin || null,
      gst_state_code: values.gst_state_code || null,
    });
    if (!failure) return;
    apiFieldErrors(failure).forEach(({ field, message }) => {
      const name = FIELD_FROM_API[field];
      if (name) form.setError(name, { message });
    });
  };

  const text = (name: keyof CompanyValues, label: string, props: ComponentProps<typeof Input> = {}, description?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl><Input {...props} {...field} /></FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("display_name", "Company name", { autoComplete: "organization" }, "Shown across OrbitOps.")}
          {text("legal_name", "Legal name", {}, "As registered, for invoices.")}
        </div>
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">Address <span className="font-normal text-muted-foreground">(optional)</span></legend>
          {text("line1", "Address line 1", { autoComplete: "address-line1" })}
          {text("line2", "Address line 2", { autoComplete: "address-line2" })}
          <div className="grid gap-4 sm:grid-cols-2">
            {text("city", "City", { autoComplete: "address-level2" })}
            {text("state", "State or region", { autoComplete: "address-level1" })}
            {text("postal_code", "Postal code", { autoComplete: "postal-code" })}
            {text("country", "Country code", { autoComplete: "country", maxLength: 2, className: "uppercase" }, countryName((country ?? "").toUpperCase()) ?? "Two letters, for example IN or US.")}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("phone", "Phone", { type: "tel", autoComplete: "tel" })}
          {text("website", "Website", { type: "url", placeholder: "https://", autoComplete: "url" })}
          {text("industry", "Industry", { placeholder: "For example, Software" })}
        </div>
        {isIndian && (
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium">Tax details <span className="font-normal text-muted-foreground">(optional)</span></legend>
            <p className="text-sm text-muted-foreground">
              Used on the invoices OrbitOps sends you. Your GST state decides whether CGST and SGST or IGST applies.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gst_state_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST state</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Choose a state" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none">Not set</SelectItem>
                        {GST_STATE_CODES.map((code) => (
                          <SelectItem key={code} value={code}>{code} · {GST_STATES[code]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {text("gstin", "GSTIN", { maxLength: 15, className: "uppercase", placeholder: "22AAAAA0000A1Z5" }, "15 characters, starting with your state code.")}
            </div>
          </fieldset>
        )}
        <StepAlert message={error} />
        <StepActions isSaving={isSaving} onBack={onBack} onSkip={canSkip && onSkip ? onSkip : undefined} submitLabel={submitLabel} />
      </form>
    </Form>
  );
}

