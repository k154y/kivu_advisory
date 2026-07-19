import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEmpty, titleCase, truncateText } from "@/lib/format";
import { routes } from "@/lib/routes";

export type AccountantAssignmentListItem = {
  id: string;
  title?: string;
  service_request_title?: string;
  service_request_reference?: string;
  status: string;
  priority?: string;
  due_date?: string | null;
  created_at?: string;
  notes?: string;
};

type AccountantAssignmentsTableProps = {
  assignments: AccountantAssignmentListItem[];
};

export function AccountantAssignmentsTable({
  assignments,
}: AccountantAssignmentsTableProps) {
  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No assigned work yet"
        description="Assignments from admin will appear here when they are available."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assignment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => (
          <TableRow key={assignment.id}>
            <TableCell>
              <div>
                <p className="font-semibold text-slate-900">
                  {assignment.title ||
                    assignment.service_request_title ||
                    formatEmpty(assignment.service_request_reference)}
                </p>
                <p className="text-xs text-slate-500">
                  {assignment.service_request_reference || "Assigned work item"}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <StatusBadge type="assignment" value={assignment.status} />
            </TableCell>
            <TableCell>{titleCase(assignment.priority)}</TableCell>
            <TableCell>{formatDate(assignment.due_date || assignment.created_at)}</TableCell>
            <TableCell>{truncateText(assignment.notes, 60)}</TableCell>
            <TableCell className="text-right">
              <Link href={routes.accountant.assignmentDetail(assignment.id)}>
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Open
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
