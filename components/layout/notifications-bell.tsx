"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { hrefForLink, lookOf } from "@/lib/notifications/presentation";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToGetNotifications,
  reqToMarkAllNotificationsRead,
  reqToMarkNotificationRead,
} from "@/lib/store/slices/notificationsSlice";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/usage/types";
import { useDateFormat } from "@/hooks/useDateFormat";

// Often enough for a notice to show up within a minute or so.
const POLL_MS = 60 * 1000;

// The member's own notifications: an unread count on the bell, the latest ones in a
// list with an icon per kind of event, and opening one marks it read and goes to the
// record it is about.
export function NotificationsBell() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ orgnization: string }>();
  const { items, unreadCount, isLoaded, isLoading, error } = useAppSelector((state) => state.notifications);
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState(false);
  const orgSlug = params?.orgnization ?? "";

  useEffect(() => {
    dispatch(reqToGetNotifications({}));
    const timer = setInterval(() => dispatch(reqToGetNotifications({})), POLL_MS);
    return () => clearInterval(timer);
  }, [dispatch]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) dispatch(reqToGetNotifications({}));
  };

  // Marking read always happens; going somewhere only when the notice says where.
  // A notice about something this panel has no screen for is still read, so the
  // count is right and the bell does not look stuck.
  const openNotification = (item: AppNotification) => {
    if (!item.readAt) dispatch(reqToMarkNotificationRead({ data: { id: item.id } }));
    const href = hrefForLink(item.link, orgSlug);
    if (!href) return;
    setOpen(false);
    router.push(href);
  };

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label}>
          <Bell className="size-5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-5 text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto shrink-0 gap-1 p-0 text-xs"
              onClick={() => dispatch(reqToMarkAllNotificationsRead({}))}
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Mark all as read
            </Button>
          )}
        </div>
        {/* A failed mark-all leaves the list readable, so it is said here rather
            than replacing everything with an error. */}
        {error && isLoaded && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
        {error && !isLoaded ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Couldn&apos;t load notifications. Try again in a moment.</p>
        ) : !isLoaded && isLoading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <CheckCheck className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">New leads, follow-ups, invoices and campaign changes show up here.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const { Icon, tone } = lookOf(item.type);
                const headline = item.title ?? item.message;
                // The message is only shown under the headline when it adds
                // something: an older notice has the same text for both.
                const detail = item.title && item.message !== item.title ? item.message : null;
                const goesSomewhere = !!hrefForLink(item.link, orgSlug);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-muted",
                        !item.readAt && "bg-primary/5",
                      )}
                    >
                      <span className={cn("mt-0.5 shrink-0", tone)}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className={cn("block truncate", !item.readAt && "font-medium")}>{headline}</span>
                        {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
                        <span className="block text-xs text-muted-foreground">
                          {formatDateTime(item.createdAt, "")}
                          {!item.readAt && <span className="sr-only"> · unread</span>}
                          {!goesSomewhere && <span className="sr-only"> · nothing to open</span>}
                        </span>
                      </span>
                      <span
                        className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-primary")}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
        {/* Where to change what arrives here, and by email. Every member has it. */}
        <div className="border-t border-border px-4 py-2">
          <Link
            href={buildOrgRoute(orgSlug, pageRoutes.settingsNotifications)}
            className="text-xs text-muted-foreground underline"
            onClick={() => setOpen(false)}
          >
            Notification settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
