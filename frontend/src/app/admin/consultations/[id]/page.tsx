"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  loadAccountants,
  type AdminAccountant,
} from "@/lib/admin-accountants";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

type ConsultationStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "in_progress"
  | "closed"
  | "cancelled";

type ConsultationPriority = "low" | "normal" | "high" | "urgent";

type ConsultationType =
  | "general"
  | "accounting"
  | "tax"
  | "audit"
  | "business_advisory"
  | "legal"
  | "other";

type PreferredContactMethod = "email" | "phone" | "whatsapp";

type Consultation = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  subject?: string;
  message?: string;
  consultation_type?: ConsultationType | string;
  preferred_contact_method?: PreferredContactMethod | string;
  preferred_date?: string | null;
  preferred_time?: string;
  status: ConsultationStatus | string;
  priority?: ConsultationPriority | string;
  assigned_to_user_id?: string | null;
  handled_by_user_id?: string | null;
  admin_notes?: string;
  follow_up_notes?: string;
  created_at: string;
  updated_at: string;
};

type ConsultationForm = {
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company_name: string;
  subject: string;
  message: string;
  consultation_type: string;
  preferred_contact_method: string;
  preferred_date: string;
  preferred_time: string;
  priority: string;
  assigned_to_user_id: string;
  handled_by_user_id: string;
  admin_notes: string;
  follow_up_notes: string;
};

type ApiWithDelete = typeof api & {
  del?: <T>(path: string) => Promise<T>;
  delete?: <T>(path: string) => Promise<T>;
};

const STATUSES: ConsultationStatus[] = [
  "new",
  "contacted",
  "scheduled",
  "in_progress",
  "closed",
  "cancelled",
];

const PRIORITIES: ConsultationPriority[] = ["low", "normal", "high", "urgent"];

const CONSULTATION_TYPES: ConsultationType[] = [
  "general",
  "accounting",
  "tax",
  "audit",
  "business_advisory",
  "legal",
  "other",
];

const CONTACT_METHODS: PreferredContactMethod[] = [
  "email",
  "phone",
  "whatsapp",
];

const EMPTY_FORM: ConsultationForm = {
  full_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  company_name: "",
  subject: "",
  message: "",
  consultation_type: "general",
  preferred_contact_method: "phone",
  preferred_date: "",
  preferred_time: "",
  priority: "normal",
  assigned_to_user_id: "",
  handled_by_user_id: "",
  admin_notes: "",
  follow_up_notes: "",
};

function getParamId(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getConsultation(response: unknown): Consultation | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const direct = response as Partial<Consultation>;
  if (typeof direct.id === "string") {
    return direct as Consultation;
  }

  const wrapped = response as {
    data?: Consultation;
    item?: Consultation;
  };

  if (wrapped.data?.id) {
    return wrapped.data;
  }

  if (wrapped.item?.id) {
    return wrapped.item;
  }

  return null;
}

function toDateInput(value?: string | null) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => {
    return letter.toUpperCase();
  });
}

function getStatusColor(status: string) {
  if (status === "new") return "bg-blue-50 text-blue-700";
  if (status === "contacted") return "bg-sky-50 text-sky-700";
  if (status === "scheduled") return "bg-gold-50 text-gold-600";
  if (status === "in_progress") return "bg-purple-50 text-purple-700";
  if (status === "closed") return "bg-teal-50 text-teal";
  if (status === "cancelled") return "bg-red-50 text-red-600";

  return "bg-gray-100 text-gray-600";
}

function getPriorityColor(priority: string) {
  if (priority === "urgent") return "bg-red-50 text-red-600";
  if (priority === "high") return "bg-gold-50 text-gold-600";
  if (priority === "normal") return "bg-blue-50 text-blue-700";
  if (priority === "low") return "bg-gray-100 text-gray-600";

  return "bg-gray-100 text-gray-600";
}

function consultationToForm(consultation: Consultation): ConsultationForm {
  return {
    full_name: consultation.full_name || "",
    email: consultation.email || "",
    phone: consultation.phone || "",
    whatsapp: consultation.whatsapp || "",
    company_name: consultation.company_name || "",
    subject: consultation.subject || "",
    message: consultation.message || "",
    consultation_type: consultation.consultation_type || "general",
    preferred_contact_method:
      consultation.preferred_contact_method || "phone",
    preferred_date: toDateInput(consultation.preferred_date),
    preferred_time: consultation.preferred_time || "",
    priority: consultation.priority || "normal",
    assigned_to_user_id: consultation.assigned_to_user_id || "",
    handled_by_user_id: consultation.handled_by_user_id || "",
    admin_notes: consultation.admin_notes || "",
    follow_up_notes: consultation.follow_up_notes || "",
  };
}

function buildDetailPayload(form: ConsultationForm) {
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    whatsapp: form.whatsapp.trim(),
    company_name: form.company_name.trim(),
    subject: form.subject.trim(),
    message: form.message.trim(),
    consultation_type: form.consultation_type,
    preferred_contact_method: form.preferred_contact_method,
    preferred_date: form.preferred_date || null,
    preferred_time: form.preferred_time.trim(),
    priority: form.priority,
    assigned_to_user_id: form.assigned_to_user_id || null,
    handled_by_user_id: form.handled_by_user_id || null,
    admin_notes: form.admin_notes.trim(),
    follow_up_notes: form.follow_up_notes.trim(),
  };
}

async function deleteConsultation(path: string) {
  const apiClient = api as ApiWithDelete;

  if (apiClient.del) return apiClient.del(path);
  if (apiClient.delete) return apiClient.delete(path);

  throw new Error("API delete method is not available.");
}

export default function AdminConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = getParamId(params?.id);

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [form, setForm] = useState<ConsultationForm>(EMPTY_FORM);
  const [statusDraft, setStatusDraft] = useState<ConsultationStatus>("new");
  const [accountants, setAccountants] = useState<AdminAccountant[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const assignedAccountant = accountants.find(
    (accountant) => accountant.id === form.assigned_to_user_id,
  );

  const load = async () => {
    if (!id) return;

    setLoading(true);

    try {
      const [consultationResult, accountantResult] = await Promise.all([
        api.get<unknown>(
          `/admin/consultations/detail?id=${encodeURIComponent(id)}`,
        ),
        loadAccountants().catch(() => []),
      ]);

      const item = getConsultation(consultationResult.data);

      if (!item) {
        throw new Error("Consultation was not found.");
      }

      setConsultation(item);
      setForm(consultationToForm(item));
      setStatusDraft(item.status as ConsultationStatus);
      setAccountants(accountantResult);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load consultation details."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateForm = <K extends keyof ConsultationForm>(
    key: K,
    value: ConsultationForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!id) return;

    if (form.full_name.trim().length < 2) {
      toast.error("Client full name is required.");
      return;
    }

    if (!form.subject.trim()) {
      toast.error("Consultation subject is required.");
      return;
    }

    if (!form.message.trim()) {
      toast.error("Consultation message is required.");
      return;
    }

    setSavingDetails(true);

    try {
      await api.put(
        `/admin/consultations/detail?id=${encodeURIComponent(id)}`,
        buildDetailPayload(form),
      );

      toast.success("Consultation details saved.");
      await load();
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to save consultation details."),
      );
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!id) return;

    setSavingStatus(true);

    try {
      await api.patch(
        `/admin/consultations/status?id=${encodeURIComponent(id)}`,
        {
          status: statusDraft,
          admin_notes: form.admin_notes.trim(),
          follow_up_notes: form.follow_up_notes.trim(),
        },
      );

      toast.success("Consultation status updated.");
      await load();
    } catch (error) {
      toast.error(
        getSafeErrorMessage(
          error,
          "Database operation failed while updating consultation status.",
        ),
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!consultation) return;

    if (!window.confirm(`Delete consultation from ${consultation.full_name}?`)) {
      return;
    }

    setDeleting(true);

    try {
      await deleteConsultation(
        `/admin/consultations/detail?id=${encodeURIComponent(consultation.id)}`,
      );

      toast.success("Consultation deleted.");
      router.replace(routes.admin.consultations);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to delete consultation."),
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        Loading consultation details...
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-navy">
          Consultation not found
        </p>
        <Link
          href={routes.admin.consultations}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft size={15} />
          Back to consultations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Link
            href={routes.admin.consultations}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-navy"
          >
            <ArrowLeft size={15} />
            Back to consultations
          </Link>

          <h1 className="text-2xl font-bold text-navy">
            {consultation.full_name}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Created {formatDate(consultation.created_at)} · Last updated{" "}
            {formatDate(consultation.updated_at)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                consultation.status,
              )}`}
            >
              {getLabel(consultation.status)}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityColor(
                consultation.priority || "normal",
              )}`}
            >
              {getLabel(consultation.priority || "normal")}
            </span>

            {assignedAccountant ? (
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal">
                Assigned to {assignedAccountant.full_name}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                Not assigned
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:border-navy hover:text-navy"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 size={15} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSaveDetails}
          className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-bold text-navy">
              Consultation Details
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Edit client information, request details, notes, and accountant
              assignment.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Full Name *"
              value={form.full_name}
              onChange={(value) => updateForm("full_name", value)}
              icon="user"
            />

            <InputField
              label="Email"
              value={form.email}
              onChange={(value) => updateForm("email", value)}
              type="email"
              icon="mail"
            />

            <InputField
              label="Phone"
              value={form.phone}
              onChange={(value) => updateForm("phone", value)}
              icon="phone"
            />

            <InputField
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(value) => updateForm("whatsapp", value)}
              icon="phone"
            />

            <InputField
              label="Company Name"
              value={form.company_name}
              onChange={(value) => updateForm("company_name", value)}
            />

            <InputField
              label="Subject *"
              value={form.subject}
              onChange={(value) => updateForm("subject", value)}
            />

            <SelectField
              label="Consultation Type"
              value={form.consultation_type}
              onChange={(value) => updateForm("consultation_type", value)}
              options={CONSULTATION_TYPES}
            />

            <SelectField
              label="Preferred Contact Method"
              value={form.preferred_contact_method}
              onChange={(value) =>
                updateForm("preferred_contact_method", value)
              }
              options={CONTACT_METHODS}
            />

            <InputField
              label="Preferred Date"
              value={form.preferred_date}
              onChange={(value) => updateForm("preferred_date", value)}
              type="date"
              icon="calendar"
            />

            <InputField
              label="Preferred Time"
              value={form.preferred_time}
              onChange={(value) => updateForm("preferred_time", value)}
              type="time"
              icon="clock"
            />

            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(value) => updateForm("priority", value)}
              options={PRIORITIES}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal">
                Assign Accountant
              </label>
              <select
                value={form.assigned_to_user_id}
                onChange={(event) =>
                  updateForm("assigned_to_user_id", event.target.value)
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                <option value="">Not assigned</option>
                {accountants
                  .filter((accountant) => accountant.is_active)
                  .map((accountant) => (
                    <option key={accountant.id} value={accountant.id}>
                      {accountant.full_name} — {accountant.email}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Assignment is saved using the detail update endpoint, not the
                status endpoint.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">
              Message *
            </label>
            <textarea
              value={form.message}
              onChange={(event) => updateForm("message", event.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal">
                Admin Notes
              </label>
              <textarea
                value={form.admin_notes}
                onChange={(event) =>
                  updateForm("admin_notes", event.target.value)
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                placeholder="Internal notes for admin..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal">
                Follow-up Notes
              </label>
              <textarea
                value={form.follow_up_notes}
                onChange={(event) =>
                  updateForm("follow_up_notes", event.target.value)
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                placeholder="Follow-up action, call reminder, next step..."
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={savingDetails}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
            >
              <Save size={16} />
              {savingDetails ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-navy">Change Status</h2>
            <p className="mt-1 text-sm text-gray-500">
              Status update only changes status and notes. It does not assign
              accountants.
            </p>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-charcoal">
                Status
              </label>
              <select
                value={statusDraft}
                onChange={(event) =>
                  setStatusDraft(event.target.value as ConsultationStatus)
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveStatus}
              disabled={savingStatus || statusDraft === consultation.status}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {savingStatus ? "Updating..." : "Update Status"}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-navy">Contact Summary</h2>

            <div className="mt-5 space-y-4">
              <SummaryItem
                icon={<User size={16} />}
                label="Client"
                value={consultation.full_name}
              />

              <SummaryItem
                icon={<Mail size={16} />}
                label="Email"
                value={consultation.email || "Not provided"}
              />

              <SummaryItem
                icon={<Phone size={16} />}
                label="Phone"
                value={consultation.phone || "Not provided"}
              />

              <SummaryItem
                icon={<Calendar size={16} />}
                label="Preferred Date"
                value={formatDate(consultation.preferred_date)}
              />

              <SummaryItem
                icon={<Clock size={16} />}
                label="Preferred Time"
                value={consultation.preferred_time || "Not specified"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: "user" | "mail" | "phone" | "calendar" | "clock";
}) {
  const Icon =
    icon === "user"
      ? User
      : icon === "mail"
        ? Mail
        : icon === "phone"
          ? Phone
          : icon === "calendar"
            ? Calendar
            : icon === "clock"
              ? Clock
              : null;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

      <div className="relative">
        {Icon ? (
          <Icon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        ) : null}

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 ${
            Icon ? "pl-9" : ""
          }`}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-navy">
          {value}
        </p>
      </div>
    </div>
  );
}