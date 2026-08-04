"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api";

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeActionUrl(actionUrl?: string) {
  if (!actionUrl) return "";

  if (actionUrl === "/client/service-requests") {
    return "/client/requests";
  }

  return actionUrl;
}

function getNotificationsPage(role?: string) {
  switch (role) {
    case "admin":
      return "/admin/notifications";
    case "accountant":
      return "/accountant/notifications";
    case "client":
    default:
      return "/client/notifications";
  }
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  }>({
    top: 0,
    left: 0,
    width: 360,
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const notificationsPage = useMemo(
    () => getNotificationsPage(user?.role),
    [user?.role],
  );

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(360, window.innerWidth - margin * 2);

    const left = Math.min(
      Math.max(margin, rect.right - width),
      window.innerWidth - width - margin,
    );

    setDropdownStyle({
      top: rect.bottom + 10,
      left,
      width,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [items, count] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);

      setNotifications(items.slice(0, 8));
      setUnreadCount(count);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    const handleResize = () => updateDropdownPosition();
    const handleScroll = () => updateDropdownPosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;

      setOpen(false);
    }

    window.document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at: new Date().toISOString(),
                }
              : item,
          ),
        );

        setUnreadCount((current) => Math.max(0, current - 1));
      }

      setOpen(false);

      const actionUrl = normalizeActionUrl(notification.action_url);

      if (actionUrl) {
        router.push(actionUrl);
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to open notification."));
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);

    try {
      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to mark notifications as read."),
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      style={{
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
      }}
      className="fixed z-[99999] overflow-hidden rounded-2xl border border-gray-100 bg-white text-charcoal shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="font-bold text-navy">Notifications</h3>
          <p className="text-xs text-gray-400">{unreadCount} unread</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:bg-lightgray hover:text-navy disabled:opacity-50"
            aria-label="Refresh notifications"
          >
            <RefreshCcw
              size={14}
              className={loading ? "animate-spin" : undefined}
            />
          </button>

          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={markingAll || unreadCount === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:bg-lightgray hover:text-navy disabled:opacity-50"
            aria-label="Mark all notifications as read"
          >
            {markingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={14} />
            )}
          </button>
        </div>
      </div>

      <div className="max-h-[380px] overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="mx-auto mb-3 animate-spin text-navy" />
            <p className="text-sm text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lightgray">
              <Bell size={20} className="text-gray-300" />
            </div>

            <h4 className="font-semibold text-navy">No notifications yet</h4>

            <p className="mt-1 text-sm text-gray-400">
              Important updates will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleNotificationClick(notification)}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-lightgray/60"
              >
                <div className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                      notification.is_read ? "bg-gray-200" : "bg-teal",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm",
                        notification.is_read
                          ? "font-medium text-gray-600"
                          : "font-bold text-navy",
                      )}
                    >
                      {notification.title}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                      {notification.body}
                    </p>

                    <p className="mt-2 text-[11px] text-gray-400">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>

                  {notification.action_url ? (
                    <ChevronRight
                      size={15}
                      className="mt-1 shrink-0 text-gray-300"
                    />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        <Link
          href={notificationsPage}
          onClick={() => setOpen(false)}
          className="flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white text-navy shadow-sm transition-colors hover:bg-lightgray"
        aria-label="Notifications"
      >
        <Bell size={18} />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {mounted && open ? createPortal(dropdown, window.document.body) : null}
    </>
  );
}