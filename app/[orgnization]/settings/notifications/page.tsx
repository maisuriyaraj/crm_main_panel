"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToGetNoticePreferences,
  reqToSaveNoticePreferences,
  type NoticeChannel,
  type NoticePreference,
} from "@/lib/store/slices/notificationPreferencesSlice";
import { PreferenceRow } from "@/components/notifications/preference-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// The groups, in the order they are shown. The API gives each notice a category;
// one it does not know about falls to the end rather than disappearing.
const GROUPS: Array<{ key: string; title: string; intro: string }> = [
  { key: "usage", title: "Usage", intro: "When your organization gets close to, or reaches, what your plan allows." },
  { key: "team", title: "Team", intro: "What the people in your workspace are doing." },
  { key: "subscription", title: "Subscription", intro: "Your trial, your plan and the invoices OrbitOps sends you." },
  { key: "integration", title: "Integrations", intro: "Your connections to Meta, Google and other platforms." },
  { key: "security", title: "Security", intro: "Changes to your own account." },
];

const groupOf = (preference: NoticePreference) =>
  GROUPS.find((group) => group.key === preference.category)?.key ?? "other";

// Every member chooses for themselves. The API answers only the notices this
// member's role may receive, so nothing here decides who sees what: an admin-only
// notice simply is not in the list for anyone else.
export default function NotificationSettingsPage() {
  const dispatch = useAppDispatch();
  const { preferences, isLoaded, isLoading, isSaving, error } = useAppSelector((state) => state.notificationPreferences);

  useEffect(() => {
    dispatch(reqToGetNoticePreferences({ data: null }));
  }, [dispatch]);

  // One notice at a time: the switch is the save, so there is no Save button to
  // forget. The answer carries the whole list back, so the screen cannot drift.
  const change = async (preference: NoticePreference, channel: NoticeChannel, value: boolean) => {
    // Only the channel that moved is sent; the other keeps whatever it was.
    const item = channel === "in_app"
      ? { alert_type: preference.alert_type, in_app: value }
      : { alert_type: preference.alert_type, email: value };
    const action = await dispatch(reqToSaveNoticePreferences({
      data: { items: [item] },
      onFailure: (failure) => notify(apiErrorMessage(failure, "Couldn't save that change. Please try again."), { type: "error" }),
    }));
    if (reqToSaveNoticePreferences.fulfilled.match(action)) {
      notify(value ? "Turned on." : "Turned off.", { type: "success" });
    }
  };

  const groups = [...GROUPS, { key: "other", title: "Other", intro: "" }]
    .map((group) => ({ ...group, items: preferences.filter((preference) => groupOf(preference) === group.key) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bell className="size-6 text-primary" aria-hidden /> Notifications
        </h1>
        <p className="mt-1 text-muted-foreground">
          What you hear about, and how. In-app notices appear in the bell at the top; email goes to your sign-in address.
          This is your own choice and affects nobody else in your workspace.
        </p>
      </div>

      {error && !isLoaded ? (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load your notification settings</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => dispatch(reqToGetNoticePreferences({ data: null }))}>Try again</Button>
        </div>
      ) : !isLoaded ? (
        <Card>
          <CardContent className="space-y-4 pt-6" aria-busy="true">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            There are no notifications to choose from for your role yet.
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              {group.intro && <CardDescription>{group.intro}</CardDescription>}
              {/* The column headings sit with the group, so each card reads on
                  its own; on a phone each switch carries its own label instead. */}
              <div className="hidden shrink-0 justify-end gap-6 text-xs font-medium uppercase text-muted-foreground sm:flex sm:gap-10">
                <span className="w-9 text-center">In-app</span>
                <span className="w-9 text-center">Email</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {group.items.map((preference) => (
                <PreferenceRow
                  key={preference.alert_type}
                  preference={preference}
                  isSaving={isSaving || isLoading}
                  onChange={(channel, value) => change(preference, channel, value)}
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
