"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
} from "lucide-react";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  extractItems,
  extractPaginationInfo,
  type PaginationInfo,
} from "@/lib/portal";
import { formatDate, titleCase } from "@/lib/format";
import type { ServiceRequest } from "@/types/api";

const STATUSES = [
  "",
  "new",
  "pending",
  "in_review",
  "waiting_client",
  "in_progress",
  "completed",
  "cancelled",
];

const PAGE_SIZE = 20;

const defaultPagination: PaginationInfo = {
  page: 1,
  pageSize: PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(defaultPagination);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = async (searchValue: string, statusValue: string, pageValue: number) => {
    setLoading(true);

    try {
      const result = await api.get(
        endpoints.admin.serviceRequests({
          search: searchValue || undefined,
          status: statusValue || undefined,
          page: pageValue,
          page_size: PAGE_SIZE,
        }),
      );

      setRequests(extractItems<ServiceRequest>(result.data));
      setPagination(extractPaginationInfo({ pagination: result.meta }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      void load(search, status, 1);
    }, 300);

    return () => clearTimeout(debounce.current);
  }, [search, status]);

  useEffect(() => {
    void load(search, status, page);
  }, [page]);

  const visiblePages = useMemo(() => {
    const totalPages = pagination.totalPages;

    return Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
      const nextPage =
        totalPages <= 7 ? index + 1 : page <= 4 ? index + 1 : page + index - 3;

      return nextPage >= 1 && nextPage <= totalPages ? nextPage : null;
    }).filter((value): value is number => value !== null);
  }, [pagination.totalPages, page]);

  return (
    <div className="max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Service Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pagination.totalItems} request{pagination.totalItems !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, email, company, or service..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="shrink-0 text-gray-400" />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            {STATUSES.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption ? titleCase(statusOption) : "All Statuses"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {search || status ? "No requests match your filters" : "No requests yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-lightgray">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Service
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Priority
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="transition-colors hover:bg-lightgray/50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">
                        {request.requester_name || request.requester_email || "Unknown requester"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {request.requester_email || request.requester_phone || ""}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="line-clamp-1 text-charcoal">{request.title}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          request.priority === "urgent"
                            ? "bg-red-100 text-red-700"
                            : request.priority === "high"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {titleCase(request.priority)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-lightgray px-2.5 py-1 text-xs font-medium text-charcoal">
                        {titleCase(request.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {formatDate(request.created_at || request.submitted_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal hover:underline"
                      >
                        <Eye size={13} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-xs text-gray-500">
            Page {page} of {pagination.totalPages} · {pagination.totalItems} total
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-lightgray disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {visiblePages.map((visiblePage) => (
              <button
                key={visiblePage}
                type="button"
                onClick={() => setPage(visiblePage)}
                className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                  visiblePage === page
                    ? "bg-navy text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-lightgray"
                }`}
              >
                {visiblePage}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-lightgray disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
