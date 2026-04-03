"use client";

import * as Popover from "@radix-ui/react-popover";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Loader2, MessageCircleMore, PackageCheck, ShieldAlert, Store, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type:
    | "LISTING_SOLD"
    | "MESSAGE_RECEIVED"
    | "FOLLOW_RECEIVED"
    | "VERIFIED_SELLER_APPROVED"
    | "VERIFIED_SELLER_REJECTED"
    | "PURCHASE_UPDATED"
    | "ACCOUNT_ALERT";
  title: string;
  body: string | null;
  href: string;
  isRead: boolean;
  createdAt: string;
};

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "LISTING_SOLD":
      return PackageCheck;
    case "MESSAGE_RECEIVED":
      return MessageCircleMore;
    case "FOLLOW_RECEIVED":
      return UserPlus;
    case "VERIFIED_SELLER_APPROVED":
    case "VERIFIED_SELLER_REJECTED":
      return Store;
    case "ACCOUNT_ALERT":
      return ShieldAlert;
    case "PURCHASE_UPDATED":
      return PackageCheck;
    default:
      return Bell;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=12", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load notifications.");
      }

      const data = (await response.json()) as {
        items: NotificationItem[];
        unreadCount: number;
      };

      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] load failed", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const onFocus = () => {
      void loadNotifications();
    };

    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 45000);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  const hasUnread = unreadCount > 0;
  const unreadLabel = useMemo(() => (unreadCount > 9 ? "9+" : String(unreadCount)), [unreadCount]);

  const markOneRead = useCallback(
    async (notificationId: string) => {
      setItems((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          credentials: "same-origin"
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[notifications] mark read failed", error);
        }
      }
    },
    []
  );

  const handleOpenNotification = useCallback(
    async (notification: NotificationItem) => {
      if (!notification.isRead) {
        await markOneRead(notification.id);
      }

      setOpen(false);
      router.push(notification.href);
      router.refresh();
    },
    [markOneRead, router]
  );

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "same-origin"
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[notifications] mark all failed", error);
      }
    } finally {
      setMarkingAll(false);
    }
  }, []);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void loadNotifications();
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="surface-pill relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground"
        >
          <Bell className="h-4.5 w-4.5" />
          {hasUnread ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {unreadLabel}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={12}
          className="z-50 w-[min(24rem,calc(100vw-1rem))] rounded-[1.5rem] border border-border/80 bg-background/98 p-3 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {hasUnread ? `${unreadCount} unread` : "You’re all caught up"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              disabled={!hasUnread || markingAll}
              onClick={handleMarkAllRead}
            >
              {markingAll ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="mr-1 h-3.5 w-3.5" />}
              Mark all read
            </Button>
          </div>

          <ScrollArea className="max-h-[min(70vh,28rem)]">
            <div className="space-y-2 pr-2">
              {loading ? (
                <div className="surface-subtle rounded-[1.25rem] border border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : items.length ? (
                items.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void handleOpenNotification(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[1.25rem] border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-border hover:bg-card/70",
                        notification.isRead
                          ? "border-transparent bg-transparent"
                          : "border-border/80 bg-card/65 shadow-soft"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          notification.isRead ? "bg-card text-muted-foreground" : "bg-orange-500/12 text-orange-500"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={cn("text-sm leading-5", notification.isRead ? "text-foreground/88" : "font-semibold text-foreground")}>
                            {notification.title}
                          </p>
                          <span className="shrink-0 pt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {notification.body ? (
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">{notification.body}</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="surface-subtle rounded-[1.25rem] border border-border/70 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No notifications yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sales, follows, and messages will show up here.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
