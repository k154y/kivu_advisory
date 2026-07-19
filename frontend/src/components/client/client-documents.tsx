"use client";

import { FormEvent, useMemo, useState } from "react";
import { FileUp, Files } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  formatDateTime,
  formatDocumentName,
  formatFileSize,
} from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";
import type { DocumentItem } from "@/types/api";

type ClientDocumentsProps = {
  documents: DocumentItem[];
  requests: Array<{ id: string; title: string; reference_number?: string }>;
  onUploaded?: () => Promise<void> | void;
};

export function ClientDocuments({
  documents,
  requests,
  onUploaded,
}: ClientDocumentsProps) {
  const [selectedRequestId, setSelectedRequestId] = useState(requests[0]?.id || "");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const requestOptions = useMemo(
    () =>
      requests.map((request) => ({
        label: request.reference_number
          ? `${request.reference_number} - ${request.title}`
          : request.title,
        value: request.id,
      })),
    [requests],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRequestId) {
      toast.error("Select a service request before uploading a document.");
      return;
    }

    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("service_request_id", selectedRequestId);
      formData.set("file", file);
      formData.set("visibility", "shared");
      formData.set("document_type", "client_upload");
      formData.set("is_final", "false");

      if (description.trim()) {
        formData.set("description", description.trim());
      }

      await api.uploadFile(endpoints.documents.upload, formData);

      setDescription("");
      setFile(null);
      const fileInput = document.getElementById("client-document-upload") as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }

      toast.success("Document uploaded successfully.");
      await onUploaded?.();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Unable to upload this document."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Upload a document</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {requestOptions.length === 0 ? (
            <EmptyState
              title="No requests available"
              description="Create or wait for a service request before uploading client documents."
              icon={<FileUp className="h-5 w-5" />}
            />
          ) : (
            <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
              <Select
                label="Service request"
                value={selectedRequestId}
                onChange={(event) => setSelectedRequestId(event.target.value)}
                options={requestOptions}
              />
              <div className="space-y-1.5">
                <label
                  htmlFor="client-document-upload"
                  className="block text-sm font-medium text-slate-800"
                >
                  File
                </label>
                <input
                  id="client-document-upload"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                />
              </div>
              <div className="lg:col-span-2">
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add context for the Kivu Advisory team."
                />
              </div>
              <div className="lg:col-span-2">
                <Button type="submit" variant="secondary" isLoading={isUploading}>
                  Upload document
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Uploaded documents</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Uploaded files will appear here for your active and completed service requests."
              icon={<Files className="h-5 w-5" />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
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
                      <StatusBadge
                        type="document-visibility"
                        value={document.visibility}
                      />
                    </TableCell>
                    <TableCell>{formatFileSize(document.file_size_bytes)}</TableCell>
                    <TableCell>{formatDateTime(document.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
