"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
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
import { formatDateTime, formatReference, truncateText } from "@/lib/format";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";
import type { ServiceRequest } from "@/types/api";

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get(endpoints.client.serviceRequests);

        if (!cancelled) {
          setRequests(extractItems<ServiceRequest>(result.data));
        }
      } catch (loadError) {
        if (!cancelled) {
          setRequests([]);
          setError(getSafeErrorMessage(loadError, "Client requests could not be loaded."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return requests;
    }

    return requests.filter((request) =>
      [request.reference_number, request.title, request.description, request.status]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [requests, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          My requests
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Service request history</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Review submitted work, current status, and recent changes to each request.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference, title, description, or status"
            leftIcon={<Search className="h-4 w-4" />}
          />

          {isLoading ? (
            <LoadingState
              title="Loading requests"
              description="Fetching your service requests."
            />
          ) : error ? (
            <EmptyState
              title="Requests unavailable"
              description={error}
              icon={<FileText className="h-5 w-5" />}
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              title="No requests found"
              description="Service requests submitted under your client account will appear here."
              icon={<FileText className="h-5 w-5" />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatReference(request.reference_number)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{request.title}</p>
                        <p className="text-xs text-slate-500">
                          {truncateText(request.description, 70)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="service-request" value={request.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="priority" value={request.priority} />
                    </TableCell>
                    <TableCell>{formatDateTime(request.updated_at || request.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={routes.client.requestDetail(request.id)}>
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-[#092B44]">
                          View
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </Link>
                    </TableCell>
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
