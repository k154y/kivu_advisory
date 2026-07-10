"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { ClientDashboardSummary } from "@/components/client/client-dashboard-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";
import type { DocumentItem, MessageItem, ServiceRequest } from "@/types/api";

export default function ClientDashboardPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      const [requestsResult, documentsResult, messagesResult] = await Promise.allSettled([
        api.get(endpoints.client.serviceRequests),
        api.get(endpoints.documents.list({ page_size: 100 })),
        api.get(endpoints.messages.list({ page_size: 100 })),
      ]);

      if (cancelled) return;

      if (
        requestsResult.status === "rejected" &&
        documentsResult.status === "rejected" &&
        messagesResult.status === "rejected"
      ) {
        setError(
          getSafeErrorMessage(
            requestsResult.reason,
            "Client dashboard data is unavailable right now.",
          ),
        );
      } else {
        setRequests(
          requestsResult.status === "fulfilled"
            ? extractItems<ServiceRequest>(requestsResult.value.data)
            : [],
        );
        setDocuments(
          documentsResult.status === "fulfilled"
            ? extractItems<DocumentItem>(documentsResult.value.data)
            : [],
        );
        setMessages(
          messagesResult.status === "fulfilled"
            ? extractItems<MessageItem>(messagesResult.value.data)
            : [],
        );
      }

      setIsLoading(false);
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Client dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Your Kivu Advisory workspace</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Review requests, documents, and recent communication from one place.
        </p>
      </div>

      {isLoading ? (
        <LoadingState
          title="Loading dashboard"
          description="Preparing your requests, documents, and messages."
        />
      ) : error ? (
        <EmptyState
          title="Dashboard unavailable"
          description={error}
          icon={<LayoutDashboard className="h-5 w-5" />}
        />
      ) : (
        <>
          <ClientDashboardSummary
            requests={requests.length}
            documents={documents.length}
            messages={messages.length}
          />

          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">My requests</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Track submitted service requests and review updates from the team.
                </p>
                <div className="mt-4">
                  <Link href={routes.client.requests}>
                    <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Open requests
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Upload supporting files for authenticated client requests only.
                </p>
                <div className="mt-4">
                  <Link href={routes.client.documents}>
                    <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Open documents
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">Messages</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Continue request-related communication when backend messaging is available.
                </p>
                <div className="mt-4">
                  <Link href={routes.client.messages}>
                    <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Open messages
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
