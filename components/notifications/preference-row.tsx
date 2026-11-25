"use client";

import { Lock } from "lucide-react";

import type { NoticeChannel, NoticePreference } from "@/lib/store/slices/notificationPreferencesSlice";
import { Switch } from "@/components/ui/switch";

// One notice and its two channels. A channel the API marks locked is shown on and
// not switchable, with the reason: a member must never quietly miss an event on
// their own account, and an invoice is a document the organization has to receive.
export function PreferenceRow({
  preference,
  isSaving,
  onChange,
}: {
  preference: NoticePreference;
  isSaving: boolean;
  onChange: (channel: NoticeChannel, value: boolean) => void;
}) {
  const locked = (channel: NoticeChannel) => preference.locked.includes(channel);
  const bothLocked = locked("in_app") && locked("email");

  const toggle = (channel: NoticeChannel, label: string) => {
    const isLocked = locked(channel);
    const id = `${preference.alert_type}-${channel}`;
    return (
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={isLocked ? true : channel === "in_app" ? preference.in_app : preference.email}
          disabled={isLocked || isSaving}
          onCheckedChange={(value) => onChange(channel, value)}
          aria-label={`${label} for ${preference.label}${isLocked ? " (always on)" : ""}`}
        />
        <label htmlFor={id} className="text-sm text-muted-foreground sm:hidden">{label}</label>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {preference.label}
          {bothLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              <Lock className="size-3" aria-hidden /> Always on
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{preference.description}</p>
        {bothLocked ? (
          <p className="text-xs text-muted-foreground">
            This is about your own account, so it is always sent. You should never miss a change to how you sign in.
          </p>
        ) : locked("email") ? (
          <p className="text-xs text-muted-foreground">
            The email is always sent: an invoice is a document your organization has to receive.
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-6 sm:gap-10">
        {toggle("in_app", "In-app")}
        {toggle("email", "Email")}
      </div>
    </div>
  );
}
