"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, RefreshCcw, Search } from "lucide-react";

import { DocumentFolderList } from "@/components/documents/DocumentFolderList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  getItems,
  listDocuments,
  type DocumentItem,
  type DocumentType,
  type DocumentVisibility,
} from "@/lib/documents";
import { getSafeErrorMessage } from "@/lib/portal";

type AdminServiceRequest = {
  id: string;
  reference_number?: string;
  title?: string;
  service_name?: string;
};

const visibilityOptions = [
  { label: "All visibility", value: "" },
  { label: "Client", value: "client" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

const documentTypeOptions = [
  { label: "All document types", value: "" },
  { label: "Client upload", value: "client_upload" },
  { label: "Admin upload", value: "admin_upload" },
  { label: "Accountant upload", value: "accountant_upload" },
  { label: "Final deliverable", value: "final_deliverable" },
  { label: "Internal file", value: "internal_file" },
];

function extractTotalPages(data: unknown) {
  if (!data || typeof data !== "object") return 1;

  const objectData = data as {
    pagination?: {
      total_pages?: number;
      totalPages?: number;
    };
    data?: {
      pagination?: {
        total_pages?: number;
        totalPages?: number;
      };
    };
  };

  return (
    objectData.pagination?.total_pages ||
    objectData.pagination?.totalPages ||
    objectData.data?.pagination?.total_pages ||
    objectData.data?.pagination?.totalPages ||
    1
  );
}

function getCreatedTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

async function loadAdminRequestsMap() {
  const possiblePaths = [
    "/admin/service-requests?page_size=500",
    "/admin/requests?page_size=500",
  ];

  for (const path of possiblePaths) {
    try {
      const result = await api.get<unknown>(path);
      const requests = getItems<AdminServiceRequest>(result.data);

      const map = new Map<
        string,
        {
          reference_number: string;
          title: string;
        }
      >();

      for (const request of requests) {
        if (!request.id) continue;

        map.set(request.id, {
          reference_number: request.reference_number || request.id,
          title: request.title || request.service_name || "",
        });
      }

      return map;
    } catch {
      continue;
    }
  }

  return new Map<
    string,
    {
      reference_number: string;
      title: string;
    }
  >();
}

function attachRequestReferenceNumbers(
  documents: DocumentItem[],
  requestMap: Map<
    string,
    {
      reference_number: string;
      title: string;
    }
  >,
) {
  return documents.map((document) => {
    if (!document.service_request_id) {
      return document;
    }

    const request = requestMap.get(document.service_request_id);

    if (!request) {
      return {
        ...document,
        service_request_reference_number: document.service_request_id,
      };
    }

    return {
      ...document,
      service_request_reference_number: request.reference_number,
      service_request_title: request.title,
    };
  });
}

function documentMatchesSearch(document: DocumentItem, search: string) {
  const term = search.trim().toLowerCase();

  if (!term) return true;

  return [
    document.service_request_reference_number,
    document.service_request_title,
    document.reference_number,
    document.service_request_id,
    document.original_file_name,
    document.file_name,
    document.description,
    document.document_type,
    document.visibility,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [visibility, setVisibility] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [documentResult, requestMap] = await Promise.all([
        listDocuments({
          visibility: visibility ? (visibility as DocumentVisibility) : undefined,
          document_type: documentType ? (documentType as DocumentType) : undefined,
          page,
          page_size: 100,
        }),
        loadAdminRequestsMap(),
      ]);

      const rawDocuments = getItems<DocumentItem>(documentResult.data).sort(
        (a, b) =>
          getCreatedTime(b.created_at || b.uploaded_at) -
          getCreatedTime(a.created_at || a.uploaded_at),
      );

      const documentsWithReferences = attachRequestReferenceNumbers(
        rawDocuments,
        requestMap,
      );

      setDocuments(documentsWithReferences);
      setTotalPages(extractTotalPages(documentResult.data));
    } catch (loadError) {
      setDocuments([]);
      setError(
        getSafeErrorMessage(loadError, "Documents could not be loaded."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility, documentType, page]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => documentMatchesSearch(document, search));
  }, [documents, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Documents</h1>

          <p className="mt-1 text-sm text-gray-500">
            Documents are grouped by service request reference number.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDocuments()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
        >
          <RefreshCcw
            size={15}
            className={isLoading ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 xl:flex-row xl:items-center xl:justify-between">
          <CardTitle>Document folders</CardTitle>

          <div className="grid gap-3 md:grid-cols-[1fr_220px_260px]">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by reference number, file, type..."
                className="w-full rounded-lg border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            <Select
              value={visibility}
              onChange={(event) => {
                setPage(1);
                setVisibility(event.target.value);
              }}
              options={visibilityOptions}
            />

            <Select
              value={documentType}
              onChange={(event) => {
                setPage(1);
                setDocumentType(event.target.value);
              }}
              options={documentTypeOptions}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState
              title="Loading documents"
              description="Fetching uploaded documents."
            />
          ) : error ? (
            <EmptyState
              title="Documents unavailable"
              description={error}
              icon={<FolderOpen className="h-5 w-5" />}
            />
          ) : (
            <>
              <DocumentFolderList
                documents={filteredDocuments}
                canDelete
                onDeleted={() => void loadDocuments()}
              />

              {filteredDocuments.length > 0 ? (
                <div className="mt-6">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}