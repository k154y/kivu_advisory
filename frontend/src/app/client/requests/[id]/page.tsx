"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, FolderOpen, MessageSquare } from "lucide-react";

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

function readString(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return "";

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function buildMessageHref(request: ClientRequestDetailItem, fallbackId: string) {
  const params = new URLSearchParams();

  params.set("service_request_id", readString(request, ["id"]) || fallbackId);

  const reference = readString(request, ["reference_number", "reference"]);

  if (reference) {
    params.set("reference", reference);
  }

  return `${routes.client.messages}?${params.toString()}`;
}

function buildDocumentsHref(request: ClientRequestDetailItem, fallbackId: string) {
  const params = new URLSearchParams();

  params.set("service_request_id", readString(request, ["id"]) || fallbackId);

  const reference = readString(request, ["reference_number", "reference"]);

  if (reference) {
    params.set("reference", reference);
  }

  return `${routes.client.documents}?${params.toString()}`;
}

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

  const referenceNumber = useMemo(() => {
    return request
      ? readString(request, ["reference_number", "reference"])
      : "";
  }, [request]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={routes.client.requests}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to requests
          </Button>
        </Link>

        {request ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildMessageHref(request, params.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/10 px-3 py-2 text-xs font-semibold text-teal hover:bg-teal hover:text-white"
            >
              <MessageSquare size={14} />
              Messages
            </Link>

            <Link
              href={buildDocumentsHref(request, params.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-navy hover:bg-gold/20"
            >
              <FolderOpen size={14} />
              Documents
            </Link>
          </div>
        ) : null}
      </div>

      {referenceNumber ? (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Request Reference
          </p>
          <p className="mt-1 font-bold text-navy">{referenceNumber}</p>
        </div>
      ) : null}

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