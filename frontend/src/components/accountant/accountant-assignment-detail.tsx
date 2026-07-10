"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { DetailRow } from "@/components/common/detail-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, titleCase } from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";
import type { AssignmentStatus } from "@/types/api";

export type AccountantAssignmentDetail = {
  id: string;
  title?: string;
  service_request_title?: string;
  service_request_reference?: string;
  status: string;
  priority?: string;
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
};

const assignmentStatuses: AssignmentStatus[] = [
  "assigned",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

type AccountantAssignmentDetailProps = {
  assignment: AccountantAssignmentDetail;
  onUpdated?: (assignment: AccountantAssignmentDetail) => void;
};

export function AccountantAssignmentDetail({
  assignment,
  onUpdated,
}: AccountantAssignmentDetailProps) {
  const [status, setStatus] = useState(assignment.status);
  const [notes, setNotes] = useState(assignment.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await api.patch(endpoints.accountant.assignmentStatus(assignment.id), {
        status,
        notes: notes.trim() || undefined,
      });

      const nextAssignment = {
        ...assignment,
        status,
        notes: notes.trim(),
      };

      onUpdated?.(nextAssignment);
      toast.success("Assignment updated successfully.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Unable to update this assignment."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
      <Card>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
                {assignment.service_request_reference || "Assigned work"}
              </p>
              <CardTitle className="mt-2">
                {assignment.title || assignment.service_request_title || "Assignment detail"}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge type="assignment" value={assignment.status} />
              <StatusBadge type="priority" value={assignment.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
          <dl>
            <DetailRow label="Status" value={titleCase(assignment.status)} />
            <DetailRow label="Priority" value={titleCase(assignment.priority)} />
            <DetailRow label="Due date" value={formatDateTime(assignment.due_date)} />
            <DetailRow label="Started" value={formatDateTime(assignment.started_at)} />
          </dl>
          <dl>
            <DetailRow label="Completed" value={formatDateTime(assignment.completed_at)} />
            <DetailRow label="Created" value={formatDateTime(assignment.created_at)} />
            <DetailRow label="Updated" value={formatDateTime(assignment.updated_at)} />
          </dl>
          <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Work notes</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {assignment.internal_notes || assignment.notes || "No notes have been added yet."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Update progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={assignmentStatuses.map((option) => ({
                label: titleCase(option),
                value: option,
              }))}
            />
            <Textarea
              label="Progress notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Share what has been completed, blocked, or needs review."
            />
            <Button
              type="submit"
              className="w-full"
              isLoading={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save progress
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
