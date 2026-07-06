import type {
  ApiEnvelope,
  ApiErrorBody,
  ApiRequestOptions,
  PaginationMeta,
  TokenResponse,
} from "@/types/api";

const DEFAULT_API_BASE_URL = "http://localhost:8080/api/v1";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

const ACCESS_TOKEN_KEY = "kivu_advisory_access_token";
const REFRESH_TOKEN_KEY = "kivu_advisory_refresh_token";
const AUTH_USER_KEY = "kivu_advisory_user";

type ApiClientResult<T> = {
  data: T;
  message?: string;
  meta?: PaginationMeta | unknown;
};

type DownloadResult = {
  blob: Blob;
  filename: string;
  contentType: string;
};

type RequestBody = BodyInit | Record<string, unknown> | unknown[] | null;

const isBrowser = () => typeof window !== "undefined";

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBaseUrl}${cleanPath}`;
};

const isFormData = (value: unknown): value is FormData => {
  return typeof FormData !== "undefined" && value instanceof FormData;
};

const isBlob = (value: unknown): value is Blob => {
  return typeof Blob !== "undefined" && value instanceof Blob;
};

const isBodyInit = (value: unknown): value is BodyInit => {
  return (
    typeof value === "string" ||
    value instanceof URLSearchParams ||
    isFormData(value) ||
    isBlob(value) ||
    value instanceof ArrayBuffer
  );
};

const safeJsonParse = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const getFilenameFromHeader = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return "download";
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (normalMatch?.[1]) {
    return normalMatch[1];
  }

  return "download";
};

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export const tokenStorage = {
  getAccessToken() {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getUser() {
    if (!isBrowser()) return null;

    const rawUser = window.localStorage.getItem(AUTH_USER_KEY);
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  },

  setAuth(tokenResponse: TokenResponse) {
    if (!isBrowser()) return;

    window.localStorage.setItem(
      ACCESS_TOKEN_KEY,
      tokenResponse.access_token,
    );
    window.localStorage.setItem(
      REFRESH_TOKEN_KEY,
      tokenResponse.refresh_token,
    );
    window.localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify(tokenResponse.user),
    );
  },

  setAccessToken(accessToken: string) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  clear() {
    if (!isBrowser()) return;

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
  },
};

const prepareRequestBody = (
  body: ApiRequestOptions["body"],
  headers: Headers,
): RequestBody | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (body === null) {
    return null;
  }

  if (isFormData(body)) {
    return body;
  }

  if (isBodyInit(body)) {
    return body;
  }

  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
};

const createHeaders = (
  options?: Pick<ApiRequestOptions, "headers" | "auth" | "body">,
) => {
  const headers = new Headers(options?.headers);

  headers.set("Accept", "application/json");

  const shouldAttachAuth = options?.auth !== false;
  const accessToken = tokenStorage.getAccessToken();

  if (shouldAttachAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
};

export async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiClientResult<T>> {
  const method = options.method || "GET";
  const headers = createHeaders(options);
  const body = prepareRequestBody(options.body, headers);

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body,
    cache: options.cache || "no-store",
    credentials: "include",
  });

  if (response.status === 204) {
    return {
      data: undefined as T,
    };
  }

  const envelope = await safeJsonParse<ApiEnvelope<T>>(response);

  if (!envelope) {
    const error: ApiErrorBody = {
      code: "invalid_response",
      message: "The server returned an invalid response.",
    };

    throw new ApiClientError(response.status, error);
  }

  if (!response.ok || envelope.success === false) {
    if (response.status === 401) {
      tokenStorage.clear();
    }

    const error =
      envelope.success === false
        ? envelope.error
        : {
            code: "request_failed",
            message: response.statusText || "Request failed.",
          };

    throw new ApiClientError(response.status, error);
  }

  return {
    data: envelope.data as T,
    message: envelope.message,
    meta: envelope.meta,
  };
}

export const api = {
  request,

  get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(path, {
      ...options,
      method: "GET",
    });
  },

  post<T>(
    path: string,
    body?: ApiRequestOptions["body"],
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>(path, {
      ...options,
      method: "POST",
      body,
    });
  },

  put<T>(
    path: string,
    body?: ApiRequestOptions["body"],
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>(path, {
      ...options,
      method: "PUT",
      body,
    });
  },

  patch<T>(
    path: string,
    body?: ApiRequestOptions["body"],
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>(path, {
      ...options,
      method: "PATCH",
      body,
    });
  },

  del<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(path, {
      ...options,
      method: "DELETE",
    });
  },

  uploadFile<T>(
    path: string,
    formData: FormData,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) {
    return request<T>(path, {
      ...options,
      method: "POST",
      body: formData,
      auth: options?.auth ?? true,
    });
  },

  async downloadFile(path: string): Promise<DownloadResult> {
    const headers = new Headers();

    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(buildUrl(path), {
      method: "GET",
      headers,
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        tokenStorage.clear();
      }

      const envelope = await safeJsonParse<ApiEnvelope<unknown>>(response);

      const error =
        envelope && envelope.success === false
          ? envelope.error
          : {
              code: "download_failed",
              message: response.statusText || "File download failed.",
            };

      throw new ApiClientError(response.status, error);
    }

    const blob = await response.blob();

    return {
      blob,
      filename: getFilenameFromHeader(response.headers.get("Content-Disposition")),
      contentType: response.headers.get("Content-Type") || "application/octet-stream",
    };
  },
};

export const isApiClientError = (error: unknown): error is ApiClientError => {
  return error instanceof ApiClientError;
};

export const getApiErrorMessage = (error: unknown) => {
  if (isApiClientError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

export const getValidationErrors = (error: unknown) => {
  if (!isApiClientError(error)) {
    return null;
  }

  if (error.code !== "validation_error") {
    return null;
  }

  if (!error.details || typeof error.details !== "object") {
    return null;
  }

  return error.details as Record<string, string>;
};