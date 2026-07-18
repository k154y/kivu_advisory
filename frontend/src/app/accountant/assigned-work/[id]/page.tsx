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
  MessagesSquare,
  Phone,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AssignmentStatus, DocumentItem, Priority } from "@/types/api";

type UnknownRecord = Record<string, unknown>;

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
  };

  if (objectResponse.assignment) return objectResponse.assignment;
  if (objectResponse.item) return objectResponse.item;

  if (objectResponse.data) {
    const nested = objectResponse.data;

    if (nested && typeof nested === "object") {
      const nestedObject = nested as {
        data?: unknown;
        item?: unknown;
        assignment?: unknown;
      };

      if (nestedObject.assignment) return nestedObject.assignment;
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
    link.download = document.original_file_name || document.file_name || "document";
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

  const serviceRequest = useMemo(() => {
    if (!detail) return {};
    return getRequestObject(detail);
  }, [detail]);

  const serviceRequestId = useMemo(() => {
    if (!detail) return "";

    return (
      detail.service_request_id ||
      readString(serviceRequest, ["id", "service_request_id"]) ||
      ""
    );
  }, [detail, serviceRequest]);

  const loadDocuments = useCallback(async (requestId: string) => {
    if (!requestId) return;

    setLoadingDocuments(true);

    try {
      const result = await api.get<unknown>(
        `/documents?service_request_id=${encodeURIComponent(requestId)}&page_size=100`,
      );

      setDocuments(getListItems<DocumentItem>(result.data));
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      let loaded: AssignmentDetail | null = null;

      try {
        const result = await api.get<unknown>(
          `/accountant/assignments/detail?id=${encodeURIComponent(assignmentId)}`,
        );

        loaded = getAssignmentDetail(result.data);
      } catch {
        const listResult = await api.get<unknown>(
          "/accountant/assignments?page_size=100",
        );

        const items = getListItems<AssignmentDetail>(listResult.data);
        loaded = items.find((item) => item.id === assignmentId) || null;
      }

      setDetail(loaded);

      const requestObject = loaded ? getRequestObject(loaded) : {};
      const requestId =
        loaded?.service_request_id ||
        readString(requestObject, ["id", "service_request_id"]);

      if (requestId) {
        await loadDocuments(requestId);
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load assigned request."));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, loadDocuments]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (status: AssignmentStatus) => {
    if (!detail) return;

    setUpdatingStatus(true);

    try {
      await api.patch(
        `/accountant/assignments/status?id=${encodeURIComponent(detail.id)}`,
        {
          status,
        },
      );

      setDetail((current) =>
        current
          ? {
              ...current,
              status,
            }
          : current,
      );

      toast.success("Assignment status updated.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update status."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lightgray">
          <Briefcase size={24} className="text-gray-300" />
        </div>

        <h1 className="text-lg font-bold text-navy">
          Assigned request not found
        </h1>

        <p className="mt-2 text-sm text-gray-400">
          This request may not be assigned to you, or it may have been removed.
        </p>

        <Link
          href="/accountant/assigned-work"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
        >
          <ArrowLeft size={15} />
          Back to assigned work
        </Link>
      </div>
    );
  }

  const title =
    readString(serviceRequest, ["title", "service_type", "service_title"]) ||
    "Assigned Request";

  const description =
    readString(serviceRequest, ["description", "message", "body"]) ||
    detail.notes ||
    "No request description provided.";

  const clientName =
    readString(serviceRequest, [
      "requester_name",
      "full_name",
      "client_name",
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

  const referenceNumber = readNullableString(serviceRequest, [
    "reference_number",
    "reference",
  ]);

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
    "client_id",
    "user_id",
  ]);

  const clientChatHref = clientUserId
    ? `/accountant/messages?with=${encodeURIComponent(clientUserId)}`
    : serviceRequestId
      ? `/accountant/messages?service_request_id=${encodeURIComponent(serviceRequestId)}`
      : "/accountant/messages";

  const requestChatHref = serviceRequestId
    ? `/accountant/messages?service_request_id=${encodeURIComponent(serviceRequestId)}`
    : "/accountant/messages";

  const statusOptions = STATUS_OPTIONS.includes(
    detail.status as AssignmentStatus,
  )
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

            {referenceNumber ? (
              <span className="rounded-full bg-lightgray px-3 py-1 text-xs font-semibold text-gray-500">
                Ref: {referenceNumber}
              </span>
            ) : null}
          </div>

          <h1 className="truncate text-xl font-bold text-navy">
            {formatTitle(title)}
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            {clientName} · {formatDateShort(createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={clientChatHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 px-3 py-2 text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
          >
            <MessagesSquare size={14} />
            Client
          </Link>

          <Link
            href={requestChatHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-navy/20 px-3 py-2 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            <MessageSquare size={14} />
            Request Thread
          </Link>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-lightgray hover:text-navy"
          >
            <RefreshCcw size={13} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
              <UserRound size={16} className="text-teal" />
              Client Information
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {clientName}
                </p>

                {companyName ? (
                  <p className="mt-0.5 text-xs text-gray-400">{companyName}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {phone ? (
                  <div className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-xs text-gray-600">
                    <Phone size={13} className="text-teal" />
                    {phone}
                  </div>
                ) : null}

                {email ? (
                  <div className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-xs text-gray-600">
                    <Mail size={13} className="text-teal" />
                    {email}
                  </div>
                ) : null}

                {location ? (
                  <div className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-xs text-gray-600">
                    <MapPin size={13} className="text-teal" />
                    {location}
                  </div>
                ) : null}

                {preferredContactMethod ? (
                  <div className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-xs text-gray-600">
                    <Phone size={13} className="text-teal" />
                    Preferred: {formatTitle(preferredContactMethod)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
              <Briefcase size={16} className="text-teal" />
              Request Details
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoBox
                icon={<CalendarClock size={15} />}
                label="Submitted"
                value={formatDateShort(createdAt)}
              />

              <InfoBox
                icon={<Clock size={15} />}
                label="Due Date"
                value={formatDateShort(dueDate)}
              />

              <InfoBox
                icon={<CheckCircle2 size={15} />}
                label="Request Status"
                value={requestStatus ? getStatusLabel(requestStatus) : "Not set"}
              />
            </div>

            <div className="mt-4 rounded-xl bg-lightgray p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Description
              </p>

              <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">
                {description}
              </p>
            </div>

            {detail.notes || detail.internal_notes ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {detail.notes ? (
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="mb-1 text-xs font-semibold text-gray-400">
                      Assignment Notes
                    </p>
                    <p className="text-sm leading-relaxed text-charcoal">
                      {detail.notes}
                    </p>
                  </div>
                ) : null}

                {detail.internal_notes ? (
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="mb-1 text-xs font-semibold text-gray-400">
                      Internal Notes
                    </p>
                    <p className="text-sm leading-relaxed text-charcoal">
                      {detail.internal_notes}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
              <MessagesSquare size={16} className="text-teal" />
              Quick Messages
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={clientChatHref}
                className="flex items-center gap-3 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-sm font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
              >
                <MessagesSquare size={17} />
                Chat with {clientName}
              </Link>

              <Link
                href={requestChatHref}
                className="flex items-center gap-3 rounded-xl border border-navy/10 bg-navy/5 px-4 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                <MessageSquare size={17} />
                Open Request Thread
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy">
              <ShieldCheck size={16} className="text-teal" />
              Update Progress
            </h2>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Assignment Status
            </label>

            <select
              value={detail.status}
              disabled={updatingStatus}
              onChange={(event) =>
                void handleStatusChange(event.target.value as AssignmentStatus)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-50"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>

            <p className="mt-3 text-xs leading-relaxed text-gray-400">
              Update only the progress of work assigned to you. Final closure
              and client-wide changes remain controlled by admin permissions.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
                <FileText size={16} className="text-teal" />
                Documents
              </h2>

              <span className="rounded-full bg-lightgray px-2 py-1 text-xs text-gray-500">
                {documents.length}
              </span>
            </div>

            {loadingDocuments ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-xl bg-lightgray p-5 text-center">
                <FileText size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  No documents yet
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Documents linked to this request will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => void downloadDocument(document)}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-3 py-3 text-left transition-colors hover:bg-lightgray"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lightgray text-navy">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-charcoal">
                        {document.original_file_name || document.file_name}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatTitle(document.document_type)} ·{" "}
                        {formatDateShort(document.created_at)}
                      </p>
                    </div>

                    <Download size={15} className="shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-gray-400">
              Uploading accountant deliverables can be added here after we
              confirm your current document upload helper or API wrapper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type InfoBoxProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function InfoBox({ icon, label, value }: InfoBoxProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-teal">{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-charcoal">{value}</p>
    </div>
  );
}