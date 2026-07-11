"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems } from "@/lib/portal";
import { formatDate, titleCase } from "@/lib/format";
import type { Consultation, ServiceRequest } from "@/types/api";

const PIPELINE = [
  { key: "new", label: "New", color: "bg-blue-500" },
  { key: "pending", label: "Pending", color: "bg-amber-500" },
  { key: "in_review", label: "In Review", color: "bg-yellow-500" },
  { key: "waiting_client", label: "Waiting Client", color: "bg-orange-500" },
  { key: "in_progress", label: "In Progress", color: "bg-indigo-500" },
  { key: "completed", label: "Completed", color: "bg-green-500" },
  { key: "cancelled", label: "Cancelled", color: "bg-slate-400" },
];

type DashboardCounts = {
  totalRequests: number;
  newRequests: number;
  inProgress: number;
  completed: number;
  totalClients: number;
  totalAccountants: number;
};

type DashboardStatsResponse = {
  service_requests: {
    total: number;
    by_status: Record<string, number>;
  };
  consultations: {
    total: number;
    by_status: Record<string, number>;
  };
  clients: { total: number };
  accountants: { total: number };
};

const initialCounts: DashboardCounts = {
  totalRequests: 0,
  newRequests: 0,
  inProgress: 0,
  completed: 0,
  totalClients: 0,
  totalAccountants: 0,
};

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [pendingConsultations, setPendingConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const [statsResult, recentRequestsList, consultationsList] = await Promise.allSettled([
      api.get<DashboardStatsResponse>(endpoints.admin.dashboardStats),
      api.get(endpoints.admin.serviceRequests({ page_size: 20 })),
      api.get(endpoints.admin.consultations({ page_size: 6 })),
    ]);

    const stats = statsResult.status === "fulfilled" ? statsResult.value.data : null;

    const recentItems =
      recentRequestsList.status === "fulfilled"
        ? extractItems<ServiceRequest>(recentRequestsList.value.data)
        : [];
    const consultationItems =
      consultationsList.status === "fulfilled"
        ? extractItems<Consultation>(consultationsList.value.data)
        : [];

    const sortedRequests = [...recentItems].sort((left, right) => {
      const leftDate = new Date(left.created_at || left.submitted_at).getTime();
      const rightDate = new Date(right.created_at || right.submitted_at).getTime();
      return rightDate - leftDate;
    });

    const byStatus = stats?.service_requests.by_status ?? {};

    setCounts({
      totalRequests: stats?.service_requests.total ?? recentItems.length,
      newRequests: byStatus.new ?? 0,
      inProgress: byStatus.in_progress ?? 0,
      completed: byStatus.completed ?? 0,
      totalClients: stats?.clients.total ?? 0,
      totalAccountants: stats?.accountants.total ?? 0,
    });

    setStatusBreakdown(byStatus);
    setRecentRequests(sortedRequests.slice(0, 6));
    setUrgentCount(
      recentItems.filter(
        (request) =>
          request.priority === "urgent" &&
          !["completed", "cancelled"].includes(request.status),
      ).length,
    );
    setPendingConsultations(
      consultationItems.filter((consultation) =>
        ["new", "contacted", "scheduled"].includes(consultation.status),
      ),
    );

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const statusCounts = useMemo(
    () =>
      PIPELINE.map((pipelineItem) => ({
        ...pipelineItem,
        count: statusBreakdown[pipelineItem.key] ?? 0,
      })),
    [statusBreakdown],
  );

  const totalActive = useMemo(
    () => counts.totalRequests - (statusBreakdown.completed ?? 0) - (statusBreakdown.cancelled ?? 0),
    [counts.totalRequests, statusBreakdown],
  );

  const statCards = [
    {
      label: "Total Requests",
      value: counts.totalRequests,
      icon: FileText,
      bg: "bg-blue-50",
      text: "text-blue-600",
      href: "/admin/requests",
    },
    {
      label: "New Requests",
      value: counts.newRequests,
      icon: AlertCircle,
      bg: "bg-amber-50",
      text: "text-amber-600",
      href: "/admin/requests?status=new",
    },
    {
      label: "In Progress",
      value: counts.inProgress,
      icon: Clock,
      bg: "bg-purple-50",
      text: "text-purple-600",
      href: "/admin/requests?status=in_progress",
    },
    {
      label: "Completed",
      value: counts.completed,
      icon: CheckCircle,
      bg: "bg-green-50",
      text: "text-green-600",
      href: "/admin/requests?status=completed",
    },
    {
      label: "Total Clients",
      value: counts.totalClients,
      icon: Users,
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      href: "/admin/clients",
    },
    {
      label: "Accountants",
      value: counts.totalAccountants,
      icon: UserCheck,
      bg: "bg-teal-50",
      text: "text-teal-600",
      href: "/admin/accountants",
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-56 rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-xl border border-gray-100 bg-white"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-72 rounded-xl border border-gray-100 bg-white lg:col-span-2" />
          <div className="h-72 rounded-xl border border-gray-100 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Admin overview for service requests, clients, and consultation flow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors hover:text-navy"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            href="/admin/requests"
            className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal"
          >
            <Plus size={13} />
            View Requests
          </Link>
        </div>
      </div>

      {(urgentCount > 0 || counts.newRequests > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {counts.newRequests > 0 && (
            <Link
              href="/admin/requests?status=new"
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 transition-colors hover:bg-amber-100"
            >
              <AlertCircle size={15} className="text-amber-600" />
              <span>
                <strong>{counts.newRequests}</strong> new request
                {counts.newRequests !== 1 ? "s" : ""} need review
              </span>
              <ArrowRight size={13} />
            </Link>
          )}
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span>
                <strong>{urgentCount}</strong> urgent request
                {urgentCount !== 1 ? "s" : ""} active
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-xl border border-gray-100 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {card.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg} ${card.text}`}
                >
                  <Icon size={16} />
                </div>
              </div>
              <p className="text-3xl font-bold text-navy">{card.value}</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-teal opacity-0 transition-opacity group-hover:opacity-100">
                View all <ArrowRight size={11} />
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-navy">Request Pipeline</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {totalActive} active requests across all stages
              </p>
            </div>
            <Link href="/admin/requests" className="text-xs font-medium text-teal hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            {statusCounts.map(({ key, label, color, count }) => {
              const pct =
                totalActive > 0
                  ? Math.round((count / Math.max(counts.totalRequests, 1)) * 100)
                  : 0;

              return (
                <Link key={key} href={`/admin/requests?status=${key}`} className="group block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-charcoal transition-colors group-hover:text-navy">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="w-6 text-right text-sm font-bold text-navy">
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="mb-5 font-bold text-navy">Quick Actions</h2>
          <div className="space-y-3">
            {[
              {
                href: "/admin/requests?status=new",
                icon: AlertCircle,
                label: "Review New Requests",
                desc: "Pending assignment",
                color: "text-amber-600 bg-amber-50",
              },
              {
                href: "/admin/accountants",
                icon: UserCheck,
                label: "Manage Accountants",
                desc: "Add or assign staff",
                color: "text-indigo-600 bg-indigo-50",
              },
              {
                href: "/admin/blog",
                icon: MessageSquare,
                label: "Publish Blog Post",
                desc: "Content management",
                color: "text-teal bg-teal-50",
              },
              {
                href: "/admin/consultations",
                icon: Calendar,
                label: "View Consultations",
                desc: "Pending bookings",
                color: "text-purple-600 bg-purple-50",
              },
              {
                href: "/admin/content",
                icon: FileText,
                label: "Edit Website Content",
                desc: "Update homepage and pages",
                color: "text-blue-600 bg-blue-50",
              },
            ].map(({ href, icon: Icon, label, desc, color }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-lightgray"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy transition-colors group-hover:text-teal">
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="ml-auto shrink-0 text-gray-300 transition-colors group-hover:text-teal"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-navy">
              <TrendingUp size={16} className="text-teal" />
              Recent Requests
            </h2>
            <Link
              href="/admin/requests"
              className="flex items-center gap-1 text-xs font-medium text-teal hover:underline"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <div className="py-8 text-center">
              <FileText size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/admin/requests/${request.id}`}
                  className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-lightgray"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-sm font-bold text-navy">
                    {(request.requester_name || request.requester_email || "R")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">
                      {request.requester_name || request.requester_email || "Unknown requester"}
                    </p>
                    <p className="truncate text-xs text-gray-400">{request.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-lightgray px-2 py-0.5 text-xs font-medium text-charcoal">
                      {titleCase(request.status)}
                    </span>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(request.created_at || request.submitted_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-navy">
              <Calendar size={16} className="text-teal" />
              Pending Consultations
            </h2>
            <Link
              href="/admin/consultations"
              className="flex items-center gap-1 text-xs font-medium text-teal hover:underline"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {pendingConsultations.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No pending consultations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingConsultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-lightgray"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-sm font-bold text-teal">
                    {consultation.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy">
                      {consultation.full_name}
                    </p>
                    <p className="text-xs text-gray-400">{consultation.subject}</p>
                    {consultation.preferred_date ? (
                      <p className="mt-0.5 text-xs font-medium text-teal">
                        {consultation.preferred_date}
                        {consultation.preferred_time
                          ? ` at ${consultation.preferred_time}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium capitalize text-purple-700">
                      {titleCase(consultation.preferred_contact_method)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
