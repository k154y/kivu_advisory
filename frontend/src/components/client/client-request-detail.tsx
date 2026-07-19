import { DetailRow } from "@/components/common/detail-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatReference, titleCase } from "@/lib/format";

export type ClientRequestDetailItem = {
  id: string;
  reference_number?: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
  admin_notes?: string;
};

type ClientRequestDetailProps = {
  request: ClientRequestDetailItem;
};

export function ClientRequestDetail({ request }: ClientRequestDetailProps) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
              {formatReference(request.reference_number)}
            </p>
            <CardTitle className="mt-2">{request.title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <StatusBadge type="service-request" value={request.status} />
            <StatusBadge type="priority" value={request.priority} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
        <dl>
          <DetailRow label="Status" value={titleCase(request.status)} />
          <DetailRow label="Priority" value={titleCase(request.priority)} />
          <DetailRow label="Source" value={titleCase(request.source)} />
        </dl>
        <dl>
          <DetailRow label="Submitted" value={formatDateTime(request.submitted_at || request.created_at)} />
          <DetailRow label="Last updated" value={formatDateTime(request.updated_at)} />
        </dl>
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Request description</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{request.description}</p>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Kivu Advisory notes</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {request.admin_notes || "No client-facing notes have been shared for this request yet."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
