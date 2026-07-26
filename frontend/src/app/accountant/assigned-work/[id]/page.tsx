"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AccountantClientCredentialsCard } from "@/components/tax-credentials/AccountantClientCredentialsCard";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;

type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

type Priority = "low" | "normal" | "high" | "urgent";

type AssignmentDetail = {
  id: string;
  service_request_id?: string;
  accountant_user_id?: string;
  status: AssignmentStatus | string;
  priority?: Priority | string;
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  service_request?: UnknownRecord;
  request?: UnknownRecord;
};

type DocumentItem = {
  id: string;
  service_request_id?: string;
  file_name?: string;
  original_file_name?: string;
  original_name?: string;
  file_type?: string;
  mime_type?: string;
  document_type?: string;
  visibility?: string;
  description?: string;
  uploaded_by?: string;
  uploaded_by_user_id?: string;
  uploader_name?: string;
  uploader_role?: string;
  created_at?: string;
  updated_at?: string;
  file_size_bytes?: number;
};

const STATUS_OPTIONS: AssignmentStatus[] = [
  "assigned",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

function getResponseData(response: unknown): unknown {
  if (!response || typeof response !== "object") return response;

  const objectResponse = response as {
    data?: unknown;
    item?: unknown;
    assignment?: unknown;
    service_request?: unknown;
    request?: unknown;
  };

  if (objectResponse.assignment) return objectResponse.assignment;
  if (objectResponse.service_request) return objectResponse.service_request;
  if (objectResponse.request) return objectResponse.request;
  if (objectResponse.item) return objectResponse.item;

  if (objectResponse.data) {
    const nested = objectResponse.data;

    if (nested && typeof nested === "object") {
      const nestedObject = nested as {
        data?: unknown;
        item?: unknown;
        assignment?: unknown;
        service_request?: unknown;
        request?: unknown;
      };

      if (nestedObject.assignment) return nestedObject.assignment;
      if (nestedObject.service_request) return nestedObject.service_request;
      if (nestedObject.request) return nestedObject.request;
      if (nestedObject.item) return nestedObject.item;
      if (nestedObject.data) return nestedObject.data;
    }

    return nested;
  }

  return response;
}

function getAssignmentDetail(response: unknown): AssignmentDetail | null {
  const data = getResponseData(response);

  if (!data || typeof data !== "object") return null;

  if (Array.isArray(data)) {
    const first = data[0];

    return first && typeof first === "object"
      ? (first as AssignmentDetail)
      : null;
  }

  return data as AssignmentDetail;
}

function getListItems<T>(response: unknown): T[] {
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

function readString(source: UnknownRecord | null | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function readNullableString(
  source: UnknownRecord | null | undefined,
  keys: string[],
) {
  const value = readString(source, keys);
  return value || undefined;
}

function readRecord(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return undefined;

  const record = source as UnknownRecord;

  for (const key of keys) {
    const value = record[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as UnknownRecord;
    }
  }

  return undefined;
}

function getRequestObject(detail: AssignmentDetail): UnknownRecord {
  const serviceRequest = detail.service_request;
  const request = detail.request;

  if (serviceRequest && typeof serviceRequest === "object") {
    return serviceRequest;
  }

  if (request && typeof request === "object") {
    return request;
  }

  return {};
}

function resolveClientIdForCredentials(
  detail: AssignmentDetail,
  serviceRequest: UnknownRecord,
) {
  const detailRecord = detail as unknown as UnknownRecord;

  const nestedRequest =
    readRecord(detailRecord, ["service_request", "request"]) || serviceRequest;

  const serviceRequestClient =
    readRecord(serviceRequest, ["client", "client_profile", "clientProfile"]) ||
    readRecord(serviceRequest, ["customer", "requester"]);

  const detailClient =
    readRecord(detailRecord, ["client", "client_profile", "clientProfile"]) ||
    readRecord(detailRecord, ["customer", "requester"]);

  const nestedRequestClient =
    readRecord(nestedRequest, ["client", "client_profile", "clientProfile"]) ||
    readRecord(nestedRequest, ["customer", "requester"]);

  return (
    readNullableString(serviceRequest, [
      "client_id",
      "client_profile_id",
      "clientId",
      "client_profileId",
    ]) ||
    readNullableString(serviceRequestClient, [
      "id",
      "client_id",
      "client_profile_id",
      "clientId",
    ]) ||
    readNullableString(detailRecord, [
      "client_id",
      "client_profile_id",
      "clientId",
      "client_profileId",
    ]) ||
    readNullableString(detailClient, [
      "id",
      "client_id",
      "client_profile_id",
      "clientId",
    ]) ||
    readNullableString(nestedRequest, [
      "client_id",
      "client_profile_id",
      "clientId",
      "client_profileId",
    ]) ||
    readNullableString(nestedRequestClient, [
      "id",
      "client_id",
      "client_profile_id",
      "clientId",
    ])
  );
}

function resolveReferenceNumber(
  detail: AssignmentDetail,
  serviceRequest: UnknownRecord,
) {
  const detailRecord = detail as unknown as UnknownRecord;
  const nestedRequest =
    readRecord(detailRecord, ["service_request", "request"]) || serviceRequest;

  return (
    readNullableString(serviceRequest, [
      "reference_number",
      "reference",
      "service_request_reference_number",
      "request_reference_number",
    ]) ||
    readNullableString(detailRecord, [
      "reference_number",
      "reference",
      "service_request_reference_number",
      "request_reference_number",
    ]) ||
    readNullableString(nestedRequest, [
      "reference_number",
      "reference",
      "service_request_reference_number",
      "request_reference_number",
    ])
  );
}

function formatDateShort(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTitle(value?: string) {
  if (!value) return "Assigned Request";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    assigned: "Assigned",
    accepted: "Accepted",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[status || ""] || formatTitle(status || "Unknown");
}

function getStatusColor(status?: string) {
  const colors: Record<string, string> = {
    assigned: "bg-blue-50 text-blue-700 border border-blue-100",
    accepted: "bg-teal/10 text-teal border border-teal/20",
    in_progress: "bg-amber-50 text-amber-700 border border-amber-100",
    completed: "bg-green-50 text-green-700 border border-green-100",
    cancelled: "bg-red-50 text-red-700 border border-red-100",
  };

  return colors[status || ""] || "bg-gray-100 text-gray-600";
}

function getPriorityColor(priority?: string) {
  const colors: Record<string, string> = {
    urgent: "bg-red-50 text-red-700 border border-red-100",
    high: "bg-orange-50 text-orange-700 border border-orange-100",
    normal: "bg-gray-100 text-gray-600 border border-gray-100",
    low: "bg-green-50 text-green-700 border border-green-100",
  };

  return colors[priority || ""] || colors.normal;
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getCreatedTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getTokenFromStorage() {
  if (typeof window === "undefined") return "";

  const directKeys = [
    "access_token",
    "auth_token",
    "token",
    "kivu_access_token",
    "kivu_advisory_access_token",
  ];

  for (const key of directKeys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  const jsonKeys = [
    "auth",
    "user",
    "auth_user",
    "kivu_user",
    "kivu_auth",
    "kivu_advisory_user",
  ];

  for (const key of jsonKeys) {
    const value = window.localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value) as {
        access_token?: string;
        token?: string;
        data?: { access_token?: string; token?: string };
      };

      if (parsed.access_token) return parsed.access_token;
      if (parsed.token) return parsed.token;
      if (parsed.data?.access_token) return parsed.data.access_token;
      if (parsed.data?.token) return parsed.data.token;
    } catch {
      continue;
    }
  }

  return "";
}

function getDocumentFileName(document: DocumentItem) {
  return (
    document.original_file_name ||
    document.original_name ||
    document.file_name ||
    "document"
  );
}

function getDocumentTypeLabel(value?: string) {
  if (!value) return "Document";
  return formatTitle(value);
}

function getDocumentVisibilityLabel(value?: string) {
  if (!value) return "Shared";
  return formatTitle(value);
}

function formatFileSize(value?: number) {
  if (!value || value <= 0) return "";

  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadDocument(document: DocumentItem) {
  const token = getTokenFromStorage();

  if (!token) {
    toast.error("Authentication token not found. Please log in again.");
    return;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/documents/download?id=${encodeURIComponent(document.id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to download document.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = getDocumentFileName(document);
    window.document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to download document."));
  }
}

export default function AccountantAssignedWorkDetailPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;

  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceRequest = useMemo(() => {
    if (!detail) return {};
    return getRequestObject(detail);
  }, [detail]);

  const serviceRequestId = useMemo(() => {
    if (!detail) return "";

    return (
      detail.service_request_id ||
      readString(serviceRequest, ["id", "service_request_id", "request_id"]) ||
      ""
    );
  }, [detail, serviceRequest]);

  const loadDocuments = useCallback(async (requestId: string) => {
    if (!requestId) return;

    setLoadingDocuments(true);

    try {
      const result = await api.get<unknown>(
        `/documents?service_request_id=${encodeURIComponent(
          requestId,
        )}&page_size=100`,
      );

      setDocuments(
        getListItems<DocumentItem>(result.data).sort(
          (a, b) => getCreatedTime(b.created_at) - getCreatedTime(a.created_at),
        ),
      );
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!assignmentId) return;

    setLoading(true);
    setError(null);

    try {
      let loaded: AssignmentDetail | null = null;

      try {
        const result = await api.get<unknown>(
          `/accountant/assignments/detail?id=${encodeURIComponent(
            assignmentId,
          )}`,
        );

        loaded = getAssignmentDetail(result.data);
      } catch {
        const listResult = await api.get<unknown>(
          "/accountant/assignments?page_size=100",
        );

        const items = getListItems<AssignmentDetail>(listResult.data);
        loaded = items.find((item) => item.id === assignmentId) || null;
      }

      if (!loaded) {
        throw new Error("Assigned request could not be found.");
      }

      setDetail(loaded);

      const requestObject = getRequestObject(loaded);
      const requestId =
        loaded.service_request_id ||
        readString(requestObject, ["id", "service_request_id", "request_id"]);

      if (requestId) {
        await loadDocuments(requestId);
      } else {
        setDocuments([]);
      }
    } catch (loadError) {
      setDetail(null);
      setDocuments([]);
      setError(
        getSafeErrorMessage(loadError, "Failed to load assigned request."),
      );
      toast.error(
        getSafeErrorMessage(loadError, "Failed to load assigned request."),
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId, loadDocuments]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (nextStatus: AssignmentStatus) => {
    if (!detail) return;

    setUpdatingStatus(true);

    try {
      await api.patch(
        `/accountant/assignments/status?id=${encodeURIComponent(detail.id)}`,
        {
          status: nextStatus,
        },
      );

      setDetail((current) =>
        current
          ? {
              ...current,
              status: nextStatus,
              completed_at:
                nextStatus === "completed"
                  ? new Date().toISOString()
                  : current.completed_at,
            }
          : current,
      );

      toast.success("Assignment status updated.");
    } catch (statusError) {
      toast.error(
        getSafeErrorMessage(statusError, "Failed to update assignment status."),
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          <p className="text-sm text-gray-500">Loading assigned request...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lightgray">
          <Briefcase size={24} className="text-gray-300" />
        </div>

        <h1 className="text-lg font-bold text-navy">
          Assigned request unavailable
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          {error || "This assigned work item could not be found."}
        </p>

        <Link
          href="/accountant/assigned-work"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal"
        >
          <ArrowLeft size={15} />
          Back to assigned work
        </Link>
      </div>
    );
  }

  const title =
    readString(serviceRequest, [
      "title",
      "service_name",
      "service_title",
      "service_type",
      "request_title",
    ]) || "Assigned Request";

  const description = readString(serviceRequest, [
    "description",
    "summary",
    "message",
    "body",
  ]);

  const clientName =
    readString(serviceRequest, [
      "requester_name",
      "client_name",
      "full_name",
      "name",
    ]) || "Client";

  const companyName = readNullableString(serviceRequest, [
    "requester_company",
    "company_name",
    "company",
  ]);

  const email = readNullableString(serviceRequest, [
    "requester_email",
    "email",
    "client_email",
  ]);

  const phone = readNullableString(serviceRequest, [
    "requester_phone",
    "phone",
    "client_phone",
  ]);

  const location = readNullableString(serviceRequest, [
    "location",
    "address",
    "district",
  ]);

  const preferredContactMethod = readNullableString(serviceRequest, [
    "preferred_contact_method",
    "contact_method",
  ]);

  const referenceNumber = resolveReferenceNumber(detail, serviceRequest);

  const clientId = resolveClientIdForCredentials(detail, serviceRequest);

  const requestStatus = readNullableString(serviceRequest, ["status"]);

  const priority =
    detail.priority ||
    readString(serviceRequest, ["priority", "urgency"]) ||
    "normal";

  const createdAt =
    readString(serviceRequest, ["created_at", "submitted_at"]) ||
    detail.created_at;

  const dueDate = detail.due_date;

  const clientUserId = readNullableString(serviceRequest, [
    "client_user_id",
    "requester_user_id",
    "user_id",
  ]);

  const messageParams = new URLSearchParams();

  if (serviceRequestId) {
    messageParams.set("service_request_id", serviceRequestId);
  }

  if (referenceNumber) {
    messageParams.set("reference", referenceNumber);
  }

  const requestChatHref = serviceRequestId
    ? `/accountant/messages?${messageParams.toString()}`
    : "/accountant/messages";

  const clientChatHref = clientUserId
    ? `/accountant/messages?with=${encodeURIComponent(clientUserId)}`
    : requestChatHref;

  const documentParams = new URLSearchParams();

  if (serviceRequestId) {
    documentParams.set("service_request_id", serviceRequestId);
  }

  if (referenceNumber) {
    documentParams.set("reference", referenceNumber);
  }

  const documentsHref = serviceRequestId
    ? `/accountant/documents?${documentParams.toString()}`
    : "/accountant/documents";

  const statusOptions = STATUS_OPTIONS.includes(detail.status as AssignmentStatus)
    ? STATUS_OPTIONS
    : [detail.status as AssignmentStatus, ...STATUS_OPTIONS];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 sm:flex-row sm:items-center">
        <Link
          href="/accountant/assigned-work"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 text-gray-400 transition-colors hover:bg-lightgray hover:text-navy"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                getStatusColor(detail.status),
              )}
            >
              {getStatusLabel(detail.status)}
            </span>

            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                getPriorityColor(priority),
              )}
            >
              {priority}
            </span>

            <span className="rounded-full border border-navy/10 bg-lightgray px-3 py-1 text-xs font-bold text-navy">
              {referenceNumber || serviceRequestId || detail.id}
            </span>
          </div>

          <h1 className="truncate text-xl font-bold text-navy">
            {formatTitle(title)}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Assigned work detail, request communication, documents, and client
            credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
        >
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <InfoCard
          icon={<Briefcase size={18} />}
          label="Assignment"
          value={getStatusLabel(detail.status)}
        />

        <InfoCard
          icon={<ShieldCheck size={18} />}
          label="Priority"
          value={formatTitle(priority)}
        />

        <InfoCard
          icon={<CalendarClock size={18} />}
          label="Due Date"
          value={formatDateShort(dueDate)}
        />

        <InfoCard
          icon={<Clock size={18} />}
          label="Created"
          value={formatDateShort(createdAt)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-gold">
                  Request Details
                </p>

                <h2 className="text-lg font-bold text-navy">
                  {formatTitle(title)}
                </h2>

                {description ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                    {description}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">
                    No request description was provided.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={requestChatHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/10 px-3 py-2 text-xs font-semibold text-teal hover:bg-teal hover:text-white"
                >
                  <MessageSquare size={14} />
                  Messages
                </Link>

                <Link
                  href={documentsHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-navy hover:bg-gold/20"
                >
                  <FileText size={14} />
                  Documents
                </Link>
              </div>
            </div>

            <div className="grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
              <DetailItem label="Request Reference" value={referenceNumber || "Not available"} />
              <DetailItem label="Service Request ID" value={serviceRequestId || "Not available"} />
              <DetailItem label="Request Status" value={getStatusLabel(requestStatus)} />
              <DetailItem label="Preferred Contact" value={formatTitle(preferredContactMethod)} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-navy">Assignment Status</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Update your work progress for this assigned request.
                </p>
              </div>

              <select
                value={detail.status}
                disabled={updatingStatus}
                onChange={(event) =>
                  void handleStatusChange(event.target.value as AssignmentStatus)
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-50"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <DetailItem label="Started" value={formatDateTime(detail.started_at)} />
              <DetailItem label="Completed" value={formatDateTime(detail.completed_at)} />
              <DetailItem label="Updated" value={formatDateTime(detail.updated_at)} />
            </div>

            {detail.notes ? (
              <div className="mt-5 rounded-xl border border-gray-100 bg-lightgray p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Assignment Notes
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-navy">
                  {detail.notes}
                </p>
              </div>
            ) : null}

            {detail.internal_notes ? (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Internal Notes
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-amber-800">
                  {detail.internal_notes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-gray-100 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-navy">Documents</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Files attached to this request reference.
                </p>
              </div>

              <Link
                href={documentsHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
              >
                Open documents folder
              </Link>
            </div>

            {loadingDocuments ? (
              <div className="p-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lightgray">
                  <FileText size={24} className="text-gray-300" />
                </div>

                <h3 className="font-semibold text-navy">No documents yet</h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                  Documents uploaded by the client, admin, or accountant for this
                  request will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {documents.map((document) => {
                  const size = formatFileSize(document.file_size_bytes);

                  return (
                    <article
                      key={document.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-lightgray px-2.5 py-1 text-xs font-semibold text-navy">
                            {getDocumentTypeLabel(document.document_type)}
                          </span>

                          <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
                            {getDocumentVisibilityLabel(document.visibility)}
                          </span>
                        </div>

                        <h3 className="truncate text-sm font-bold text-navy">
                          {getDocumentFileName(document)}
                        </h3>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDateShort(document.created_at)}
                          {size ? ` · ${size}` : ""}
                          {document.uploader_name
                            ? ` · Uploaded by ${document.uploader_name}`
                            : ""}
                        </p>

                        {document.description ? (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                            {document.description}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => void downloadDocument(document)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-teal"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <AccountantClientCredentialsCard
            clientId={clientId}
            serviceRequestId={serviceRequestId}
            referenceNumber={referenceNumber}
          />
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                <UserRound size={18} />
              </div>

              <div>
                <h2 className="font-bold text-navy">Client Information</h2>
                <p className="text-xs text-gray-400">Assigned request client</p>
              </div>
            </div>

            <div className="space-y-4">
              <DetailItem label="Client" value={clientName} />

              {companyName ? (
                <DetailItem label="Company" value={companyName} />
              ) : null}

              <DetailItem
                label="Client ID for credentials"
                value={clientId || "Not provided by assignment response"}
              />

              {email ? (
                <ContactItem icon={<Mail size={15} />} value={email} />
              ) : null}

              {phone ? (
                <ContactItem icon={<Phone size={15} />} value={phone} />
              ) : null}

              {location ? (
                <ContactItem icon={<MapPin size={15} />} value={location} />
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={requestChatHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-teal"
              >
                <MessageSquare size={15} />
                Request messages
              </Link>

              <Link
                href={clientChatHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
              >
                <Mail size={15} />
                Client conversation
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 font-bold text-navy">Timeline</h2>

            <div className="space-y-4">
              <TimelineItem
                icon={<CalendarClock size={14} />}
                label="Request Created"
                value={formatDateTime(createdAt)}
              />

              <TimelineItem
                icon={<Briefcase size={14} />}
                label="Assigned"
                value={formatDateTime(detail.created_at)}
              />

              <TimelineItem
                icon={<Clock size={14} />}
                label="Due Date"
                value={formatDateTime(dueDate)}
              />

              <TimelineItem
                icon={<CheckCircle2 size={14} />}
                label="Completed"
                value={formatDateTime(detail.completed_at)}
              />
            </div>
          </section>

          {!clientId ? (
            <section className="rounded-xl border border-amber-100 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-800">
                Client credentials cannot load
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-amber-700">
                The accountant credential endpoint requires the real client_id,
                but this assignment response does not expose it. Backend should
                include client_id and reference_number in the accountant
                assignment/detail response.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lightgray text-navy">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-navy">
        {value || "—"}
      </p>
    </div>
  );
}

function ContactItem({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-600">
      <span className="text-teal">{icon}</span>
      <span className="min-w-0 break-all">{value}</span>
    </div>
  );
}

function TimelineItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lightgray text-teal">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-navy">{label}</p>
        <p className="mt-0.5 text-xs text-gray-400">{value}</p>
      </div>
    </div>
  );
}