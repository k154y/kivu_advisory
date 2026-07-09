"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type ConsultationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

type Consultation = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  subject?: string;
  message?: string;
  consultation_type?: string;
  preferred_contact_method?: string;
  preferred_date?: string | null;
  preferred_time?: string;
  status: ConsultationStatus | string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
};

type ConsultationListResponse = {
  items: Consultation[];
};

type ConsultationFormState = {
  status: ConsultationStatus;
  admin_notes: string;
};

const statusOptions: ConsultationStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

function getConsultationItems(
  data: ConsultationListResponse | Consultation[],
) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function formatDate(value?: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not specified";

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

function getStatusClass(status: string) {
  if (status === "confirmed") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "completed") {
    return "bg-teal-50 text-teal";
  }

  if (status === "cancelled" || status === "rejected") {
    return "bg-red-50 text-red-600";
  }

  return "bg-gold-50 text-gold-600";
}

function getPreferredContact(consultation: Consultation) {
  return (
    consultation.preferred_contact_method ||
    (consultation.whatsapp ? "whatsapp" : "") ||
    (consultation.phone ? "phone" : "") ||
    (consultation.email ? "email" : "") ||
    "Not specified"
  );
}

export default function AdminConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const [form, setForm] = useState<ConsultationFormState>({
    status: "pending",
    admin_notes: "",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ConsultationStatus>(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const filteredConsultations = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return [...consultations]
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();

        return dateB - dateA;
      })
      .filter((consultation) => {
        const matchesSearch =
          !searchValue ||
          consultation.full_name.toLowerCase().includes(searchValue) ||
          (consultation.email || "").toLowerCase().includes(searchValue) ||
          (consultation.phone || "").toLowerCase().includes(searchValue) ||
          (consultation.company_name || "")
            .toLowerCase()
            .includes(searchValue) ||
          (consultation.subject || "").toLowerCase().includes(searchValue);

        const matchesStatus =
          statusFilter === "all" || consultation.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
  }, [consultations, search, statusFilter]);

  const loadConsultations = async () => {
    setIsLoading(true);

    try {
      const result = await api.get<ConsultationListResponse | Consultation[]>(
        "/admin/consultations?page_size=100",
      );

      setConsultations(getConsultationItems(result.data));
    } catch {
      toast.error("Failed to load consultations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConsultations();
  }, []);

  const selectConsultation = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setForm({
      status:
        consultation.status === "confirmed" ||
        consultation.status === "completed" ||
        consultation.status === "cancelled" ||
        consultation.status === "rejected"
          ? consultation.status
          : "pending",
      admin_notes: consultation.admin_notes || "",
    });
  };

  const updateForm = <K extends keyof ConsultationFormState>(
    field: K,
    value: ConsultationFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedConsultation) {
      toast.error("Select a consultation first.");
      return;
    }

    setIsSaving(true);

    try {
      await api.patch(
        `/admin/consultations/status?id=${encodeURIComponent(
          selectedConsultation.id,
        )}`,
        {
          status: form.status,
          admin_notes: form.admin_notes.trim(),
        },
      );

      toast.success("Consultation updated.");
      await loadConsultations();
    } catch {
      toast.error("Failed to update consultation.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Consultations
          </p>

          <h1 className="text-2xl font-bold">Manage Consultation Bookings</h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Review consultation requests submitted from the public website,
            confirm appointments, and keep internal notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadConsultations()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone, company..."
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | ConsultationStatus)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading consultations...</p>
          ) : filteredConsultations.length > 0 ? (
            <div className="space-y-4">
              {filteredConsultations.map((consultation) => (
                <button
                  key={consultation.id}
                  type="button"
                  onClick={() => selectConsultation(consultation)}
                  className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                    selectedConsultation?.id === consultation.id
                      ? "border-teal bg-teal-50"
                      : "border-gray-100 bg-white hover:border-navy/30 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <UserRound size={16} className="text-teal" />

                        <h2 className="font-bold text-navy">
                          {consultation.full_name}
                        </h2>
                      </div>

                      <p className="text-sm font-semibold text-gray-700">
                        {consultation.subject ||
                          consultation.consultation_type ||
                          "General consultation"}
                      </p>

                      {consultation.company_name ? (
                        <p className="mt-1 text-sm text-gray-500">
                          {consultation.company_name}
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                        consultation.status,
                      )}`}
                    >
                      {consultation.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock size={15} className="text-gray-400" />
                      {formatDate(consultation.preferred_date)}
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <Clock size={15} className="text-gray-400" />
                      {consultation.preferred_time || "Not specified"}
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-gray-400" />
                      {getPreferredContact(consultation)}
                    </span>
                  </div>

                  {consultation.message ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600">
                      {consultation.message}
                    </p>
                  ) : null}

                  <p className="mt-4 text-xs text-gray-400">
                    Submitted: {formatDateTime(consultation.created_at)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <CalendarClock
                className="mx-auto mb-3 text-gray-300"
                size={44}
              />

              <p className="font-semibold text-navy">No consultations found</p>

              <p className="mt-1 text-sm text-gray-500">
                Consultation bookings submitted from the public website will
                appear here.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-navy">
              Consultation Details
            </h2>

            {selectedConsultation ? (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-gray-400">Client</p>
                  <p className="mt-1 font-bold text-navy">
                    {selectedConsultation.full_name}
                  </p>

                  {selectedConsultation.company_name ? (
                    <p className="text-sm text-gray-600">
                      {selectedConsultation.company_name}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 text-sm">
                  {selectedConsultation.email ? (
                    <a
                      href={`mailto:${selectedConsultation.email}`}
                      className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-gray-700 hover:text-navy"
                    >
                      <Mail size={16} className="text-teal" />
                      {selectedConsultation.email}
                    </a>
                  ) : null}

                  {selectedConsultation.phone ? (
                    <a
                      href={`tel:${selectedConsultation.phone}`}
                      className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-gray-700 hover:text-navy"
                    >
                      <Phone size={16} className="text-teal" />
                      {selectedConsultation.phone}
                    </a>
                  ) : null}

                  {selectedConsultation.whatsapp ? (
                    <a
                      href={`https://wa.me/250${selectedConsultation.whatsapp.replace(
                        /^0/,
                        "",
                      )}`}
                      target="_blank"
                      className="flex items-center gap-2 rounded-lg bg-lightgray px-3 py-2 text-gray-700 hover:text-navy"
                    >
                      <Phone size={16} className="text-teal" />
                      WhatsApp: {selectedConsultation.whatsapp}
                    </a>
                  ) : null}
                </div>

                <div className="rounded-xl bg-lightgray p-4">
                  <p className="mb-2 text-sm font-semibold text-navy">
                    Message
                  </p>

                  <p className="text-sm leading-relaxed text-gray-600">
                    {selectedConsultation.message || "No message provided."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-navy">
                      Status
                    </span>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target.value as ConsultationStatus,
                        )
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-navy">
                      Internal Notes
                    </span>

                    <textarea
                      value={form.admin_notes}
                      onChange={(event) =>
                        updateForm("admin_notes", event.target.value)
                      }
                      rows={6}
                      placeholder="Write internal notes about follow-up, confirmation, or next steps..."
                      className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
                  >
                    <Save size={16} />
                    {isSaving ? "Saving..." : "Save Update"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <CheckCircle2
                  className="mx-auto mb-3 text-gray-300"
                  size={40}
                />

                <p className="font-semibold text-navy">
                  Select a consultation
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Choose a consultation from the list to view and update it.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}