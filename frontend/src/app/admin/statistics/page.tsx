"use client";

import { useEffect, useState } from "react";
import { BarChart2, Briefcase, Calendar, UserCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { titleCase } from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";

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

function StatusBreakdown({
  title,
  total,
  byStatus,
}: {
  title: string;
  total: number;
  byStatus: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-100">
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-slate-500">{total} total</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {Object.entries(byStatus).map(([status, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={status}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-700">{titleCase(status)}</span>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0F2742]"
                  style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<DashboardStatsResponse>(
          endpoints.admin.dashboardStats,
        );

        if (!cancelled) {
          setStats(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setStats(null);
          setError(getSafeErrorMessage(loadError, "Statistics could not be loaded."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Statistics
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Business statistics</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Accurate totals and status breakdowns across service requests and
          consultations, drawn directly from the backend.
        </p>
      </div>

      {isLoading ? (
        <LoadingState
          title="Loading statistics"
          description="Fetching the latest business statistics."
        />
      ) : error || !stats ? (
        <EmptyState
          title="Statistics unavailable"
          description={error || "Statistics could not be loaded."}
          icon={<BarChart2 className="h-5 w-5" />}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Service Requests",
                value: stats.service_requests.total,
                icon: Briefcase,
              },
              {
                label: "Consultations",
                value: stats.consultations.total,
                icon: Calendar,
              },
              {
                label: "Clients",
                value: stats.clients.total,
                icon: Users,
              },
              {
                label: "Accountants",
                value: stats.accountants.total,
                icon: UserCheck,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-gray-100 bg-white p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {label}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy">
                    <Icon size={16} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-navy">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <StatusBreakdown
              title="Service requests by status"
              total={stats.service_requests.total}
              byStatus={stats.service_requests.by_status}
            />
            <StatusBreakdown
              title="Consultations by status"
              total={stats.consultations.total}
              byStatus={stats.consultations.by_status}
            />
          </div>
        </>
      )}
    </div>
  );
}
