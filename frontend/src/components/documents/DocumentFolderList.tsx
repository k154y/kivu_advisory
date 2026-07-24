"use client";

import {
  Download,
  FileText,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteDocument,
  downloadDocument,
  getDocumentRequestTitle,
  groupDocumentsByReference,
  type DocumentItem,
} from "@/lib/documents";

type DocumentFolderListProps = {
  documents: DocumentItem[];
  canDelete?: boolean;
  onDeleted?: () => void;
};

function formatDate(value?: string) {
  if (!value) return "—";

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

function fileName(document: DocumentItem) {
  return document.original_file_name || document.file_name || "Document";
}

export function DocumentFolderList({
  documents,
  canDelete = false,
  onDeleted,
}: DocumentFolderListProps) {
  const groupedDocuments = groupDocumentsByReference(documents);

  const handleDownload = async (document: DocumentItem) => {
    try {
      await downloadDocument(document.id);
    } catch {
      toast.error("Failed to download document.");
    }
  };

  const handleDelete = async (document: DocumentItem) => {
    const confirmed = window.confirm(`Delete "${fileName(document)}"?`);

    if (!confirmed) return;

    try {
      await deleteDocument(document.id);
      toast.success("Document deleted.");
      onDeleted?.();
    } catch {
      toast.error("Failed to delete document.");
    }
  };

  if (documents.length === 0) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
          <FileText size={28} className="text-gray-300" />
        </div>

        <h2 className="font-semibold text-navy">No documents found</h2>

        <p className="mt-1 text-sm text-gray-400">
          Uploaded documents will appear here grouped by request reference
          number.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedDocuments).map(([referenceNumber, items]) => {
        const firstDocument = items[0];
        const requestTitle = firstDocument
          ? getDocumentRequestTitle(firstDocument)
          : "";

        return (
          <section
            key={referenceNumber}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-2 border-b border-gray-100 bg-lightgray px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-navy">
                  <FolderOpen size={18} />
                </div>

                <div>
                  <h2 className="font-bold text-navy">{referenceNumber}</h2>

                  <p className="text-sm text-gray-500">
                    {items.length} document{items.length !== 1 ? "s" : ""}
                    {requestTitle ? ` · ${requestTitle}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {items.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="shrink-0 text-gray-400" />

                      <p className="truncate font-semibold text-navy">
                        {fileName(document)}
                      </p>

                      {document.is_final ? (
                        <span className="rounded-full border border-teal/20 bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">
                          Final
                        </span>
                      ) : null}
                    </div>

                    {document.description ? (
                      <p className="mt-1 text-sm text-gray-500">
                        {document.description}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-gray-400">
                      {document.document_type || "document"} ·{" "}
                      {document.visibility || "shared"} ·{" "}
                      {formatDate(document.created_at || document.uploaded_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDownload(document)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
                    >
                      <Download size={14} />
                      Download
                    </button>

                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(document)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}