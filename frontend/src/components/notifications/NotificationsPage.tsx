"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api";

type NotificationsPageProps = {
  title: string;
  subtitle?: string;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
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

export function NotificationsPage({
  title,
  subtitle,
}: NotificationsPageProps) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const items = await getNotifications();
      setNotifications(items);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load notifications."),
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenNotification = async (notification: Notification) => {
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
      }

      const actionUrl = normalizeActionUrl(notification.action_url);

      if (actionUrl) {
        router.push(actionUrl);
      }
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to open notification."),
      );
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

      toast.success("All notifications marked as read.");
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to mark notifications as read."),
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div>
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-gold">
              Notification Center
            </p>

            <h1 className="text-2xl font-bold text-navy">{title}</h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {subtitle ||
                "View service request updates, document requests, messages, assignments, and security alerts."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
            >
              <RefreshCcw
                size={15}
                className={loading ? "animate-spin" : undefined}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCheck size={15} />
              )}
              Mark all read
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-navy">
            Recent Notifications
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            {unreadCount} unread · {notifications.length} total
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto mb-3 animate-spin text-navy" />
            <p className="text-sm text-gray-400">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
              <Bell size={28} className="text-gray-300" />
            </div>

            <h3 className="font-semibold text-navy">No notifications yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              Important updates will appear here when the backend creates in-app
              notifications for your account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleOpenNotification(notification)}
                className="block w-full px-5 py-4 text-left transition-colors hover:bg-lightgray/60"
              >
                <div className="flex gap-4">
                  <span
                    className={cn(
                      "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                      notification.is_read ? "bg-gray-200" : "bg-teal",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "text-sm",
                          notification.is_read
                            ? "font-medium text-gray-600"
                            : "font-bold text-navy",
                        )}
                      >
                        {notification.title}
                      </span>

                      <span className="rounded-full bg-lightgray px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-500">
                        {notification.notification_type?.replace(/_/g, " ") ||
                          "Notification"}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-gray-500">
                      {notification.body}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>

                  {notification.action_url ? (
                    <ChevronRight
                      size={18}
                      className="mt-1 shrink-0 text-gray-300"
                    />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}