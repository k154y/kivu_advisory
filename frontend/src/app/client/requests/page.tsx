"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  RefreshCw,
  Search,
} from "lucide-react";

import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

type ClientRequestItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at?: string;
  reference_number?: string;
};

type ApiListResponse<T> =
  | T[]
  | {
      items?: T[];
      data?: T[] | { items?: T[] };
    };

const REQUEST_LIST_PATHS = [
  "/client/service-requests?page_size=100",
  "/client/requests?page_size=100",
];

function getRequestItems(
  data: ApiListResponse<Record<string, unknown>>,
): Record<string, unknown>[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.items)) return data.items;

  if (Array.isArray(data.data)) return data.data;

  if (data.data && typeof data.data === "object" && Array.isArray(data.data.items)) {
    return data.data.items;
  }

  return [];
}

function normalizeRequest(item: Record<string, unknown>): ClientRequestItem {
  return {
    id: String(item.id ?? ""),
    title: String(item.title ?? item.service_name ?? item.service_type ?? "Service Request"),
    description: String(item.description ?? item.summary ?? ""),
    status: String(item.status ?? "new"),
    priority: String(item.priority ?? "normal"),
    created_at: String(item.created_at ?? ""),
    updated_at: String(item.updated_at ?? ""),
    reference_number: item.reference_number
      ? String(item.reference_number)
      : undefined,
  };
}

function formatDate(value?: string) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "new":
      return "New";
    case "assigned":
      return "Assigned";
    case "accepted":
      return "Accepted";
    case "in_progress":
      return "In Progress";
    case "waiting_client":
      return "Waiting Client";
    case "waiting_payment":
      return "Waiting Payment";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status ? status.replace(/_/g, " ") : "New";
  }
}

function getStatusPill(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "cancelled":
      return "bg-red-50 text-red-700 border border-red-100";
    case "in_progress":
      return "bg-purple-50 text-purple-700 border border-purple-100";
    case "assigned":
    case "accepted":
    case "waiting_client":
    case "waiting_payment":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "new":
    default:
      return "bg-blue-50 text-blue-700 border border-blue-100";
  }
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRequests = async () => {
    setLoading(true);

    for (const path of REQUEST_LIST_PATHS) {
      try {
        const result = await api.get<ApiListResponse<Record<string, unknown>>>(path);
        const items = getRequestItems(result.data).map(normalizeRequest);
        setRequests(items);
        setLoading(false);
        return;
      } catch {
        continue;
      }
    }

    setRequests([]);
    setLoading(false);
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return requests;

    return requests.filter((item) => {
      return [
        item.reference_number,
        item.title,
        item.description,
        item.status,
        item.priority,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [requests, search]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              My Requests
            </h1>
            <p className="mt-2 text-base text-slate-500">
              Review submitted work, current status, and recent changes to each request.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-2xl font-bold text-navy">Requests</h2>
        </div>

        <div className="space-y-6 p-6">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference, title, description, or status"
              className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-14 pr-4 text-base text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-slate-100 p-5"
                >
                  <div className="mb-3 h-5 w-64 rounded bg-slate-200" />
                  <div className="mb-2 h-4 w-80 rounded bg-slate-100" />
                  <div className="h-4 w-48 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300 px-6 py-16 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList size={28} />
              </div>

              <h3 className="text-2xl font-bold text-navy">No requests found</h3>
              <p className="mt-3 text-base text-slate-500">
                Service requests submitted under your client account will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Link
                  key={request.id}
                  href={routes.client.requestDetail(request.id)}
                  className="block rounded-[24px] border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-navy">
                          {request.title}
                        </h3>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(
                            request.status,
                          )}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      {request.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                          {request.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                        <span>Created: {formatDate(request.created_at)}</span>
                        {request.reference_number ? (
                          <span>Ref: {request.reference_number}</span>
                        ) : null}
                        <span className="capitalize">
                          Priority: {request.priority || "normal"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-teal">
                      Open request
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}