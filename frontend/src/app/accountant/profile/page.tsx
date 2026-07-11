"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, ShieldCheck, User2 } from "lucide-react";

import { DetailRow } from "@/components/common/detail-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  formatDateTime,
  formatEmailForDisplay,
  formatEmpty,
  formatPhoneForDisplay,
} from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";

type AccountantProfile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

export default function AccountantProfilePage() {
  const [profile, setProfile] = useState<AccountantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<AccountantProfile>(endpoints.accountant.profile);

        if (!cancelled) {
          setProfile(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setProfile(null);
          setError(getSafeErrorMessage(loadError, "Your profile could not be loaded."));
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
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold">My accountant profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Account details from your Kivu Advisory account.
        </p>
      </div>

      {isLoading ? (
        <LoadingState title="Loading profile" description="Fetching your account details." />
      ) : error || !profile ? (
        <EmptyState
          title="Profile unavailable"
          description={error || "This profile could not be found."}
          icon={<User2 className="h-5 w-5" />}
        />
      ) : (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{profile.full_name}</CardTitle>
                <p className="mt-2 text-sm text-slate-600">
                  Account information from your authenticated session.
                </p>
              </div>
              <StatusBadge type="active" value={profile.is_active} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-8 pt-6 lg:grid-cols-2">
            <dl>
              <DetailRow
                label="Full name"
                value={
                  <span className="inline-flex items-center gap-2">
                    <User2 className="h-4 w-4 text-slate-400" />
                    {formatEmpty(profile.full_name)}
                  </span>
                }
              />
              <DetailRow
                label="Email"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {formatEmailForDisplay(profile.email)}
                  </span>
                }
              />
              <DetailRow
                label="Phone"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {formatPhoneForDisplay(profile.phone)}
                  </span>
                }
              />
            </dl>

            <dl>
              <DetailRow label="Last login" value={formatDateTime(profile.last_login_at)} />
              <DetailRow label="Member since" value={formatDateTime(profile.created_at)} />
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#092B44]" />
            Profile editing status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm leading-6 text-slate-600">
            This page is read-only. Profile updates for accountants are managed
            by an administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
