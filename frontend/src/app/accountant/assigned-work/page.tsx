"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Search } from "lucide-react";

import {
  AccountantAssignmentsTable,
  type AccountantAssignmentListItem,
} from "@/components/accountant/accountant-assignments-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";

export default function AccountantAssignedWorkPage() {
  const [assignments, setAssignments] = useState<AccountantAssignmentListItem[]>([]);
  const [search, setSearch] = useState("");
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
          setAssignments(extractItems<AccountantAssignmentListItem>(result.data));
        }
      } catch (loadError) {
        if (!cancelled) {
          setAssignments([]);
          setError(getSafeErrorMessage(loadError, "Assigned work could not be loaded."));
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

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) =>
      [
        assignment.title,
        assignment.service_request_title,
        assignment.service_request_reference,
        assignment.status,
        assignment.priority,
        assignment.notes,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [assignments, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Assigned work
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Your active assignments</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Filter your workload, open details, and keep status updates current.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Assignment list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by request, status, priority, or notes"
            leftIcon={<Search className="h-4 w-4" />}
          />

          {isLoading ? (
            <LoadingState
              title="Loading assignments"
              description="Fetching your assigned work items."
            />
          ) : error ? (
            <EmptyState
              title="Assigned work unavailable"
              description={error}
              icon={<FolderKanban className="h-5 w-5" />}
            />
          ) : (
            <AccountantAssignmentsTable assignments={filteredAssignments} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
