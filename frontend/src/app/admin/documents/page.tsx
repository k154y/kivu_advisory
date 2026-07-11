"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  downloadBlob,
  formatDateTime,
  formatDocumentName,
  formatFileSize,
} from "@/lib/format";
import { extractItems, extractPaginationInfo, getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";
import type { DocumentItem } from "@/types/api";

const visibilityOptions = [
  { label: "All visibility", value: "" },
  { label: "Client", value: "client" },
  { label: "Admin", value: "admin" },
  { label: "Accountant", value: "accountant" },
  { label: "Internal", value: "internal" },
  { label: "Shared", value: "shared" },
];

const documentTypeOptions = [
  { label: "All document types", value: "" },
  { label: "Client upload", value: "client_upload" },
  { label: "Admin upload", value: "admin_upload" },
  { label: "Accountant upload", value: "accountant_upload" },
  { label: "Final deliverable", value: "final_deliverable" },
  { label: "Internal", value: "internal" },
];

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [visibility, setVisibility] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get(
          endpoints.documents.list({
            visibility: visibility || undefined,
            document_type: documentType || undefined,
            page,
            page_size: 20,
          }),
        );

        if (!cancelled) {
          setDocuments(extractItems<DocumentItem>(result.data));
          setTotalPages(extractPaginationInfo(result.data).totalPages);
        }
      } catch (loadError) {
        if (!cancelled) {
          setDocuments([]);
          setError(getSafeErrorMessage(loadError, "Documents could not be loaded."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [visibility, documentType, page]);

  const handleDownload = async (document: DocumentItem) => {
    setDownloadingId(document.id);

    try {
      const { blob, filename } = await api.downloadFile(
        endpoints.documents.download(document.id),
      );

      downloadBlob(blob, filename || document.original_file_name);
    } catch (downloadError) {
      toast.error(getSafeErrorMessage(downloadError, "Failed to download this document."));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Documents
        </p>
        <h1 className="mt-2 text-3xl font-semibold">All documents</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Every document uploaded across all service requests.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 md:flex-row md:items-center md:justify-between">
          <CardTitle>Documents</CardTitle>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="w-full md:w-48">
              <Select
                value={visibility}
                onChange={(event) => {
                  setPage(1);
                  setVisibility(event.target.value);
                }}
                options={visibilityOptions}
              />
            </div>
            <div className="w-full md:w-56">
              <Select
                value={documentType}
                onChange={(event) => {
                  setPage(1);
                  setDocumentType(event.target.value);
                }}
                options={documentTypeOptions}
              />
            </div>
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
          ) : documents.length === 0 ? (
            <EmptyState
              title="No documents found"
              description="Documents uploaded to any service request will appear here."
              icon={<FolderOpen className="h-5 w-5" />}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Service request</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {formatDocumentName(document.original_file_name)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {document.description || document.file_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="document-type" value={document.document_type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="document-visibility" value={document.visibility} />
                      </TableCell>
                      <TableCell>{formatFileSize(document.file_size_bytes)}</TableCell>
                      <TableCell>
                        {document.service_request_id ? (
                          <Link
                            href={routes.admin.requestDetail(document.service_request_id)}
                            className="text-sm font-medium text-[#092B44] hover:underline"
                          >
                            View request
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(document.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => void handleDownload(document)}
                          disabled={downloadingId === document.id}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#092B44] hover:underline disabled:opacity-50"
                        >
                          <Download className="h-4 w-4" />
                          {downloadingId === document.id ? "Downloading..." : "Download"}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
