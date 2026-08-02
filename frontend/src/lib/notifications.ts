import { api } from "@/lib/api";
import type {
  Notification,
  UnreadNotificationCountResponse,
} from "@/types/api";

function getItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: T[];
    data?: T[] | { items?: T[] };
  };

  if (Array.isArray(objectResponse.items)) return objectResponse.items;
  if (Array.isArray(objectResponse.data)) return objectResponse.data;

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function unwrapObject<T>(response: unknown): T | null {
  if (!response || typeof response !== "object") return null;

  const objectResponse = response as {
    data?: unknown;
    item?: unknown;
  };

  if (objectResponse.item) return objectResponse.item as T;

  if (objectResponse.data && typeof objectResponse.data === "object") {
    const nested = objectResponse.data as {
      data?: unknown;
      item?: unknown;
    };

    if (nested.item) return nested.item as T;
    if (nested.data) return nested.data as T;

    return objectResponse.data as T;
  }

  return response as T;
}

export async function getNotifications() {
  const result = await api.get<unknown>("/notifications?page_size=20");
  return getItems<Notification>(result.data);
}

export async function getUnreadNotificationCount() {
  const result = await api.get<unknown>("/notifications/unread-count");
  const data = unwrapObject<UnreadNotificationCountResponse>(result.data);

  return data?.unread_count ?? data?.count ?? data?.total ?? 0;
}

export async function markNotificationRead(id: string) {
  return api.patch(`/notifications/read?id=${encodeURIComponent(id)}`, {});
}

export async function markAllNotificationsRead() {
  return api.patch("/notifications/read-all", {});
}