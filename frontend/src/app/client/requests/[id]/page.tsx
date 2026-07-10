"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";

import {
  ClientRequestDetail,
  type ClientRequestDetailItem,
} from "@/components/client/client-request-detail";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";

export default function ClientRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ClientRequestDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRequest = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<ClientRequestDetailItem>(
          endpoints.client.serviceRequestDetail(params.id),
        );

        if (!cancelled) {
          setRequest(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setRequest(null);
          setError(
            getSafeErrorMessage(
              loadError,
              "This client request could not be loaded from the backend.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (params.id) {
      void loadRequest();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href={routes.client.requests}>
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to requests
        </Button>
      </Link>

      {isLoading ? (
        <LoadingState
          title="Loading request"
          description="Preparing your request details and timeline."
        />
      ) : !request ? (
        <EmptyState
          title="Request unavailable"
          description={error || "This request could not be found."}
          icon={<FileText className="h-5 w-5" />}
        />
      ) : (
        <ClientRequestDetail request={request} />
      )}
    </div>
  );
}
