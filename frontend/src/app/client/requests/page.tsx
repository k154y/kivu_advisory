"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  LinkIcon,
  RefreshCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

type ServiceRequest = {
  id: string;
  reference_number?: string;
  service_id?: string;
  service_name?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  source?: string;
  expected_deadline?: string;
  created_at?: string;
  submitted_at?: string;
  updated_at?: string;
};

const REQUEST_LIST_PATHS = [
  "/client/service-requests?page_size=100",
  "/client/requests?page_size=100",
];

function getItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: T[];
    data?: T[] | { items?: T[] };
  };

  if (Array.isArray(objectResponse.items)) return objectResponse.items;
  if (Array.isArray(objectResponse.data)) return objectResponse.data;

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status?: string) {
  if (!status) return "New";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status?: string) {
  switch (status) {
    case "completed":
      return "border-teal/20 bg-teal/10 text-teal";
    case "in_progress":
    case "in_review":
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "waiting_client":
    case "pending":
      return "border-amber-100 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-red-100 bg-red-50 text-red-700";
    default:
      return "border-gray-100 bg-lightgray text-gray-600";
  }
}

function priorityClass(priority?: string) {
  switch (priority) {
    case "urgent":
      return "border-red-100 bg-red-50 text-red-700";
    case "high":
      return "border-orange-100 bg-orange-50 text-orange-700";
    case "normal":
      return "border-teal/20 bg-teal/10 text-teal";
    case "low":
      return "border-gray-100 bg-lightgray text-gray-600";
    default:
      return "border-gray-100 bg-lightgray text-gray-600";
  }
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      let loadedRequests: ServiceRequest[] = [];

      for (const path of REQUEST_LIST_PATHS) {
        try {
          const result = await api.get<unknown>(path);
          loadedRequests = getItems<ServiceRequest>(result.data);

          if (loadedRequests.length > 0 || path === REQUEST_LIST_PATHS[0]) {
            break;
          }
        } catch {
          continue;
        }
      }

      setRequests(loadedRequests);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load your service requests."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return requests;

    return requests.filter((request) =>
      [
        request.reference_number,
        request.title,
        request.description,
        request.status,
        request.priority,
        request.service_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [requests, search]);

  return (
    <div>
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-gold">
              Client Portal
            </p>

            <h1 className="text-2xl font-bold text-navy">
              My Service Requests
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Track your requests, reference numbers, statuses, and deadlines.
              Previous requests submitted with this email are linked
              automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadRequests()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>

            <Link
              href={routes.client.linkRequest}
              className="inline-flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/10 px-4 py-2 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
            >
              <LinkIcon size={15} />
              Link Existing Request
            </Link>

            <Link
              href={routes.requestService}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal"
            >
              New Request
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference number, title, status, or priority..."
            className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <section className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
            <FileText size={28} className="text-gray-300" />
          </div>

          <h2 className="font-semibold text-navy">No service requests found</h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Your previous service requests linked to this email will appear
            here automatically. You can also link an old request using its
            reference number.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={routes.client.linkRequest}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal/20 bg-teal/10 px-4 py-2.5 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
            >
              <LinkIcon size={15} />
              Link Existing Request
            </Link>

            <Link
              href={routes.requestService}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal"
            >
              Submit New Request
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {filteredRequests.map((request) => (
            <article
              key={request.id}
              className="rounded-xl border border-gray-100 bg-white p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {request.reference_number ? (
                      <span className="rounded-full border border-navy/10 bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy">
                        {request.reference_number}
                      </span>
                    ) : null}

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                        request.status,
                      )}`}
                    >
                      {statusLabel(request.status)}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${priorityClass(
                        request.priority,
                      )}`}
                    >
                      {request.priority || "normal"}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-navy">
                    {request.title || "Untitled request"}
                  </h2>

                  {request.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
                      {request.description}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={13} />
                      Created:{" "}
                      {formatDate(request.created_at || request.submitted_at)}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={13} />
                      Deadline: {formatDate(request.expected_deadline)}
                    </span>
                  </div>
                </div>

                {request.id ? (
                  <Link
                    href={routes.client.requestDetail(request.id)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
                  >
                    View Details
                    <ArrowRight size={15} />
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}