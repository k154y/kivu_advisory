"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FolderKanban } from "lucide-react";

import {
  AccountantDashboardSummary,
} from "@/components/accountant/accountant-dashboard-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";

type AssignmentSummaryItem = {
  id: string;
  status: string;
};

export default function AccountantDashboardPage() {
  const [assignments, setAssignments] = useState<AssignmentSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAssignments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get(endpoints.accountant.assignments({ page_size: 100 }));

        if (!cancelled) {
          setAssignments(extractItems<AssignmentSummaryItem>(result.data));
        }
      } catch (loadError) {
        if (!cancelled) {
          setAssignments([]);
          setError(
            getSafeErrorMessage(
              loadError,
              "Assigned work is unavailable right now.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    return assignments.reduce(
      (summary, assignment) => {
        summary.total += 1;

        if (assignment.status === "completed") {
          summary.completed += 1;
        } else if (assignment.status === "in_progress") {
          summary.inProgress += 1;
        } else {
          summary.assigned += 1;
        }

        return summary;
      },
      {
        total: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
      },
    );
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Accountant dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Assigned work overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Keep track of outstanding assignments and move work forward without losing context.
        </p>
      </div>

      {isLoading ? (
        <LoadingState
          title="Loading assignments"
          description="Preparing your work summary."
        />
      ) : error ? (
        <EmptyState
          title="Assignments unavailable"
          description={error}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      ) : (
        <>
          <AccountantDashboardSummary {...counts} />

          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">Assigned work</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Review status, due dates, and notes across your current assignments.
                </p>
                <div className="mt-4">
                  <Link href={routes.accountant.assignedWork}>
                    <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Open work list
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">Messages</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Check communication activity related to current work when backend messages are available.
                </p>
                <div className="mt-4">
                  <Link href={routes.accountant.messages}>
                    <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                      Open messages
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
