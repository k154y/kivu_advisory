"use client";

import { Mail, Phone, ShieldCheck, User2 } from "lucide-react";

import { DetailRow } from "@/components/common/detail-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import {
  formatDateTime,
  formatEmailForDisplay,
  formatEmpty,
  formatPhoneForDisplay,
} from "@/lib/format";

export default function AdminProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold">My administrator profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Account details from your authenticated session. Profile editing is
          read-only until a dedicated admin profile update endpoint is confirmed.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>{user?.full_name || "Administrator profile"}</CardTitle>
              <p className="mt-2 text-sm text-slate-600">
                Account information from your authenticated session.
              </p>
            </div>
            <StatusBadge type="active" value={user?.is_active ?? false} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-8 pt-6 lg:grid-cols-2">
          <dl>
            <DetailRow
              label="Full name"
              value={
                <span className="inline-flex items-center gap-2">
                  <User2 className="h-4 w-4 text-slate-400" />
                  {formatEmpty(user?.full_name)}
                </span>
              }
            />
            <DetailRow
              label="Email"
              value={
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {formatEmailForDisplay(user?.email)}
                </span>
              }
            />
            <DetailRow label="Role" value={formatEmpty(user?.role)} />
          </dl>

          <dl>
            <DetailRow
              label="Phone"
              value={
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {formatPhoneForDisplay(user?.phone)}
                </span>
              }
            />
            <DetailRow label="Member since" value={formatDateTime(user?.created_at)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#092B44]" />
            Profile editing status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm leading-6 text-slate-600">
            This page is intentionally read-only because a dedicated admin profile
            save endpoint is not confirmed in the current backend contract. Once the
            backend exposes supported update behavior, this page can enable editing
            without affecting existing authentication logic.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
