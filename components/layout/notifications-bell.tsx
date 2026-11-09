"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetNotifications, reqToMarkNotificationRead } from "@/lib/store/slices/notificationsSlice";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/usage/types";

// Often enough for a usage alert to show up within a minute or so.
const POLL_MS = 60 * 1000;

const whenText = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

// The member's own notifications: an unread count on the bell, the latest
// ones in a list, and marking one read when it is opened.
export function NotificationsBell() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ orgnization: string }>();
  const { items, unreadCount, isLoaded, isLoading, error } = useAppSelector((state) => state.notifications);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    dispatch(reqToGetNotifications({}));
    const timer = setInterval(() => dispatch(reqToGetNotifications({})), POLL_MS);
    return () => clearInterval(timer);
  }, [dispatch]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) dispatch(reqToGetNotifications({}));
  };

  const openNotification = (item: AppNotification) => {
    if (!item.readAt) dispatch(reqToMarkNotificationRead({ data: { id: item.id } }));
    // Usage alerts all lead to the same place: what is used and what to do.
    if (item.type.startsWith("usage.")) {
      setOpen(false);
      router.push(buildOrgRoute(params?.orgnization ?? "", pageRoutes.settingsUsage));
    }
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}</p>
        </div>
        {error && !isLoaded ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Couldn&apos;t load notifications. Try again in a moment.</p>
        ) : !isLoaded && isLoading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-muted", !item.readAt && "bg-primary/5")}
                  >
                    <span
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-primary")}
                      aria-hidden
                    />
                    <span className="space-y-1">
                      <span className="block">{item.message}</span>
                      <span className="block text-xs text-muted-foreground">
                        {whenText(item.createdAt)}
                        {!item.readAt && <span className="sr-only"> · unread</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
