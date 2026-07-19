"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
} from "lucide-react";

import { api } from "@/lib/api";
import { routes } from "@/lib/routes";
import { useAuth } from "@/hooks/use-auth";

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

function getSafeInitial(name?: string | null) {
  if (!name) return "C";
  return name.trim().charAt(0).toUpperCase() || "C";
}

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

function getProgressIndex(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "new":
      return 1;
    case "assigned":
    case "accepted":
      return 2;
    case "in_progress":
    case "waiting_client":
    case "waiting_payment":
      return 3;
    case "completed":
      return 4;
    case "cancelled":
      return 1;
    default:
      return 1;
  }
}

function ProgressDots({ status }: { status?: string }) {
  const activeStep = getProgressIndex(status);

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map((step, index) => (
        <div key={step} className="flex items-center">
          <span
            className={`h-3 w-3 rounded-full ${
              step <= activeStep ? "bg-teal" : "bg-slate-200"
            }`}
          />
          {index < 3 ? (
            <span
              className={`mx-1 h-0.5 w-8 ${
                step < activeStep ? "bg-teal" : "bg-slate-200"
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ClientRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      setLoading(true);

      for (const path of REQUEST_LIST_PATHS) {
        try {
          const result = await api.get<ApiListResponse<Record<string, unknown>>>(path);
          const items = getRequestItems(result.data).map(normalizeRequest);

          if (!cancelled) {
            setRequests(items);
            setLoading(false);
          }

          return;
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setRequests([]);
        setLoading(false);
      }
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter(
      (item) => item.status.toLowerCase() === "completed",
    ).length;
    const active = requests.filter((item) => {
      const status = item.status.toLowerCase();
      return status !== "completed" && status !== "cancelled";
    }).length;

    return { total, active, completed };
  }, [requests]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [requests]);

  const companyName =
    (user as { company_name?: string | null } | null)?.company_name || "";

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-navy text-4xl font-bold text-white">
              {getSafeInitial(user?.full_name || user?.email)}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl">
                Welcome back, {user?.full_name || "Client"}
              </h1>

              <p className="mt-2 text-base text-slate-500">
                {user?.email || "No email address"}
              </p>

              {companyName ? (
                <p className="mt-1 text-base text-slate-500">{companyName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:w-auto sm:min-w-[220px]">
            <Link
              href={routes.requestService}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              <Plus size={18} />
              New Request
            </Link>

            <Link
              href={routes.bookConsultation}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-navy transition-colors hover:bg-slate-50"
            >
              <CalendarDays size={18} />
              Book Consultation
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <ClipboardList size={24} />
            </div>

            <div>
              <p className="text-4xl font-bold tracking-tight text-navy">
                {stats.total}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Total Requests
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <Clock3 size={24} />
            </div>

            <div>
              <p className="text-4xl font-bold tracking-tight text-purple-600">
                {stats.active}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">Active</p>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>

            <div>
              <p className="text-4xl font-bold tracking-tight text-emerald-500">
                {stats.completed}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Completed
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Link
          href={routes.client.requests}
          className="rounded-2xl bg-navy px-6 py-3 text-sm font-semibold text-white"
        >
          My Requests
        </Link>

        <Link
          href={routes.client.profile}
          className="rounded-2xl px-6 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-white hover:text-navy"
        >
          My Profile
        </Link>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-navy">Service Requests</h2>
          </div>

          <p className="text-sm text-slate-500">
            {requests.length} total
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-slate-100 p-5"
                >
                  <div className="mb-3 h-5 w-56 rounded bg-slate-200" />
                  <div className="mb-2 h-4 w-80 rounded bg-slate-100" />
                  <div className="h-4 w-40 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList size={28} />
              </div>

              <h3 className="text-xl font-bold text-navy">No requests yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Service requests submitted under your client account will appear here.
              </p>

              <Link
                href={routes.requestService}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
              >
                Create your first request
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={routes.client.requestDetail(request.id)}
                  className="block rounded-[24px] border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-bold text-navy">
                        {request.title}
                      </h3>

                      {request.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {request.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill(
                            request.status,
                          )}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>

                        <span className="text-sm text-slate-500">
                          {formatDate(request.created_at)}
                        </span>

                        {request.reference_number ? (
                          <span className="text-sm text-slate-500">
                            Ref: {request.reference_number}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 flex items-center gap-4">
                        <ProgressDots status={request.status} />
                        <span className="text-sm font-medium text-slate-600">
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                      <span className="text-sm text-slate-500">
                        View details
                      </span>

                      <ArrowRight className="text-slate-400" size={20} />
                    </div>
                  </div>
                </Link>
              ))}

              {requests.length > 5 ? (
                <div className="pt-2 text-right">
                  <Link
                    href={routes.client.requests}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-teal transition-colors hover:text-teal-700"
                  >
                    View all requests
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}