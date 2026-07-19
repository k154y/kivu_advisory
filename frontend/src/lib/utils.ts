import type { KeyboardEvent } from "react";

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

export const cn = (...inputs: ClassValue[]) => {
  const classes: string[] = [];

  const addClass = (input: ClassValue) => {
    if (!input) return;

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
      return;
    }

    if (Array.isArray(input)) {
      input.forEach(addClass);
      return;
    }

    if (typeof input === "object") {
      Object.entries(input).forEach(([className, condition]) => {
        if (condition) {
          classes.push(className);
        }
      });
    }
  };

  inputs.forEach(addClass);

  return classes.join(" ");
};

export const isBrowser = () => typeof window !== "undefined";

export const sleep = (milliseconds: number) => {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

export const cleanObject = <T extends Record<string, unknown>>(value: T) => {
  const result: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, item]) => {
    if (item === undefined || item === null || item === "") {
      return;
    }

    result[key] = item;
  });

  return result as Partial<T>;
};

export const buildQueryString = (
  params?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
};

export const buildPathWithQuery = (
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
) => {
  return `${path}${buildQueryString(params)}`;
};

export const toSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const capitalizeFirst = (value?: string | null) => {
  if (!value) return "";

  const cleanValue = value.trim();

  if (!cleanValue) return "";

  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
};

export const getSafeInitials = (name?: string | null) => {
  if (!name) return "KA";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "KA";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

export const getSafeArray = <T>(value: T[] | null | undefined) => {
  return Array.isArray(value) ? value : [];
};

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const normalizeSearchValue = (value?: string | null) => {
  return value?.trim() || "";
};

export const getErrorText = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong. Please try again.";
};

export const copyToClipboard = async (value: string) => {
  if (!isBrowser()) {
    return false;
  }

  if (!navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

export const scrollToTop = () => {
  if (!isBrowser()) return;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

export const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (isBrowser()) {
    return window.location.origin;
  }

  return "http://localhost:3000";
};

export const createAbsoluteUrl = (path: string) => {
  const baseUrl = getBaseUrl().replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
};

export const isExternalUrl = (href: string) => {
  return href.startsWith("http://") || href.startsWith("https://");
};

export const preventSubmitOnEnter = (
  event: KeyboardEvent<HTMLFormElement>,
) => {
  if (event.key !== "Enter") return;

  const target = event.target as HTMLElement;

  if (target.tagName.toLowerCase() === "textarea") {
    return;
  }

  event.preventDefault();
};