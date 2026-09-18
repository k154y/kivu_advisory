"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  FolderOpen,
  KeyRound,
  LinkIcon,
  MessageSquare,
  MessagesSquare,
  Plus,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

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

const CLIENT_TAX_CREDENTIALS_PATH = "/client/tax-credentials";

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

  if (
    data.data &&
    typeof data.data === "object" &&
    Array.isArray(data.data.items)
  ) {
    return data.data.items;
  }

  return [];
}

function normalizeRequest(item: Record<string, unknown>): ClientRequestItem {
  return {
    id: String(item.id ?? ""),
    title: String(
      item.title ?? item.service_name ?? item.service_type ?? "Service Request",
    ),
    description: String(item.description ?? item.summary ?? ""),
    status: String(item.status ?? "new"),
    priority: String(item.priority ?? "normal"),
    created_at: String(item.created_at ?? item.submitted_at ?? ""),
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
    case "in_review":
      return "In Review";
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
    case "in_review":
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
    case "in_review":
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

function buildMessageHref(request: ClientRequestItem) {
  const params = new URLSearchParams();

  params.set("service_request_id", request.id);

  if (request.reference_number) {
    params.set("reference", request.reference_number);
  }

  return `${routes.client.messages}?${params.toString()}`;
}

function buildDocumentsHref(request: ClientRequestItem) {
  const params = new URLSearchParams();

  params.set("service_request_id", request.id);

  if (request.reference_number) {
    params.set("reference", request.reference_number);
  }

  return `${routes.client.documents}?${params.toString()}`;
}

function ProgressDots({ status }: { status?: string }) {
  const activeStep = getProgressIndex(status);

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4].map((step, index) => (
        <div key={step} className="flex items-center">
          <span
            className={cn(
              "h-3 w-3 rounded-full",
              step <= activeStep ? "bg-teal" : "bg-slate-200",
            )}
          />
          {index < 3 ? (
            <span
              className={cn(
                "mx-1 h-0.5 w-8",
                step < activeStep ? "bg-teal" : "bg-slate-200",
              )}
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
          const result =
            await api.get<ApiListResponse<Record<string, unknown>>>(path);

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

    const waiting = requests.filter((item) =>
      ["waiting_client", "waiting_payment", "pending"].includes(
        item.status.toLowerCase(),
      ),
    ).length;

    return { total, active, completed, waiting };
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

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
                Manage your service requests, request documents, messages, and
                tax credentials from one client portal.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:w-auto sm:min-w-[230px]">
            <Link
              href={routes.requestService}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
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

            <Link
              href={routes.client.linkRequest}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal/20 bg-teal/10 px-5 py-3 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
            >
              <LinkIcon size={18} />
              Link Existing Request
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={<ClipboardList size={24} />}
          tone="navy"
        />

        <StatCard
          label="Active"
          value={stats.active}
          icon={<Clock3 size={24} />}
          tone="purple"
        />

        <StatCard
          label="Waiting"
          value={stats.waiting}
          icon={<FileText size={24} />}
          tone="amber"
        />

        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={24} />}
          tone="green"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <QuickAction
          href={routes.client.requests}
          icon={<ClipboardList size={18} />}
          title="My Requests"
          description="Track all service requests and statuses."
        />

        <QuickAction
          href={routes.client.documents}
          icon={<FolderOpen size={18} />}
          title="Documents"
          description="Upload and download request documents."
        />

        <QuickAction
          href={routes.client.messages}
          icon={<MessagesSquare size={18} />}
          title="Messages"
          description="Chat with Kivu Advisory by request."
        />

        <QuickAction
          href={CLIENT_TAX_CREDENTIALS_PATH}
          icon={<KeyRound size={18} />}
          title="Tax Credentials"
          description="Manage tax system access securely."
        />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-navy">Recent Requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Documents and messages are attached to each request reference.
            </p>
          </div>

          <Link
            href={routes.client.requests}
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal transition-colors hover:text-navy"
          >
            View all requests
            <ArrowRight size={16} />
          </Link>
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
                Service requests submitted under your client account will appear
                here.
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
                <article
                  key={request.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-navy">
                          {request.reference_number || request.id}
                        </span>

                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
                            getStatusPill(request.status),
                          )}
                        >
                          {getStatusLabel(request.status)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                          {request.priority || "normal"}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-navy">
                        {request.title}
                      </h3>

                      {request.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {request.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>{formatDate(request.created_at)}</span>
                        <span>·</span>
                        <span>{getStatusLabel(request.status)}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-4">
                        <ProgressDots status={request.status} />
                        <span className="text-sm font-medium text-slate-600">
                          Request progress
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Link
                        href={buildMessageHref(request)}
                        className="inline-flex items-center gap-2 rounded-xl border border-teal/20 bg-teal/10 px-3 py-2 text-xs font-semibold text-teal hover:bg-teal hover:text-white"
                      >
                        <MessageSquare size={14} />
                        Messages
                      </Link>

                      <Link
                        href={buildDocumentsHref(request)}
                        className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-navy hover:bg-gold/20"
                      >
                        <FolderOpen size={14} />
                        Documents
                      </Link>

                      <Link
                        href={routes.client.requestDetail(request.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Details
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "navy" | "purple" | "amber" | "green";
}) {
  const styles = {
    navy: "bg-slate-100 text-slate-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            styles[tone],
          )}
        >
          {icon}
        </div>

        <div>
          <p className="text-4xl font-bold tracking-tight text-navy">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/5 text-navy transition-colors group-hover:bg-teal group-hover:text-white">
        {icon}
      </div>

      <h3 className="font-bold text-navy">{title}</h3>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {description}
      </p>
    </Link>
  );
}