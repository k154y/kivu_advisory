import { FileStack, Files, MessageSquareText } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";

type ClientDashboardSummaryProps = {
  requests: number;
  documents: number;
  messages: number;
};

export function ClientDashboardSummary({
  requests,
  documents,
  messages,
}: ClientDashboardSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title="My requests" value={requests} icon={<FileStack className="h-5 w-5" />} />
      <StatCard title="Documents" value={documents} icon={<Files className="h-5 w-5" />} />
      <StatCard title="Messages" value={messages} icon={<MessageSquareText className="h-5 w-5" />} />
    </div>
  );
}
