"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  FolderOpen,
  RefreshCcw,
  Search,
  Shield,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ClientDocument = {
  id: string;
  service_request_id?: string;
  request_id?: string;
  service_type?: string;
  service_title?: string;
  file_name?: string;
  original_file_name?: string;
  original_name?: string;
  file_type?: string;
  mime_type?: string;
  document_type?: string;
  visibility?: string;
  uploaded_by?: string;
  uploaded_by_user_id?: string;
  uploader_user_id?: string;
  uploader_name?: string;
  uploader_role?: string;
  recipient_user_id?: string;
  recipient_name?: string;
  recipient_role?: string;
  created_at?: string;
};

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

function getDocumentItems(response: unknown): ClientDocument[] {
  if (Array.isArray(response)) return response as ClientDocument[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: ClientDocument[];
    data?: ClientDocument[] | { items?: ClientDocument[] };
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

function formatDateShort(value?: string) {
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

function getCreatedTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getDocumentName(document: ClientDocument) {
  return (
    document.original_file_name ||
    document.original_name ||
    document.file_name ||
    "Document"
  );
}

function getRequestId(document: ClientDocument) {
  return document.service_request_id || document.request_id || "";
}

function getServiceTitle(document: ClientDocument) {
  return (
    document.service_title ||
    document.service_type ||
    document.service_request_id ||
    document.request_id ||
    "Service Request"
  );
}

function getUploaderName(document: ClientDocument) {
  if (document.uploader_name) return document.uploader_name;

  if (document.uploader_role === "admin") return "Admin Team";
  if (document.uploader_role === "accountant") return "Accountant";
  if (document.uploader_role === "client") return "You";

  return "Kivu Advisory Team";
}

function fileIcon(mime?: string, name?: string) {
  const value = `${mime || ""} ${name || ""}`.toLowerCase();

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

    if (value) {
      return value;
    }
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

    if (!value) {
      continue;
    }

    try {
      const parsed = JSON.parse(value) as {
        access_token?: string;
        token?: string;
        data?: {
          access_token?: string;
          token?: string;
        };
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

async function downloadDocument(document: ClientDocument) {
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
    link.download = getDocumentName(document);
    window.document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to download document."));
  }
}

function matchesSearch(document: ClientDocument, search: string) {
  const value = search.trim().toLowerCase();

  if (!value) return true;

  const haystack = [
    getDocumentName(document),
    getServiceTitle(document),
    getUploaderName(document),
    document.document_type,
    document.visibility,
    getRequestId(document),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(value);
}

function groupByRequest(documents: ClientDocument[]) {
  const grouped = new Map<
    string,
    {
      label: string;
      documents: ClientDocument[];
    }
  >();

  for (const document of documents) {
    const requestId = getRequestId(document) || "unknown-request";
    const label = formatTitle(getServiceTitle(document));

    if (!grouped.has(requestId)) {
      grouped.set(requestId, {
        label,
        documents: [],
      });
    }

    grouped.get(requestId)?.documents.push(document);
  }

  return grouped;
}

function groupBySender(documents: ClientDocument[]) {
  const grouped = new Map<string, ClientDocument[]>();

  for (const document of documents) {
    const sender = getUploaderName(document);

    if (!grouped.has(sender)) {
      grouped.set(sender, []);
    }

    grouped.get(sender)?.push(document);
  }

  return grouped;
}

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api.get<unknown>("/documents?page_size=100");

      const items = getDocumentItems(result.data).sort(
        (a, b) => getCreatedTime(b.created_at) - getCreatedTime(a.created_at),
      );

      setDocuments(items);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load documents."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => matchesSearch(document, search));
  }, [documents, search]);

  const myUploads = useMemo(() => {
    return filteredDocuments.filter(
      (document) => document.uploader_role === "client",
    );
  }, [filteredDocuments]);

  const receivedDocuments = useMemo(() => {
    return filteredDocuments.filter(
      (document) => document.uploader_role !== "client",
    );
  }, [filteredDocuments]);

  const uploadsByRequest = useMemo(
    () => groupByRequest(myUploads),
    [myUploads],
  );

  const receivedBySender = useMemo(
    () => groupBySender(receivedDocuments),
    [receivedDocuments],
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Documents</h1>
          <p className="mt-1 text-sm text-gray-400">
            All documents across your service requests, organized by folder.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-lightgray hover:text-navy disabled:opacity-50"
        >
          <RefreshCcw
            size={15}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="All Documents"
          value={documents.length}
          icon={<FileText size={18} />}
          className="text-navy"
        />

        <StatCard
          label="My Uploads"
          value={myUploads.length}
          icon={<User2 size={18} />}
          className="text-indigo-600"
        />

        <StatCard
          label="Received"
          value={receivedDocuments.length}
          icon={<Shield size={18} />}
          className="text-teal"
        />
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
        <div className="relative">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search document, request, sender..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
            <FileText size={28} className="text-gray-300" />
          </div>

          <h3 className="mb-2 font-semibold text-navy">
            No documents found
          </h3>

          <p className="mb-5 text-sm text-gray-400">
            Documents you upload or receive from Kivu Advisory will appear here.
          </p>

          <Link
            href="/client/requests"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal"
          >
            Go to My Requests
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {uploadsByRequest.size > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <User2 size={16} className="text-indigo-500" />
                <h2 className="font-bold text-navy">
                  My Uploads ({myUploads.length})
                </h2>
              </div>

              <div className="space-y-3">
                {Array.from(uploadsByRequest.entries()).map(
                  ([requestId, group]) => (
                    <FolderSection
                      key={requestId}
                      label={group.label}
                      icon={<FolderOpen size={13} />}
                      iconColor="text-indigo-500"
                      documents={group.documents}
                      requestId={
                        requestId !== "unknown-request" ? requestId : undefined
                      }
                    />
                  ),
                )}
              </div>
            </div>
          ) : null}

          {receivedBySender.size > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Shield size={16} className="text-teal" />
                <h2 className="font-bold text-navy">
                  Received from Kivu Advisory ({receivedDocuments.length})
                </h2>
              </div>

              <div className="space-y-3">
                {Array.from(receivedBySender.entries()).map(
                  ([senderName, items]) => (
                    <FolderSection
                      key={senderName}
                      label={senderName}
                      icon={<FolderOpen size={13} />}
                      iconColor="text-teal"
                      documents={items}
                    />
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-gray-400"
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 3.46 9.78l2.63 2.63a.75.75 0 1 0 1.06-1.06l-2.63-2.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  className: string;
};

function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lightgray",
          className,
        )}
      >
        {icon}
      </div>

      <div>
        <p className={cn("text-2xl font-bold", className)}>{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

type FolderSectionProps = {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  documents: ClientDocument[];
  requestId?: string;
};

function FolderSection({
  label,
  icon,
  iconColor,
  documents,
  requestId,
}: FolderSectionProps) {
  const [open, setOpen] = useState(true);

  if (documents.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 border-b border-gray-50 bg-lightgray/50 px-5 py-3 transition-colors hover:bg-lightgray"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={iconColor}>{icon}</span>
          <span className="truncate text-sm font-semibold text-navy">
            {label}
          </span>
          <span className="shrink-0 text-xs text-gray-400">
            ({documents.length} file{documents.length !== 1 ? "s" : ""})
          </span>
        </div>

        {requestId ? (
          <Link
            href={`/client/requests/${requestId}`}
            onClick={(event) => event.stopPropagation()}
            className="shrink-0 text-xs font-semibold text-teal hover:underline"
          >
            Open request →
          </Link>
        ) : null}
      </button>

      {open ? (
        <div className="divide-y divide-gray-50">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({ document }: { document: ClientDocument }) {
  const name = getDocumentName(document);
  const mime = document.mime_type || document.file_type;

  return (
    <button
      type="button"
      onClick={() => void downloadDocument(document)}
      className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-lightgray/50"
    >
      <span className="text-xl">{fileIcon(mime, name)}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{name}</p>

        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p className="text-xs text-gray-400">
            {formatDateShort(document.created_at)}
          </p>

          {document.document_type ? (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">
                {formatTitle(document.document_type)}
              </span>
            </>
          ) : null}

          {document.uploader_role && document.uploader_role !== "client" ? (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-teal">
                from {getUploaderName(document)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <Download
        size={14}
        className="shrink-0 text-gray-300 transition-colors group-hover:text-teal"
      />
    </button>
  );
}