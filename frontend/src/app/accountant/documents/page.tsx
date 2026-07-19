"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  FolderOpen,
  RefreshCcw,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  uploaded_by?: string;
  uploaded_by_user_id?: string;
  uploader_user_id?: string;
  uploader_name?: string;
  uploader_role?: string;
  recipient_user_id?: string;
  recipient_name?: string;
  recipient_role?: string;
  created_at?: string;
  updated_at?: string;
};

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

function getDocumentItems(response: unknown): DocumentItem[] {
  if (Array.isArray(response)) {
    return response as DocumentItem[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: DocumentItem[];
    data?: DocumentItem[] | { items?: DocumentItem[] };
  };

  if (Array.isArray(objectResponse.items)) {
    return objectResponse.items;
  }

  if (Array.isArray(objectResponse.data)) {
    return objectResponse.data;
  }

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function getCreatedTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
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

function getDocumentName(document: DocumentItem) {
  return (
    document.original_file_name ||
    document.original_name ||
    document.file_name ||
    "Document"
  );
}

function getUploaderId(document: DocumentItem) {
  return (
    document.uploaded_by_user_id ||
    document.uploader_user_id ||
    document.uploaded_by ||
    ""
  );
}

function getUploaderName(document: DocumentItem) {
  return (
    document.uploader_name ||
    document.uploader_role ||
    "Unknown sender"
  );
}

function getRecipientName(document: DocumentItem) {
  return (
    document.recipient_name ||
    document.recipient_role ||
    "Unknown recipient"
  );
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

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
    link.download = getDocumentName(document);
    window.document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to download document."));
  }
}

function groupDocuments(documents: DocumentItem[], mode: "sent" | "received") {
  const grouped = new Map<string, DocumentItem[]>();

  for (const document of documents) {
    const key =
      mode === "sent" ? getRecipientName(document) : getUploaderName(document);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)?.push(document);
  }

  return grouped;
}

function matchesSearch(document: DocumentItem, search: string) {
  const value = search.trim().toLowerCase();

  if (!value) return true;

  const haystack = [
    getDocumentName(document),
    document.document_type,
    document.visibility,
    document.service_request_id,
    getUploaderName(document),
    getRecipientName(document),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(value);
}

export default function AccountantDocumentsPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
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

  const sentDocuments = useMemo(() => {
    return filteredDocuments.filter(
      (document) => getUploaderId(document) === user?.id,
    );
  }, [filteredDocuments, user?.id]);

  const receivedDocuments = useMemo(() => {
    return filteredDocuments.filter(
      (document) => getUploaderId(document) !== user?.id,
    );
  }, [filteredDocuments, user?.id]);

  const sentByRecipient = useMemo(
    () => groupDocuments(sentDocuments, "sent"),
    [sentDocuments],
  );

  const receivedBySender = useMemo(
    () => groupDocuments(receivedDocuments, "received"),
    [receivedDocuments],
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Documents</h1>
          <p className="mt-1 text-sm text-gray-400">
            Documents you sent and received, organized by person.
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
          label="Documents I Sent"
          value={sentDocuments.length}
          icon={<Shield size={18} />}
          className="text-teal"
        />

        <StatCard
          label="Documents I Received"
          value={receivedDocuments.length}
          icon={<Users size={18} />}
          className="text-indigo-600"
        />
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents, sender, recipient, request..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
            <FileText size={28} className="text-gray-300" />
          </div>

          <h3 className="mb-2 font-semibold text-navy">
            No documents found
          </h3>

          <p className="text-sm text-gray-400">
            Documents you send or receive will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sentByRecipient.size > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Shield size={16} className="text-teal" />
                <h2 className="font-bold text-navy">
                  Documents I Sent ({sentDocuments.length})
                </h2>
              </div>

              <div className="space-y-3">
                {Array.from(sentByRecipient.entries()).map(([name, items]) => (
                  <DocumentFolder
                    key={name}
                    label={name}
                    icon={<FolderOpen size={14} />}
                    color="text-teal"
                    documents={items}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {receivedBySender.size > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <h2 className="font-bold text-navy">
                  Documents I Received ({receivedDocuments.length})
                </h2>
              </div>

              <div className="space-y-3">
                {Array.from(receivedBySender.entries()).map(([name, items]) => (
                  <DocumentFolder
                    key={name}
                    label={name}
                    icon={<FolderOpen size={14} />}
                    color="text-indigo-500"
                    documents={items}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
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

type DocumentFolderProps = {
  label: string;
  color: string;
  icon: React.ReactNode;
  documents: DocumentItem[];
};

function DocumentFolder({
  label,
  color,
  icon,
  documents,
}: DocumentFolderProps) {
  const [open, setOpen] = useState(true);

  if (documents.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 border-b border-gray-50 bg-lightgray/50 px-5 py-3 transition-colors hover:bg-lightgray"
      >
        <span className={color}>{icon}</span>

        <span className="flex-1 text-left text-sm font-semibold text-navy">
          {label}
        </span>

        <span className="text-xs text-gray-400">
          {documents.length} file{documents.length !== 1 ? "s" : ""}
        </span>
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

function DocumentRow({ document }: { document: DocumentItem }) {
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

          <span className="text-xs text-gray-300">·</span>

          <span className="text-xs text-gray-400">
            {formatTitle(document.document_type)}
          </span>

          {getUploaderName(document) ? (
            <span className="text-xs text-gray-400">
              · from {getUploaderName(document)}
            </span>
          ) : null}

          {getRecipientName(document) ? (
            <span className="text-xs text-teal">
              → {getRecipientName(document)}
            </span>
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