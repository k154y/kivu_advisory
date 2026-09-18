const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export function resolveMediaUrl(value?: string | null): string {
  const url = value?.trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("/media/")) {
    try {
      const apiOrigin = new URL(API_BASE_URL).origin;
      return `${apiOrigin}${url}`;
    } catch {
      return url;
    }
  }

  return url;
}