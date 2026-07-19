import { getApiErrorMessage } from "@/lib/api";

type ItemEnvelope<T> = {
  items?: T[];
  pagination?: {
    page?: number;
    page_size?: number;
    total_items?: number;
    total_pages?: number;
  };
};

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function extractItems<T>(value?: unknown) {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items as T[];
  }

  return [];
}

export function extractTotalCount<T>(value?: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (
    isRecord(value) &&
    isRecord(value.pagination) &&
    typeof value.pagination.total_items === "number"
  ) {
    return value.pagination.total_items;
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items.length;
  }

  return 0;
}

export function extractPaginationInfo(value?: unknown): PaginationInfo {
  if (isRecord(value) && isRecord(value.pagination)) {
    return {
      page:
        typeof value.pagination.page === "number" ? value.pagination.page : 1,
      pageSize:
        typeof value.pagination.page_size === "number"
          ? value.pagination.page_size
          : 20,
      totalItems:
        typeof value.pagination.total_items === "number"
          ? value.pagination.total_items
          : 0,
      totalPages:
        typeof value.pagination.total_pages === "number"
          ? value.pagination.total_pages
          : 1,
    };
  }

  return {
    page: 1,
    pageSize: 20,
    totalItems: Array.isArray(value) ? value.length : 0,
    totalPages: 1,
  };
}

export function getSafeErrorMessage(
  error: unknown,
  fallback = "Something went wrong while loading this information.",
) {
  const message = getApiErrorMessage(error);

  return message?.trim() ? message : fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
