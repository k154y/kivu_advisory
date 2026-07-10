import Link from "next/link";
import { CheckCircle2, Clock3, FolderKanban, PlayCircle } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type AccountantDashboardSummaryProps = {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
};

export function AccountantDashboardSummary({
  total,
  assigned,
  inProgress,
  completed,
}: AccountantDashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total assignments" value={total} icon={<FolderKanban className="h-5 w-5" />} />
      <StatCard title="Assigned" value={assigned} icon={<Clock3 className="h-5 w-5" />} />
      <StatCard title="In progress" value={inProgress} icon={<PlayCircle className="h-5 w-5" />} />
      <StatCard
        title="Completed"
        value={completed}
        icon={<CheckCircle2 className="h-5 w-5" />}
        footer={
          <Link href={routes.accountant.assignedWork}>
            <Button variant="outline" size="sm">Open assigned work</Button>
          </Link>
        }
      />
    </div>
  );
}
