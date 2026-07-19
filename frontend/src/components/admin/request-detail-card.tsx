"use client";

import { FormEvent, useState } from "react";
import { Mail, Pencil, Phone, Save, User2, WalletCards, X } from "lucide-react";
import { toast } from "sonner";

import { DetailRow } from "@/components/common/detail-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import {
  formatDateTime,
  formatEmailForDisplay,
  formatEmpty,
  formatPhoneForDisplay,
  formatReference,
  titleCase,
} from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";
import type { ContactMethod, Priority, ServiceRequestStatus } from "@/types/api";

const priorityOptions: Priority[] = ["low", "normal", "high", "urgent"];
const contactMethodOptions: ContactMethod[] = ["email", "phone", "whatsapp"];

export type AdminRequestDetail = {
  id: string;
  reference_number?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_company?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  source: string;
  preferred_contact_method?: string;
  admin_notes?: string;
  internal_notes?: string;
  created_at?: string;
  submitted_at?: string;
};

const statusOptions: ServiceRequestStatus[] = [
  "new",
  "pending",
  "in_review",
  "waiting_client",
  "in_progress",
  "completed",
  "cancelled",
];

type RequestDetailCardProps = {
  request: AdminRequestDetail;
  onUpdated?: (nextRequest: AdminRequestDetail) => void;
};

export function RequestDetailCard({
  request,
  onUpdated,
}: RequestDetailCardProps) {
  const [status, setStatus] = useState(request.status);
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || "");
  const [internalNotes, setInternalNotes] = useState(request.internal_notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    title: request.title,
    description: request.description,
    requester_name: request.requester_name || "",
    requester_email: request.requester_email || "",
    requester_phone: request.requester_phone || "",
    requester_company: request.requester_company || "",
    priority: request.priority,
    preferred_contact_method: request.preferred_contact_method || "email",
  });

  const updateDetailsForm = <K extends keyof typeof detailsForm>(
    key: K,
    value: (typeof detailsForm)[K],
  ) => {
    setDetailsForm((current) => ({ ...current, [key]: value }));
  };

  const openEditDetails = () => {
    setDetailsForm({
      title: request.title,
      description: request.description,
      requester_name: request.requester_name || "",
      requester_email: request.requester_email || "",
      requester_phone: request.requester_phone || "",
      requester_company: request.requester_company || "",
      priority: request.priority,
      preferred_contact_method: request.preferred_contact_method || "email",
    });
    setIsEditingDetails(true);
  };

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingDetails(true);

    try {
      await api.put(endpoints.admin.serviceRequestDetail(request.id), {
        requester_name: detailsForm.requester_name.trim() || undefined,
        requester_email: detailsForm.requester_email.trim() || undefined,
        requester_phone: detailsForm.requester_phone.trim() || undefined,
        requester_company: detailsForm.requester_company.trim() || undefined,
        title: detailsForm.title.trim(),
        description: detailsForm.description.trim(),
        priority: detailsForm.priority,
        preferred_contact_method: detailsForm.preferred_contact_method,
        admin_notes: request.admin_notes || undefined,
        internal_notes: request.internal_notes || undefined,
      });

      onUpdated?.({
        ...request,
        ...detailsForm,
        title: detailsForm.title.trim(),
        description: detailsForm.description.trim(),
      });

      toast.success("Request details updated successfully.");
      setIsEditingDetails(false);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Unable to update request details."));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await api.patch(endpoints.admin.serviceRequestStatus(request.id), {
        status,
        admin_notes: adminNotes.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
      });

      const nextRequest = {
        ...request,
        status,
        admin_notes: adminNotes.trim(),
        internal_notes: internalNotes.trim(),
      };

      onUpdated?.(nextRequest);
      toast.success("Service request updated successfully.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Unable to update service request."));
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
                {formatReference(request.reference_number)}
              </p>
              <CardTitle className="mt-2">{request.title}</CardTitle>
              <p className="mt-2 text-sm text-slate-600">
                Submitted from {titleCase(request.source)} on{" "}
                {formatDateTime(request.submitted_at || request.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge type="service-request" value={request.status} />
              <StatusBadge type="priority" value={request.priority} />
              {!isEditingDetails ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openEditDetails}
                  leftIcon={<Pencil className="h-3.5 w-3.5" />}
                >
                  Edit details
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
          {isEditingDetails ? (
            <form
              onSubmit={handleDetailsSubmit}
              className="grid gap-4 lg:col-span-2 lg:grid-cols-2"
            >
              <Input
                label="Title"
                value={detailsForm.title}
                onChange={(event) => updateDetailsForm("title", event.target.value)}
              />
              <Input
                label="Requester name"
                value={detailsForm.requester_name}
                onChange={(event) =>
                  updateDetailsForm("requester_name", event.target.value)
                }
              />
              <Input
                label="Requester email"
                type="email"
                value={detailsForm.requester_email}
                onChange={(event) =>
                  updateDetailsForm("requester_email", event.target.value)
                }
              />
              <Input
                label="Requester phone"
                value={detailsForm.requester_phone}
                onChange={(event) =>
                  updateDetailsForm("requester_phone", event.target.value)
                }
              />
              <Input
                label="Requester company"
                value={detailsForm.requester_company}
                onChange={(event) =>
                  updateDetailsForm("requester_company", event.target.value)
                }
              />
              <Select
                label="Priority"
                value={detailsForm.priority}
                onChange={(event) => updateDetailsForm("priority", event.target.value)}
                options={priorityOptions.map((option) => ({
                  label: titleCase(option),
                  value: option,
                }))}
              />
              <Select
                label="Preferred contact method"
                value={detailsForm.preferred_contact_method}
                onChange={(event) =>
                  updateDetailsForm("preferred_contact_method", event.target.value)
                }
                options={contactMethodOptions.map((option) => ({
                  label: titleCase(option),
                  value: option,
                }))}
              />
              <div className="lg:col-span-2">
                <Textarea
                  label="Description"
                  value={detailsForm.description}
                  onChange={(event) =>
                    updateDetailsForm("description", event.target.value)
                  }
                />
              </div>
              <div className="flex gap-3 lg:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingDetails(false)}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSavingDetails} leftIcon={<Save className="h-4 w-4" />}>
                  Save details
                </Button>
              </div>
            </form>
          ) : (
          <>
          <dl>
            <DetailRow
              label="Requester"
              value={
                <span className="inline-flex items-center gap-2">
                  <User2 className="h-4 w-4 text-slate-400" />
                  {formatEmpty(request.requester_name)}
                </span>
              }
            />
            <DetailRow
              label="Email"
              value={
                request.requester_email ? (
                  <a
                    href={`mailto:${request.requester_email}`}
                    className="inline-flex items-center gap-2 text-[#0F2742] underline-offset-4 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {formatEmailForDisplay(request.requester_email)}
                  </a>
                ) : undefined
              }
            />
            <DetailRow
              label="Phone"
              value={
                request.requester_phone ? (
                  <a
                    href={`tel:${request.requester_phone}`}
                    className="inline-flex items-center gap-2 text-[#0F2742] underline-offset-4 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {formatPhoneForDisplay(request.requester_phone)}
                  </a>
                ) : undefined
              }
            />
            <DetailRow
              label="Company"
              value={
                <span className="inline-flex items-center gap-2">
                  <WalletCards className="h-4 w-4 text-slate-400" />
                  {formatEmpty(request.requester_company)}
                </span>
              }
            />
          </dl>

          <dl>
            <DetailRow label="Source" value={titleCase(request.source)} />
            <DetailRow label="Priority" value={titleCase(request.priority)} />
            <DetailRow label="Status" value={titleCase(request.status)} />
            <DetailRow
              label="Preferred contact"
              value={titleCase(request.preferred_contact_method)}
            />
            <DetailRow label="Created" value={formatDateTime(request.created_at)} />
          </dl>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Description</h3>
            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {request.description}
            </div>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Update request</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={statusOptions.map((option) => ({
                label: titleCase(option),
                value: option,
              }))}
            />
            <Textarea
              label="Client-facing notes"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder="Add visible update notes for the client."
            />
            <Textarea
              label="Internal notes"
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Add internal handling notes for the team."
            />
            <Button
              type="submit"
              className="w-full"
              isLoading={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save update
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
