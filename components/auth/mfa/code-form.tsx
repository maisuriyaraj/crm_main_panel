"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Six digits; the space some apps show in the middle is allowed and dropped.
const totpSchema = z.object({
  value: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().min(1, "Enter the 6-digit code from your app").regex(/^\d{6}$/, "The code is 6 digits")),
});

// Two groups of 10 base32 characters; case, spaces and dashes don't matter.
const recoverySchema = z.object({
  value: z
    .string()
    .transform((value) => value.toUpperCase().replace(/[\s-]/g, ""))
    .pipe(z.string().min(1, "Enter one of your recovery codes").regex(/^[A-Z2-7]{20}$/, "A recovery code looks like ABCDE23456-FGHIJ72345")),
});

export function StepAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </p>
  );
}

// One code field and a submit button. `onSubmit` resolves with an error to show,
// or null; the field is cleared after a refusal so the next code starts fresh.
export function CodeForm({
  kind = "totp",
  label,
  submitLabel,
  pendingLabel = "Checking…",
  error,
  onSubmit,
  autoFocus = true,
}: {
  kind?: "totp" | "recovery";
  label: string;
  submitLabel: string;
  pendingLabel?: string;
  error: string | null;
  onSubmit: (value: string) => Promise<boolean>;
  autoFocus?: boolean;
}) {
  const form = useForm<{ value: string }>({
    resolver: zodResolver(kind === "totp" ? totpSchema : recoverySchema),
    defaultValues: { value: "" },
  });

  const submit = async ({ value }: { value: string }) => {
    const accepted = await onSubmit(kind === "totp" ? value.replace(/\s/g, "") : value);
    if (!accepted) form.reset({ value: "" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode={kind === "totp" ? "numeric" : "text"}
                  autoComplete={kind === "totp" ? "one-time-code" : "off"}
                  spellCheck={false}
                  autoFocus={autoFocus}
                  maxLength={kind === "totp" ? 7 : 24}
                  className="h-auto rounded-xl py-3 font-mono text-base tracking-[0.2em]"
                  {...field}
                />
              </FormControl>
              {kind === "recovery" && <FormDescription>Like ABCDE23456-FGHIJ72345. Case and dashes don&apos;t matter.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <StepAlert message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? pendingLabel : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
