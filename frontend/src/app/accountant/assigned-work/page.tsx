"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;

type Assignment = {
  id: string;
  service_request_id?: string;
  accountant_user_id?: string;
  status: string;
  priority?: string;
  due_date?: string | null;
  notes?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  service_request?: UnknownRecord;
  request?: UnknownRecord;
};

const ACCOUNTANT_STATUSES = [
  "assigned",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 border border-red-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  normal: {
    label: "Normal",
    className: "bg-gray-100 text-gray-600 border border-gray-100",
  },
  low: {
    label: "Low",
    className: "bg-green-100 text-green-700 border border-green-100",
  },
};

function getListItems<T>(response: unknown): T[] {
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

function getRequestObject(assignment: Assignment): UnknownRecord {
  if (
    assignment.service_request &&
    typeof assignment.service_request === "object"
  ) {
    return assignment.service_request;
  }

  if (assignment.request && typeof assignment.request === "object") {
    return assignment.request;
  }

  return {};
}

function readString(source: UnknownRecord | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getClientName(assignment: Assignment) {
  const request = getRequestObject(assignment);

  return (
    readString(request, [
      "requester_name",
      "full_name",
      "client_name",
      "name",
    ]) || "Client"
  );
}

function getCompanyName(assignment: Assignment) {
  const request = getRequestObject(assignment);

  return readString(request, [
    "requester_company",
    "company_name",
    "company",
  ]);
}

function getRequestTitle(assignment: Assignment) {
  const request = getRequestObject(assignment);

  return (
    readString(request, ["title", "service_type", "service_title"]) ||
    "Assigned Request"
  );
}

function getRequestDescription(assignment: Assignment) {
  const request = getRequestObject(assignment);

  return readString(request, ["description", "message", "body"]);
}

function getPriority(assignment: Assignment) {
  const request = getRequestObject(assignment);

  return (
    assignment.priority ||
    readString(request, ["priority", "urgency"]) ||
    "normal"
  );
}

function formatTitle(value?: string) {
  if (!value) return "Assigned Request";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateShort(value?: string | null) {
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

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    assigned: "Assigned",
    accepted: "Accepted",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[status || ""] || formatTitle(status || "Unknown");
}

function getStatusColor(status?: string) {
  const colors: Record<string, string> = {
    assigned: "bg-blue-50 text-blue-700 border border-blue-100",
    accepted: "bg-teal/10 text-teal border border-teal/20",
    in_progress: "bg-amber-50 text-amber-700 border border-amber-100",
    completed: "bg-green-50 text-green-700 border border-green-100",
    cancelled: "bg-red-50 text-red-700 border border-red-100",
  };

  return colors[status || ""] || "bg-gray-100 text-gray-600";
}

function getCreatedTime(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AccountantAssignedWorkPage() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);

    try {
      const result = await api.get<unknown>(
        "/accountant/assignments?page_size=100",
      );

      const items = getListItems<Assignment>(result.data).sort(
        (a, b) => getCreatedTime(b.created_at) - getCreatedTime(a.created_at),
      );

      setAssignments(items);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load assigned work."),
      );
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
        `/accountant/assignments/status?id=${encodeURIComponent(id)}`,
        {
          status,
        },
      );

      toast.success("Status updated.");

      setAssignments((current) =>
        current.map((assignment) =>
          assignment.id === id
            ? {
                ...assignment,
                status,
              }
            : assignment,
        ),
      );
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update status."));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return assignments;

    return assignments.filter((assignment) => {
      const clientName = getClientName(assignment).toLowerCase();
      const companyName = getCompanyName(assignment).toLowerCase();
      const title = getRequestTitle(assignment).toLowerCase();
      const description = getRequestDescription(assignment).toLowerCase();

      return (
        clientName.includes(value) ||
        companyName.includes(value) ||
        title.includes(value) ||
        description.includes(value)
      );
    });
  }, [assignments, search]);

  const active = assignments.filter(
    (assignment) => !["completed", "cancelled"].includes(assignment.status),
  );

  const urgent = active.filter(
    (assignment) => getPriority(assignment) === "urgent",
  );

  const completed = assignments.filter(
    (assignment) => assignment.status === "completed",
  );

  const inProgress = assignments.filter((assignment) =>
    ["accepted", "in_progress"].includes(assignment.status),
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal text-2xl font-bold text-white">
          {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-navy">
            Welcome,{" "}
            {(user?.full_name || user?.email || "Accountant").split(" ")[0]}
          </h1>

          <p className="text-sm text-gray-500">
            Accountant Portal ·{" "}
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors hover:text-navy disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      {urgent.length > 0 ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span>
            <strong>{urgent.length}</strong> urgent request
            {urgent.length !== 1 ? "s" : ""} need immediate attention.
          </span>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Assigned",
            value: assignments.length,
            icon: Briefcase,
            color: "text-navy",
            bg: "bg-navy/5",
          },
          {
            label: "Active",
            value: active.length,
            icon: Clock,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "In Progress",
            value: inProgress.length,
            icon: AlertCircle,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Completed",
            value: completed.length,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                bg,
                color,
              )}
            >
              <Icon size={18} />
            </div>

            <div>
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="shrink-0 font-bold text-navy">Assigned Work</h2>

          <div className="relative max-w-xs flex-1">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients or services..."
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>

          <span className="shrink-0 text-xs text-gray-400">
            {filtered.length} shown
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
              <Briefcase size={28} className="text-gray-300" />
            </div>

            <h3 className="mb-2 font-semibold text-navy">
              No assigned work yet
            </h3>

            <p className="text-sm text-gray-400">
              Admin assignments will appear here when they are assigned to you.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...filtered]
              .sort((a, b) => {
                const priorityOrder: Record<string, number> = {
                  urgent: 0,
                  high: 1,
                  normal: 2,
                  low: 3,
                };

                return (
                  (priorityOrder[getPriority(a)] ?? 2) -
                  (priorityOrder[getPriority(b)] ?? 2)
                );
              })
              .map((assignment) => {
                const priority = getPriority(assignment);
                const priorityInfo =
                  PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
                const clientName = getClientName(assignment);
                const companyName = getCompanyName(assignment);
                const title = getRequestTitle(assignment);
                const isCompleted = assignment.status === "completed";

                return (
                  <div
                    key={assignment.id}
                    className={cn(
                      "px-5 py-4 transition-colors hover:bg-lightgray/40",
                      priority === "urgent" && "border-l-4 border-l-red-400",
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-sm font-bold text-navy">
                          {clientName.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-navy">
                              {clientName}
                            </p>

                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                priorityInfo.className,
                              )}
                            >
                              {priorityInfo.label}
                            </span>
                          </div>

                          {companyName ? (
                            <p className="text-xs text-gray-400">
                              {companyName}
                            </p>
                          ) : null}

                          <p className="mt-0.5 text-xs text-charcoal">
                            {formatTitle(title)}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-400">
                            {formatDateShort(assignment.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            getStatusColor(assignment.status),
                          )}
                        >
                          {getStatusLabel(assignment.status)}
                        </span>

                        {!isCompleted ? (
                          <select
                            disabled={updating === assignment.id}
                            value={assignment.status}
                            onChange={(event) =>
                              void handleStatusChange(
                                assignment.id,
                                event.target.value,
                              )
                            }
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-50"
                          >
                            {ACCOUNTANT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {getStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        ) : null}

                        <Link
                          href={`/accountant/assigned-work/${assignment.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 px-3 py-1.5 text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
                        >
                          <MessageSquare size={12} />
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
          <User size={14} className="text-teal" />
          My Account
        </h3>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-400">Name</p>
            <p className="font-medium text-charcoal">
              {user?.full_name || "Accountant"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="truncate font-medium text-charcoal">
              {user?.email}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">Role</p>
            <span className="inline-block rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold capitalize text-teal">
              {user?.role || "accountant"}
            </span>
          </div>

          {user?.phone ? (
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium text-charcoal">{user.phone}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}