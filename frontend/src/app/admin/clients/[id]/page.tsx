"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, Users } from "lucide-react";

import {
  ClientDetailCard,
  type AdminClientDetail,
} from "@/components/admin/client-detail-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";
import type { ServiceRequest } from "@/types/api";

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadClient = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<AdminClientDetail>(
          endpoints.admin.clientDetail(params.id),
        );

        if (!cancelled) {
          setClient(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setClient(null);
          setError(
            getSafeErrorMessage(
              loadError,
              "This client record could not be loaded from the backend.",
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
      void loadClient();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      setRequestsLoading(true);
      setRequestsError(null);

      try {
        const result = await api.get(
          endpoints.admin.serviceRequests({ client_id: params.id, page_size: 50 }),
        );

        if (!cancelled) {
          setRequests(extractItems<ServiceRequest>(result.data));
        }
      } catch (loadError) {
        if (!cancelled) {
          setRequests([]);
          setRequestsError(
            getSafeErrorMessage(loadError, "This client's service requests could not be loaded."),
          );
        }
      } finally {
        if (!cancelled) {
          setRequestsLoading(false);
        }
      }
    };

    if (params.id) {
      void loadRequests();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="space-y-6">
      <Link href={routes.admin.clients}>
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to clients
        </Button>
      </Link>

      {isLoading ? (
        <LoadingState
          title="Loading client"
          description="Preparing this client account profile."
        />
      ) : !client ? (
        <EmptyState
          title="Client unavailable"
          description={error || "This client could not be found."}
          icon={<Users className="h-5 w-5" />}
        />
      ) : (
        <>
          <ClientDetailCard client={client} />

          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Service requests</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {requestsLoading ? (
                <LoadingState
                  title="Loading requests"
                  description="Fetching this client's service requests."
                />
              ) : requestsError ? (
                <EmptyState
                  title="Requests unavailable"
                  description={requestsError}
                  icon={<FileText className="h-5 w-5" />}
                />
              ) : requests.length === 0 ? (
                <EmptyState
                  title="No service requests yet"
                  description="Requests submitted by this client will appear here."
                  icon={<FileText className="h-5 w-5" />}
                />
              ) : (
                <div className="space-y-2">
                  {requests.map((request) => (
                    <Link
                      key={request.id}
                      href={routes.admin.requestDetail(request.id)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {request.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(request.created_at || request.submitted_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge type="service-request" value={request.status} />
                        <ArrowRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
