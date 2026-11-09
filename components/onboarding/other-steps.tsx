"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Building2, Clock, ImageUp, Megaphone, UserPlus } from "lucide-react";

import type { OnboardingState } from "@/lib/store/slices/onboardingSlice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepAlert } from "@/components/auth/mfa/code-form";
import { OrgLogo } from "@/components/layout/org-logo";
import { AdIntegrationsPanel } from "@/components/integrations/ad-integrations-panel";
import { StepActions } from "./step-actions";

type Values = OnboardingState["values"];

// The API recognises the image from its bytes and enforces the size limit; this
// only catches the obvious mistakes before anything is sent.
const LOGO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function LogoStep({
  logo,
  isSaving,
  error,
  onUpload,
  onSkip,
  onBack,
  onContinue,
  canSkip,
}: {
  logo: Values["logo"];
  isSaving: boolean;
  error: string | null;
  onUpload: (file: File) => Promise<boolean>;
  onSkip: () => void;
  onBack: () => void;
  onContinue: () => void;
  canSkip: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  // A preview made in the browser before uploading; released when replaced.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!chosen) return;
    if (!LOGO_TYPES.includes(chosen.type)) {
      setLocalError("The logo must be an image: JPG, PNG, GIF or WebP. SVG isn't accepted.");
      return;
    }
    setLocalError(null);
    setFile(chosen);
  };

  const upload = async () => {
    if (!file) return;
    if (await onUpload(file)) setFile(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-muted/40">
          {preview ? (
            // A local object URL for the preview only.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview of the new logo" className="size-full object-contain" />
          ) : logo.has_logo ? (
            <OrgLogo version={logo.updated_at} alt="Your organization's logo" className="size-full" fallback={<Building2 className="size-8 text-muted-foreground" aria-hidden />} />
          ) : (
            <Building2 className="size-8 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">A square image works best. JPG, PNG, GIF or WebP. It is shown to your team only.</p>
          <input ref={input} type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={choose} aria-label="Choose a logo image" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={isSaving}>
              <ImageUp aria-hidden /> {logo.has_logo || file ? "Choose another image" : "Choose an image"}
            </Button>
            {file && <Button type="button" onClick={upload} disabled={isSaving}>{isSaving ? "Uploading…" : "Upload logo"}</Button>}
          </div>
        </div>
      </div>
      <StepAlert message={localError ?? error} />
      <StepActions isSaving={isSaving} onBack={onBack} onSkip={canSkip && !logo.has_logo ? onSkip : undefined} onContinue={logo.has_logo ? onContinue : undefined} />
    </div>
  );
}

const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const allTimeZones = (): string[] => {
  try {
    const zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
    if (zones?.length) return zones.includes("UTC") ? zones : ["UTC", ...zones];
  } catch {
    // Older browsers: the browser's own zone and UTC are still offered.
  }
  return Array.from(new Set(["UTC", browserTimeZone()]));
};

const currencyName = (code: string) => {
  try {
    return new Intl.DisplayNames(undefined, { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
};

export function LocaleStep({
  locale,
  isSaving,
  error,
  onSave,
  onSkip,
  onBack,
  canSkip,
}: {
  locale: Values["locale"];
  isSaving: boolean;
  error: string | null;
  onSave: (input: { currency: string; timezone: string }) => void;
  onSkip: () => void;
  onBack: () => void;
  canSkip: boolean;
}) {
  const zones = useMemo(() => allTimeZones(), []);
  const [currency, setCurrency] = useState(locale.currency ?? locale.allowed_currencies[0] ?? "INR");
  // An organization still on the default UTC most likely wants its own zone.
  const [timezone, setTimezone] = useState(locale.timezone && locale.timezone !== "UTC" ? locale.timezone : browserTimeZone());

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ currency, timezone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="setup-currency">Business currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="setup-currency"><SelectValue /></SelectTrigger>
            <SelectContent>
              {locale.allowed_currencies.map((code) => (
                <SelectItem key={code} value={code}>{code} · {currencyName(code)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">For your deals and the invoices you send.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-timezone" className="flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden /> Time zone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="setup-timezone"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>{zone.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used for dates, reminders and trial notices.</p>
        </div>
      </div>
      <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
        This does not change your OrbitOps subscription
        {locale.billing_currency ? <>, which stays billed in <strong>{locale.billing_currency}</strong></> : null}.
      </p>
      <StepAlert message={error} />
      <StepActions isSaving={isSaving} onBack={onBack} onSkip={canSkip ? onSkip : undefined} submitLabel="Save and continue" />
    </form>
  );
}

export function InviteStep({
  invite,
  canInvite,
  isSaving,
  error,
  onInvite,
  onSkip,
  onBack,
  onContinue,
  canSkip,
  done,
}: {
  invite: Values["invite_team"];
  canInvite: boolean;
  isSaving: boolean;
  error: string | null;
  onInvite: () => void;
  onSkip: () => void;
  onBack: () => void;
  onContinue: () => void;
  canSkip: boolean;
  done: boolean;
}) {
  const limit = invite.seats_limit;
  const full = limit !== null && invite.seats_used >= limit;

  return (
    <div className="space-y-5">
      <div className="max-w-sm space-y-1.5">
        <p className="text-sm">
          {limit !== null ? `${invite.seats_used} of ${limit} seats used` : `${invite.seats_used} seats used`}
          {invite.invitations_sent > 0 && ` · ${invite.invitations_sent} invitation${invite.invitations_sent === 1 ? "" : "s"} sent`}
        </p>
        {limit !== null && limit > 0 && <Progress value={Math.min(100, (invite.seats_used / limit) * 100)} className="h-1.5" />}
      </div>
      {full && <p className="text-sm text-muted-foreground">Every seat on your plan is taken. Contact OrbitOps to add seats.</p>}
      {canInvite ? (
        <Button type="button" onClick={onInvite} disabled={isSaving || full}><UserPlus aria-hidden /> Invite a teammate</Button>
      ) : (
        <p className="text-sm text-muted-foreground">Inviting needs the invite permission; ask your workspace owner.</p>
      )}
      <StepAlert message={error} />
      <StepActions isSaving={isSaving} onBack={onBack} onSkip={canSkip && !done ? onSkip : undefined} onContinue={done ? onContinue : undefined} />
    </div>
  );
}

// Connecting Meta and Google, with the same cards as Settings > Integrations. Not part
// of the plan: only a note. Skipping always works; connecting marks the step done.
export function AdAccountsStep({
  available,
  reason,
  isSaving,
  error,
  onBack,
  onSkip,
  onNext,
  nextLabel,
  canSkip,
}: {
  available: boolean;
  reason: string | null;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  nextLabel: string;
  canSkip: boolean;
}) {
  return (
    <div className="space-y-5">
      {available ? (
        <AdIntegrationsPanel returnTo="setup" compact />
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-5">
          <Megaphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">{reason ?? "Ad platforms aren't part of your plan."}</p>
        </div>
      )}
      <StepAlert message={error} />
      <StepActions isSaving={isSaving} onBack={onBack} onSkip={available && canSkip ? onSkip : undefined} onContinue={onNext} continueLabel={nextLabel} />
    </div>
  );
}
