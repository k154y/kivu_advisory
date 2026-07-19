"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, titleCase } from "@/lib/format";
import { extractItems, extractPaginationInfo, getSafeErrorMessage } from "@/lib/portal";

type AuditLogEntry = {
  id: string;
  actor_user_id?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

const entityTypeOptions = [
  { label: "All entity types", value: "" },
  { label: "Service requests", value: "service_request" },
  { label: "Assignments", value: "assignment" },
  { label: "Accountants", value: "accountant" },
  { label: "Staff", value: "staff" },
  { label: "Services", value: "service" },
  { label: "Blog", value: "blog" },
  { label: "Consultations", value: "consultation" },
];

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get(
          endpoints.admin.auditLog({
            entity_type: entityType || undefined,
            page,
            page_size: 20,
          }),
        );

        if (!cancelled) {
          setEntries(extractItems<AuditLogEntry>(result.data));
          setTotalPages(extractPaginationInfo(result.data).totalPages);
        }
      } catch (loadError) {
        if (!cancelled) {
          setEntries([]);
          setError(getSafeErrorMessage(loadError, "Audit log entries could not be loaded."));
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
  }, [entityType, page]);

  const actionLabel = useMemo(
    () => (action: string) => titleCase(action.replace(/\./g, " ")),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Audit Log
        </p>
        <h1 className="mt-2 text-3xl font-semibold">System activity log</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Tracks key administrative actions: status changes, assignments, and
          account/content management across the platform.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 md:flex-row md:items-center md:justify-between">
          <CardTitle>Activity</CardTitle>
          <div className="w-full md:w-64">
            <Select
              value={entityType}
              onChange={(event) => {
                setPage(1);
                setEntityType(event.target.value);
              }}
              options={entityTypeOptions}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState
              title="Loading activity"
              description="Fetching recent audit log entries."
            />
          ) : error ? (
            <EmptyState
              title="Audit log unavailable"
              description={error}
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          ) : entries.length === 0 ? (
            <EmptyState
              title="No activity recorded yet"
              description="Key actions like status changes, assignments, and account management will appear here as they happen."
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actor role</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {actionLabel(entry.action)}
                      </TableCell>
                      <TableCell>{titleCase(entry.entity_type)}</TableCell>
                      <TableCell className="max-w-md truncate text-slate-600">
                        {entry.description || "—"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {entry.actor_role || "—"}
                      </TableCell>
                      <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
