import { Building2, Globe, Mail, MapPin, Phone, StickyNote } from "lucide-react";

import { DetailRow } from "@/components/common/detail-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatEmpty, formatPhoneForDisplay } from "@/lib/format";

export type AdminClientDetail = {
  id: string;
  full_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  tin?: string;
  business_type?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ClientDetailCardProps = {
  client: AdminClientDetail;
};

export function ClientDetailCard({ client }: ClientDetailCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{client.full_name || client.company_name || "Client profile"}</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              {client.company_name || "Business information and account overview"}
            </p>
          </div>
          <StatusBadge type="active" value={client.is_active ?? true} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-8 pt-6 lg:grid-cols-2">
        <dl>
          <DetailRow label="Full name" value={client.full_name} />
          <DetailRow
            label="Company"
            value={
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                {formatEmpty(client.company_name)}
              </span>
            }
          />
          <DetailRow
            label="Email"
            value={
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {formatEmpty(client.email)}
              </span>
            }
          />
          <DetailRow
            label="Phone"
            value={
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                {formatPhoneForDisplay(client.phone)}
              </span>
            }
          />
          <DetailRow label="WhatsApp" value={formatPhoneForDisplay(client.whatsapp)} />
        </dl>

        <dl>
          <DetailRow label="TIN" value={client.tin} />
          <DetailRow label="Business type" value={client.business_type} />
          <DetailRow
            label="Location"
            value={
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {formatEmpty(
                  [client.address, client.city, client.country]
                    .filter(Boolean)
                    .join(", "),
                )}
              </span>
            }
          />
          <DetailRow
            label="Website"
            value={
              client.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[#0F2742] underline-offset-4 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {client.website}
                </a>
              ) : undefined
            }
          />
          <DetailRow label="Created" value={formatDateTime(client.created_at)} />
          <DetailRow label="Updated" value={formatDateTime(client.updated_at)} />
        </dl>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <StickyNote className="h-4 w-4 text-[#C99A35]" />
              Internal notes
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {client.notes || "No internal notes are available for this client yet."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
