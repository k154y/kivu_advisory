import { api } from "@/lib/api";

type UnknownRecord = Record<string, unknown>;

export type AccountantResolvedRequest = {
  id: string;
  referenceNumber: string;
  title: string;
  clientName?: string;
  clientUserId?: string;
  accountantName?: string;
  accountantUserId?: string;
};

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

function unwrapData(response: unknown): unknown {
  if (!response || typeof response !== "object") return response;

  const objectResponse = response as {
    data?: unknown;
    item?: unknown;
    request?: unknown;
    service_request?: unknown;
    assignment?: unknown;
  };

  if (objectResponse.service_request) return objectResponse.service_request;
  if (objectResponse.request) return objectResponse.request;
  if (objectResponse.assignment) return objectResponse.assignment;
  if (objectResponse.item) return objectResponse.item;

  if (objectResponse.data && typeof objectResponse.data === "object") {
    const nested = objectResponse.data as {
      data?: unknown;
      item?: unknown;
      request?: unknown;
      service_request?: unknown;
      assignment?: unknown;
    };

    if (nested.service_request) return nested.service_request;
    if (nested.request) return nested.request;
    if (nested.assignment) return nested.assignment;
    if (nested.item) return nested.item;
    if (nested.data) return nested.data;
  }

  return objectResponse.data || response;
}

function readString(source: UnknownRecord | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getNestedRequest(source: UnknownRecord | undefined) {
  if (!source) return undefined;

  if (source.service_request && typeof source.service_request === "object") {
    return source.service_request as UnknownRecord;
  }

  if (source.request && typeof source.request === "object") {
    return source.request as UnknownRecord;
  }

  return undefined;
}

function normalizeRequest(source: unknown): AccountantResolvedRequest | null {
  const unwrapped = unwrapData(source);

  if (!unwrapped || typeof unwrapped !== "object") return null;

  const objectSource = unwrapped as UnknownRecord;
  const nested = getNestedRequest(objectSource);

  const id =
    readString(objectSource, ["service_request_id", "request_id"]) ||
    readString(nested, ["id", "service_request_id", "request_id"]) ||
    readString(objectSource, ["id"]);

  if (!id) return null;

  const referenceNumber =
    readString(objectSource, [
      "reference_number",
      "service_request_reference_number",
      "request_reference_number",
    ]) ||
    readString(nested, [
      "reference_number",
      "service_request_reference_number",
      "request_reference_number",
    ]);

  const title =
    readString(objectSource, [
      "title",
      "service_name",
      "service_title",
      "request_title",
    ]) ||
    readString(nested, [
      "title",
      "service_name",
      "service_title",
      "request_title",
    ]) ||
    "Service request";

  const clientName =
    readString(objectSource, [
      "requester_name",
      "client_name",
      "full_name",
      "name",
    ]) ||
    readString(nested, ["requester_name", "client_name", "full_name", "name"]);

  const clientUserId =
    readString(objectSource, ["client_user_id", "client_id", "user_id"]) ||
    readString(nested, ["client_user_id", "client_id", "user_id"]);

  const accountantName =
    readString(objectSource, [
      "accountant_name",
      "assigned_accountant_name",
      "assigned_to_name",
    ]) ||
    readString(nested, [
      "accountant_name",
      "assigned_accountant_name",
      "assigned_to_name",
    ]);

  const accountantUserId =
    readString(objectSource, [
      "accountant_user_id",
      "assigned_accountant_user_id",
      "assigned_to",
    ]) ||
    readString(nested, [
      "accountant_user_id",
      "assigned_accountant_user_id",
      "assigned_to",
    ]);

  return {
    id,
    referenceNumber: referenceNumber || id,
    title,
    clientName,
    clientUserId,
    accountantName,
    accountantUserId,
  };
}

async function fetchRequestReferenceFromDetail(
  assignmentId: string,
  serviceRequestId: string,
) {
  const paths = [
    `/accountant/service-requests/detail?id=${encodeURIComponent(
      serviceRequestId,
    )}`,
    `/accountant/requests/detail?id=${encodeURIComponent(serviceRequestId)}`,
    `/accountant/assignments/detail?id=${encodeURIComponent(assignmentId)}`,
  ];

  for (const path of paths) {
    try {
      const result = await api.get<unknown>(path);
      const request = normalizeRequest(result.data);

      if (request && request.referenceNumber !== request.id) {
        return request;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function resolveAccountantRequestMap() {
  const result = await api.get<unknown>("/accountant/assignments?page_size=500");
  const assignments = getItems<unknown>(result.data);

  const map = new Map<string, AccountantResolvedRequest>();

  await Promise.all(
    assignments.map(async (assignment) => {
      const base = normalizeRequest(assignment);

      if (!base) return;

      const assignmentObject =
        assignment && typeof assignment === "object"
          ? (assignment as UnknownRecord)
          : {};

      const assignmentId = readString(assignmentObject, ["id"]);

      let resolved = base;

      if (assignmentId && base.referenceNumber === base.id) {
        const detail = await fetchRequestReferenceFromDetail(
          assignmentId,
          base.id,
        );

        if (detail) {
          resolved = {
            ...base,
            ...detail,
            id: base.id,
          };
        }
      }

      map.set(base.id, resolved);
    }),
  );

  return map;
}