"use client";
import { resolveAccountantRequestMap } from "@/lib/accountant-request-resolver";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  FolderOpen,
  MessageSquare,
  RefreshCcw,
  Search,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { api, tokenStorage } from "@/lib/api";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type PortalRole = "client" | "accountant";

type DocumentItem = {
  id: string;
  service_request_id?: string;
  request_id?: string;
  service_request_reference_number?: string;
  reference_number?: string;
  service_request_title?: string;
  request_title?: string;
  service_type?: string;
  service_title?: string;
  file_name?: string;
  original_file_name?: string;
  original_name?: string;
  mime_type?: string;
  document_type?: string;
  visibility?: string;
  description?: string;
  uploaded_by?: string;
  uploaded_by_user_id?: string;
  uploader_user_id?: string;
  uploader_name?: string;
  uploader_role?: string;
  created_at?: string;
  updated_at?: string;
};

type RequestSummary = {
  id: string;
  referenceNumber: string;
  title: string;
  clientName?: string;
};

type AssignmentItem = {
  id: string;
  service_request_id?: string;
  service_request?: Record<string, unknown>;
  request?: Record<string, unknown>;
};

type PortalDocumentsPageProps = {
  role: PortalRole;
};

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8080/api/v1"
).replace(/\/$/, "");

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

function readString(source: Record<string, unknown> | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeRequest(item: unknown): RequestSummary | null {
  if (!item || typeof item !== "object") return null;

  const objectItem = item as Record<string, unknown>;

  const nested =
    typeof objectItem.service_request === "object" &&
    objectItem.service_request !== null
      ? (objectItem.service_request as Record<string, unknown>)
      : typeof objectItem.request === "object" && objectItem.request !== null
        ? (objectItem.request as Record<string, unknown>)
        : undefined;

const id =
  readString(objectItem, ["service_request_id", "request_id"]) ||
  readString(nested, ["id", "service_request_id", "request_id"]) ||
  readString(objectItem, ["id"]);

  if (!id) return null;

  const referenceNumber =
  readString(objectItem, [
    "reference_number",
    "service_request_reference_number",
    "request_reference_number",
  ]) ||
  readString(nested, [
    "reference_number",
    "service_request_reference_number",
    "request_reference_number",
  ]) ||
  id;

  const title =
    readString(objectItem, [
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
    readString(objectItem, [
      "requester_name",
      "client_name",
      "full_name",
      "name",
    ]) ||
    readString(nested, ["requester_name", "client_name", "full_name", "name"]);

  return {
    id,
    referenceNumber,
    title,
    clientName,
  };
}

function getDocumentName(document: DocumentItem) {
  return (
    document.original_file_name ||
    document.original_name ||
    document.file_name ||
    "Document"
  );
}

function getDocumentRequestId(document: DocumentItem) {
  return document.service_request_id || document.request_id || "";
}

function getCreatedTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value?: string) {
  if (!value) return "Unknown date";

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
  if (!value) return "Document";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileIcon(document: DocumentItem) {
  const value = `${document.mime_type || ""} ${getDocumentName(document)}`.toLowerCase();

  if (value.includes("pdf")) return "📕";
  if (value.includes("word") || value.includes(".doc")) return "📝";
  if (
    value.includes("sheet") ||
    value.includes("excel") ||
    value.includes("csv") ||
    value.includes(".xls")
  ) {
    return "📊";
  }
  if (
    value.includes("image") ||
    value.includes(".jpg") ||
    value.includes(".jpeg") ||
    value.includes(".png") ||
    value.includes(".webp")
  ) {
    return "🖼️";
  }

  return "📄";
}

function getUploaderName(document: DocumentItem, role: PortalRole) {
  if (document.uploader_name) return document.uploader_name;

  if (document.uploader_role === "client") {
    return role === "client" ? "You" : "Client";
  }

  if (document.uploader_role === "accountant") {
    return role === "accountant" ? "You" : "Accountant";
  }

  if (document.uploader_role === "admin") return "Admin Team";

  return "Kivu Advisory Team";
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getRequestLabel(
  document: DocumentItem,
  requestMap: Map<string, RequestSummary>,
) {
  const requestId = getDocumentRequestId(document);
  const request = requestId ? requestMap.get(requestId) : undefined;

  return (
    document.service_request_reference_number ||
    document.reference_number ||
    request?.referenceNumber ||
    requestId ||
    "No linked request"
  );
}

function getRequestTitle(
  document: DocumentItem,
  requestMap: Map<string, RequestSummary>,
) {
  const requestId = getDocumentRequestId(document);
  const request = requestId ? requestMap.get(requestId) : undefined;

  return (
    document.service_request_title ||
    document.request_title ||
    document.service_title ||
    document.service_type ||
    request?.title ||
    "Service request"
  );
}

function matchesSearch(
  document: DocumentItem,
  search: string,
  requestMap: Map<string, RequestSummary>,
  role: PortalRole,
) {
  const term = search.trim().toLowerCase();

  if (!term) return true;

  const haystack = [
    getDocumentName(document),
    getRequestLabel(document, requestMap),
    getRequestTitle(document, requestMap),
    getUploaderName(document, role),
    document.document_type,
    document.visibility,
    document.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function groupByRequest(
  documents: DocumentItem[],
  requestMap: Map<string, RequestSummary>,
) {
  const grouped = new Map<
    string,
    {
      referenceNumber: string;
      title: string;
      requestId?: string;
      documents: DocumentItem[];
    }
  >();

  for (const document of documents) {
    const requestId = getDocumentRequestId(document);
    const referenceNumber = getRequestLabel(document, requestMap);
    const title = getRequestTitle(document, requestMap);
    const key = requestId || referenceNumber;

    if (!grouped.has(key)) {
      grouped.set(key, {
        referenceNumber,
        title,
        requestId,
        documents: [],
      });
    }

    grouped.get(key)?.documents.push(document);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.referenceNumber.localeCompare(b.referenceNumber),
  );
}

async function loadRequests(role: PortalRole) {
  if (role === "accountant") {
    const accountantMap = await resolveAccountantRequestMap();

    return new Map(
      Array.from(accountantMap.entries()).map(([id, request]) => [
        id,
        {
          id: request.id,
          referenceNumber: request.referenceNumber,
          title: request.title,
          clientName: request.clientName,
        },
      ]),
    );
  }

  const paths = [
    "/client/service-requests?page_size=500",
    "/client/requests?page_size=500",
  ];

  const map = new Map<string, RequestSummary>();

  for (const path of paths) {
    try {
      const result = await api.get<unknown>(path);
      const items = getItems<unknown>(result.data);

      for (const item of items) {
        const request = normalizeRequest(item);

        if (request) {
          map.set(request.id, request);
        }
      }
    } catch {
      continue;
    }
  }

  return map;
}

async function downloadDocument(document: DocumentItem) {
  const token = tokenStorage.getAccessToken();

  if (!token) {
    toast.error("Authentication token not found. Please log in again.");
    return;
  }

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
  link.download = getDocumentName(document);
  window.document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

function getUploadSettings(role: PortalRole) {
  if (role === "client") {
    return {
      visibility: "client",
      document_type: "client_upload",
      is_final: false,
    };
  }

  return {
    visibility: "staff",
    document_type: "accountant_upload",
    is_final: false,
  };
}

function buildMessageHref(role: PortalRole, request?: RequestSummary) {
  const params = new URLSearchParams();

  if (request?.id) {
    params.set("service_request_id", request.id);
  }

  if (request?.referenceNumber) {
    params.set("reference", request.referenceNumber);
  }

  const base =
    role === "client" ? routes.client.messages : routes.accountant.messages;

  return `${base}?${params.toString()}`;
}

export function PortalDocumentsPage({ role }: PortalDocumentsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [requestMap, setRequestMap] = useState<Map<string, RequestSummary>>(
    () => new Map(),
  );
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const requests = useMemo(() => Array.from(requestMap.values()), [requestMap]);

  const load = useCallback(async () => {
  setLoading(true);

  try {
    const loadedRequestMap = await loadRequests(role);
    const allDocuments: DocumentItem[] = [];

    for (const requestId of loadedRequestMap.keys()) {
    try {
        const documentResult = await api.get<unknown>(
        `/documents?service_request_id=${encodeURIComponent(
            requestId,
        )}&page_size=200`,
        );

        allDocuments.push(...getItems<DocumentItem>(documentResult.data));
    } catch {
        continue;
    }
    }

    const items = allDocuments.sort(
      (a, b) => getCreatedTime(b.created_at) - getCreatedTime(a.created_at),
    );

    setDocuments(items);
    setRequestMap(loadedRequestMap);

    if (!selectedRequestId && loadedRequestMap.size > 0) {
      setSelectedRequestId(Array.from(loadedRequestMap.keys())[0]);
    }
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to load documents."));
  } finally {
    setLoading(false);
  }
}, [role, selectedRequestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) =>
      matchesSearch(document, search, requestMap, role),
    );
  }, [documents, requestMap, role, search]);

  const groupedDocuments = useMemo(() => {
    return groupByRequest(filteredDocuments, requestMap);
  }, [filteredDocuments, requestMap]);

  const myUploads = useMemo(() => {
    return documents.filter((document) => {
      if (role === "client") return document.uploader_role === "client";
      if (role === "accountant") return document.uploader_role === "accountant";
      return false;
    });
  }, [documents, role]);

  const handleUploadClick = () => {
    if (!selectedRequestId) {
      toast.error("Select a request before uploading.");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;

    if (!selectedRequestId) {
      toast.error("Select a request before uploading.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 20 MB.");
      return;
    }

    const settings = getUploadSettings(role);
    const selectedRequest = requestMap.get(selectedRequestId);

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("service_request_id", selectedRequestId);
      formData.append("visibility", settings.visibility);
      formData.append("document_type", settings.document_type);
      formData.append("is_final", String(settings.is_final));
      formData.append(
        "description",
        description.trim() ||
          `Uploaded from ${role} portal for ${
            selectedRequest?.referenceNumber || selectedRequestId
          }`,
      );

      await api.uploadFile("/documents", formData);

      toast.success("Document uploaded successfully.");
      setDescription("");
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to upload document."));
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
         

          <h1 className="text-2xl font-bold text-navy">Documents</h1>

          <p className="mt-1 text-sm text-gray-500">
            Documents are grouped by service request reference number.
          </p>
        </div>

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
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="All Documents" value={documents.length} />
        <StatCard label="My Uploads" value={myUploads.length} />
        <StatCard label="Request Folders" value={groupedDocuments.length} />
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference number, file, request, sender..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>

          <select
            value={selectedRequestId}
            onChange={(event) => setSelectedRequestId(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            <option value="">Select request</option>
            {requests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.referenceNumber} — {request.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading || !selectedRequestId}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal disabled:opacity-50"
          >
            {uploading ? (
              <RefreshCcw size={15} className="animate-spin" />
            ) : (
              <UploadCloud size={15} />
            )}
            Upload
          </button>
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional upload description..."
          rows={2}
          className="mt-3 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => void handleUpload(event.target.files?.[0])}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : groupedDocuments.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
            <FileText size={28} className="text-gray-300" />
          </div>

          <h3 className="font-semibold text-navy">No documents found</h3>

          <p className="mt-2 text-sm text-gray-400">
            Uploads and received documents will appear here by request folder.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedDocuments.map((group) => {
            const request = group.requestId
              ? requestMap.get(group.requestId)
              : undefined;

            return (
              <section
                key={group.referenceNumber}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-lightgray/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                      <FolderOpen size={18} />
                    </div>

                    <div>
                      <h2 className="font-bold text-navy">
                        {group.referenceNumber}
                      </h2>

                      <p className="text-sm text-gray-500">{group.title}</p>

                      {request?.clientName ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Client: {request.clientName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {request ? (
                    <Link
                      href={buildMessageHref(role, request)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal/20 bg-teal/10 px-3 py-2 text-xs font-semibold text-teal hover:bg-teal hover:text-white"
                    >
                      <MessageSquare size={14} />
                      Message
                    </Link>
                  ) : null}
                </div>

                <div className="divide-y divide-gray-50">
                  {group.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="text-2xl">{fileIcon(document)}</div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy">
                            {getDocumentName(document)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {formatTitle(document.document_type)} ·{" "}
                            {formatTitle(document.visibility)} ·{" "}
                            {getUploaderName(document, role)} ·{" "}
                            {formatDate(document.created_at)}
                          </p>

                          {document.description ? (
                            <p className="mt-1 text-xs text-gray-500">
                              {document.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void downloadDocument(document).catch((error) =>
                            toast.error(
                              getSafeErrorMessage(
                                error,
                                "Failed to download document.",
                              ),
                            ),
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}