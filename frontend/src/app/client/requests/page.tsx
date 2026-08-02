"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

type ClientServiceRequest = {
  id: string;
  reference_number?: string;
  service_id?: string;
  service_name?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  preferred_contact_method?: string;
  expected_deadline?: string;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (!data || typeof data !== "object") return [];

  const objectData = data as {
    items?: T[];
    data?: T[] | { items?: T[] };
  };

  if (Array.isArray(objectData.items)) return objectData.items;
  if (Array.isArray(objectData.data)) return objectData.data;

  if (
    objectData.data &&
    !Array.isArray(objectData.data) &&
    Array.isArray(objectData.data.items)
  ) {
    return objectData.data.items;
  }

  return [];
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

function labelFromValue(value?: string) {
  if (!value) return "—";

  return value
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
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "low":
      return "border-gray-100 bg-lightgray text-gray-600";
    default:
      return "border-gray-100 bg-lightgray text-gray-600";
  }
}

function buildMessageHref(request: ClientServiceRequest) {
  const params = new URLSearchParams();

  if (request.id) params.set("service_request_id", request.id);
  if (request.reference_number) params.set("reference", request.reference_number);

  return `${routes.client.messages}?${params.toString()}`;
}

function buildDocumentsHref(request: ClientServiceRequest) {
  const params = new URLSearchParams();

  if (request.id) params.set("service_request_id", request.id);
  if (request.reference_number) params.set("reference", request.reference_number);

  return `${routes.client.documents}?${params.toString()}`;
}

function buildRequestDetailHref(request: ClientServiceRequest) {
  return `/client/requests/${request.id}`;
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<ClientServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      let data: unknown;

      try {
        const result = await api.get<unknown>(
          "/client/service-requests?page_size=100",
        );
        data = result.data;
      } catch {
        const fallbackResult = await api.get<unknown>(
          "/client/requests?page_size=100",
        );
        data = fallbackResult.data;
      }

      const items = getItems<ClientServiceRequest>(data).sort((a, b) => {
        const dateA = new Date(a.created_at || a.submitted_at || 0).getTime();
        const dateB = new Date(b.created_at || b.submitted_at || 0).getTime();

        return dateB - dateA;
      });

      setRequests(items);
    } catch (loadError) {
      const message = getSafeErrorMessage(
        loadError,
        "Failed to load your service requests.",
      );

      setRequests([]);
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;

    const active = requests.filter((request) =>
      ["new", "pending", "in_review", "waiting_client", "in_progress"].includes(
        request.status || "new",
      ),
    ).length;

    const completed = requests.filter(
      (request) => request.status === "completed",
    ).length;

    const waiting = requests.filter(
      (request) => request.status === "waiting_client",
    ).length;

    return {
      total,
      active,
      completed,
      waiting,
    };
  }, [requests]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-navy">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <h1 className="font-bold">Loading your requests</h1>
            <p className="text-sm text-gray-500">
              Please wait while we fetch your service requests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">
              Client Portal
            </p>
            <h1 className="mt-2 text-2xl font-bold text-navy">My Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              View your service requests, documents, and messages in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadRequests(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-lightgray disabled:opacity-60"
            >
              <RefreshCcw
                className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              Refresh
            </button>

            <Link
              href="/request-service"
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
            >
              <Plus className="h-4 w-4" />
              New Request
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="Waiting Client"
          value={stats.waiting}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-bold text-navy">Recent Requests</h2>
          <p className="text-sm text-gray-500">
            {requests.length} request{requests.length === 1 ? "" : "s"} found.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lightgray text-navy">
              <FileText className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-navy">No requests yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              You do not have any service requests linked to your client account
              yet.
            </p>

            <Link
              href="/request-service"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal"
            >
              <Plus className="h-4 w-4" />
              Create Request
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((request) => (
              <article
                key={request.id}
                className="px-6 py-5 transition-colors hover:bg-lightgray/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-navy">
                        {request.reference_number ||
                          `Request ${request.id.slice(0, 8)}`}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                          request.status,
                        )}`}
                      >
                        {labelFromValue(request.status || "new")}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass(
                          request.priority,
                        )}`}
                      >
                        {labelFromValue(request.priority || "normal")}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-charcoal">
                      {request.service_name || request.title || "Service request"}
                    </p>

                    {request.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {request.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                      <span>
                        Created:{" "}
                        {formatDate(request.created_at || request.submitted_at)}
                      </span>
                      <span>
                        Deadline: {formatDate(request.expected_deadline)}
                      </span>
                      <span>
                        Contact:{" "}
                        {labelFromValue(request.preferred_contact_method)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildMessageHref(request)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 px-3 py-2 text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Messages
                    </Link>

                    <Link
                      href={buildDocumentsHref(request)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-navy transition-colors hover:bg-lightgray"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Documents
                    </Link>

                    <Link
                      href={buildRequestDetailHref(request)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lightgray text-teal">
          {icon}
        </div>
      </div>
    </div>
  );
}