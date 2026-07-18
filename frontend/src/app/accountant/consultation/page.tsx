"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Consultation = {
  id: string;
  full_name?: string;
  name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  consultation_type?: string;
  type?: string;
  preferred_method?: string;
  contact_method?: string;
  subject?: string;
  message?: string;
  description?: string;
  status?: string;
  priority?: string;
  created_at?: string;
};

const STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "in_progress",
  "closed",
  "cancelled",
];

function getItems(response: unknown): Consultation[] {
  if (Array.isArray(response)) return response as Consultation[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: Consultation[];
    data?: Consultation[] | { items?: Consultation[] };
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

function formatTitle(value?: string) {
  if (!value) return "Not specified";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return "Not set";

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

function getClientName(item: Consultation) {
  return item.full_name || item.name || "Client";
}

function getConsultationType(item: Consultation) {
  return item.consultation_type || item.type || "general";
}

function getContactMethod(item: Consultation) {
  return item.preferred_method || item.contact_method || "not specified";
}

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    closed: "Closed",
    cancelled: "Cancelled",
  };

  return labels[status || ""] || formatTitle(status);
}

function getStatusColor(status?: string) {
  const colors: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border border-blue-100",
    contacted: "bg-teal/10 text-teal border border-teal/20",
    scheduled: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    in_progress: "bg-amber-50 text-amber-700 border border-amber-100",
    closed: "bg-green-50 text-green-700 border border-green-100",
    cancelled: "bg-red-50 text-red-700 border border-red-100",
  };

  return colors[status || ""] || "bg-gray-100 text-gray-600";
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load consultations.";
}

export default function AccountantConsultationPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const result = await api.get<unknown>(
        "/accountant/consultations?page_size=100",
      );

      const items = getItems(result.data);

      setConsultations(items);
    } catch (error) {
      const message = getSafeErrorMessage(error);
      setPageError(message);
      setConsultations([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id);

    try {
      await api.patch(
        `/accountant/consultations/status?id=${encodeURIComponent(id)}`,
        { status },
      );

      setConsultations((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
      );

      toast.success("Consultation status updated.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return consultations;

    return consultations.filter((item) => {
      const text = [
        getClientName(item),
        item.company_name,
        item.email,
        item.phone,
        getConsultationType(item),
        item.subject,
        item.message,
        item.description,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(value);
    });
  }, [consultations, search]);

  const active = consultations.filter(
    (item) => !["closed", "cancelled"].includes(item.status || ""),
  );

  const closed = consultations.filter((item) => item.status === "closed");

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal text-white">
          <Calendar size={26} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-navy">Consultations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Consultations assigned to your accountant account.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-lightgray hover:text-navy disabled:opacity-50"
        >
          <RefreshCcw
            size={15}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total"
          value={consultations.length}
          icon={<Calendar size={18} />}
          className="text-navy"
        />

        <StatCard
          label="Active"
          value={active.length}
          icon={<Clock size={18} />}
          className="text-amber-600"
        />

        <StatCard
          label="Closed"
          value={closed.length}
          icon={<CheckCircle2 size={18} />}
          className="text-green-600"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-navy">Assigned Consultations</h2>
            <p className="mt-1 text-xs text-gray-400">
              Only consultations assigned to you are listed here.
            </p>
          </div>

          <div className="relative max-w-xs flex-1">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search consultations..."
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>
        </div>

        {pageError ? (
          <div className="p-10 text-center">
            <h3 className="font-semibold text-navy">
              Consultations could not be loaded
            </h3>

            <p className="mt-2 text-sm text-gray-400">{pageError}</p>

            <button
              type="button"
              onClick={() => void load()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCcw size={14} />
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
              <Calendar size={28} className="text-gray-300" />
            </div>

            <h3 className="mb-2 font-semibold text-navy">
              No consultations assigned
            </h3>

            <p className="text-sm text-gray-400">
              Consultations assigned by admin will appear here.
            </p>

            <Link
              href="/accountant/assigned-work"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-teal/30 px-4 py-2 text-sm font-semibold text-teal hover:bg-teal hover:text-white"
            >
              View assigned requests
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((item) => {
              const clientName = getClientName(item);
              const isClosed = ["closed", "cancelled"].includes(
                item.status || "",
              );

              return (
                <div
                  key={item.id}
                  className="px-5 py-4 transition-colors hover:bg-lightgray/40"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-sm font-bold text-navy">
                        {clientName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy">
                          {clientName}
                        </p>

                        {item.company_name ? (
                          <p className="text-xs text-gray-400">
                            {item.company_name}
                          </p>
                        ) : null}

                        <p className="mt-0.5 text-xs text-charcoal">
                          {formatTitle(getConsultationType(item))}
                          {item.subject ? ` · ${item.subject}` : ""}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span>{formatDate(item.created_at)}</span>

                          {item.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone size={11} className="text-teal" />
                              {item.phone}
                            </span>
                          ) : null}

                          {item.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail size={11} className="text-teal" />
                              {item.email}
                            </span>
                          ) : null}

                          <span className="inline-flex items-center gap-1">
                            <UserRound size={11} className="text-teal" />
                            {formatTitle(getContactMethod(item))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                          getStatusColor(item.status),
                        )}
                      >
                        {getStatusLabel(item.status)}
                      </span>

                      {!isClosed ? (
                        <select
                          disabled={updating === item.id}
                          value={item.status || "new"}
                          onChange={(event) =>
                            void handleStatusChange(
                              item.id,
                              event.target.value,
                            )
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-50"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {getStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      <Link
                        href={`/accountant/consultation/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 px-3 py-1.5 text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
                      >
                        Open
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-gray-100 bg-white p-5">
        <h3 className="mb-2 font-bold text-navy">
          Requests Assigned To You
        </h3>

        <p className="text-sm text-gray-500">
          Service request assignments are separate from consultations.
        </p>

        <Link
          href="/accountant/assigned-work"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          View assigned requests
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  className: string;
};

function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lightgray",
          className,
        )}
      >
        {icon}
      </div>

      <div>
        <p className={cn("text-2xl font-bold", className)}>{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}