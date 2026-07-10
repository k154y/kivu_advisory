"use client";

import { useEffect, useState } from "react";
import { Files } from "lucide-react";

import { ClientDocuments } from "@/components/client/client-documents";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import type { DocumentItem, ServiceRequest } from "@/types/api";

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    const [documentsResult, requestsResult] = await Promise.allSettled([
      api.get(endpoints.documents.list({ page_size: 100 })),
      api.get(endpoints.client.serviceRequests),
    ]);

    if (
      documentsResult.status === "rejected" &&
      requestsResult.status === "rejected"
    ) {
      setError(
        getSafeErrorMessage(
          documentsResult.reason,
          "Client documents are unavailable right now.",
        ),
      );
    } else {
      setDocuments(
        documentsResult.status === "fulfilled"
          ? extractItems<DocumentItem>(documentsResult.value.data)
          : [],
      );
      setRequests(
        requestsResult.status === "fulfilled"
          ? extractItems<ServiceRequest>(requestsResult.value.data)
          : [],
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  return isLoading ? (
    <LoadingState
      title="Loading documents"
      description="Preparing your uploaded files and request options."
    />
  ) : error ? (
    <EmptyState
      title="Documents unavailable"
      description={error}
      icon={<Files className="h-5 w-5" />}
    />
  ) : (
    <ClientDocuments
      documents={documents}
      requests={requests.map((request) => ({
        id: request.id,
        title: request.title,
        reference_number: request.reference_number,
      }))}
      onUploaded={loadData}
    />
  );
}
