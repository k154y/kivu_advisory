"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Mail, Pencil, Phone, Save, User2, X } from "lucide-react";
import { toast } from "sonner";

import { DetailRow } from "@/components/common/detail-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  formatDateTime,
  formatEmailForDisplay,
  formatEmpty,
  formatPhoneForDisplay,
} from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";
import type { PublicClient, UpdateClientProfileRequest } from "@/types/api";

const emptyForm: UpdateClientProfileRequest = {
  company_name: "",
  tin: "",
  business_type: "",
  address: "",
  city: "",
  country: "",
  website: "",
  notes: "",
};

export default function ClientProfilePage() {
  const { user } = useAuth();

  const [client, setClient] = useState<PublicClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<UpdateClientProfileRequest>(emptyForm);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<PublicClient>(endpoints.client.profile);

        if (!cancelled) {
          setClient(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setClient(null);
          setError(getSafeErrorMessage(loadError, "Your client profile could not be loaded."));
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

  const updateForm = <K extends keyof UpdateClientProfileRequest>(
    key: K,
    value: UpdateClientProfileRequest[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openEdit = () => {
    setForm({
      company_name: client?.company_name || "",
      tin: client?.tin || "",
      business_type: client?.business_type || "",
      address: client?.address || "",
      city: client?.city || "",
      country: client?.country || "",
      website: client?.website || "",
      notes: client?.notes || "",
    });
    setIsEditing(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const result = await api.put<PublicClient>(endpoints.client.profile, form);

      setClient(result.data);
      toast.success("Business profile updated successfully.");
      setIsEditing(false);
    } catch (submitError) {
      toast.error(getSafeErrorMessage(submitError, "Unable to update your business profile."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold">My client profile</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Account and business details on file with Kivu Advisory.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>{user?.full_name || "Client profile"}</CardTitle>
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
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#092B44]" />
            Business profile
          </CardTitle>
          {!isEditing && client ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openEdit}
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState
              title="Loading business profile"
              description="Fetching your company details."
            />
          ) : error || !client ? (
            <EmptyState
              title="Business profile unavailable"
              description={error || "This profile could not be found."}
              icon={<Building2 className="h-5 w-5" />}
            />
          ) : isEditing ? (
            <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
              <Input
                label="Company name"
                value={form.company_name}
                onChange={(event) => updateForm("company_name", event.target.value)}
              />
              <Input
                label="TIN"
                value={form.tin}
                onChange={(event) => updateForm("tin", event.target.value)}
              />
              <Input
                label="Business type"
                value={form.business_type}
                onChange={(event) => updateForm("business_type", event.target.value)}
              />
              <Input
                label="Website"
                value={form.website}
                onChange={(event) => updateForm("website", event.target.value)}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(event) => updateForm("address", event.target.value)}
              />
              <Input
                label="City"
                value={form.city}
                onChange={(event) => updateForm("city", event.target.value)}
              />
              <Input
                label="Country"
                value={form.country}
                onChange={(event) => updateForm("country", event.target.value)}
              />
              <div className="lg:col-span-2">
                <Textarea
                  label="Notes"
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                />
              </div>
              <div className="flex gap-3 lg:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                  Save changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <dl>
                <DetailRow label="Company name" value={formatEmpty(client.company_name)} />
                <DetailRow label="TIN" value={formatEmpty(client.tin)} />
                <DetailRow label="Business type" value={formatEmpty(client.business_type)} />
                <DetailRow label="Website" value={formatEmpty(client.website)} />
              </dl>
              <dl>
                <DetailRow
                  label="Location"
                  value={formatEmpty(
                    [client.address, client.city, client.country].filter(Boolean).join(", "),
                  )}
                />
                <DetailRow label="Notes" value={formatEmpty(client.notes)} />
                <DetailRow label="Updated" value={formatDateTime(client.updated_at)} />
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
