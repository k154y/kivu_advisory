"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  RefreshCcw,
  User,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type ConsultationStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "in_progress"
  | "closed"
  | "cancelled";

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
  meeting_method?: string;
  preferred_contact_method?: string;
  preferred_date?: string | null;
  preferred_time?: string;
  status: ConsultationStatus | string;
  priority?: string;
  assigned_to_user_id?: string;
  handled_by_user_id?: string;
  admin_notes?: string;
  follow_up_notes?: string;
  created_at: string;
  updated_at: string;
};

type ConsultationListResponse = {
  items: Consultation[];
};

const STATUSES: ConsultationStatus[] = [
  "new",
  "contacted",
  "scheduled",
  "in_progress",
  "closed",
  "cancelled",
];

function getConsultationItems(data: ConsultationListResponse | Consultation[]) {
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
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => {
    return letter.toUpperCase();
  });
}

function getStatusColor(status: string) {
  if (status === "contacted") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "scheduled") {
    return "bg-purple-50 text-purple-700";
  }

  if (status === "in_progress") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (status === "closed") {
    return "bg-teal-50 text-teal";
  }

  if (status === "cancelled") {
    return "bg-red-50 text-red-600";
  }

  return "bg-gold-50 text-gold-600";
}

function getMeetingMethod(consultation: Consultation) {
  return (
    consultation.meeting_method ||
    consultation.preferred_contact_method ||
    consultation.consultation_type ||
    "phone"
  );
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function AdminConsultationsPage() {
  const [list, setList] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const filteredList = useMemo(() => {
    if (!filter) return list;

    return list.filter((consultation) => consultation.status === filter);
  }, [filter, list]);

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get<ConsultationListResponse | Consultation[]>(
        "/admin/consultations?page_size=100",
      );

      setList(getConsultationItems(result.data));
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load consultations."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleStatus = async (id: string, status: ConsultationStatus) => {
  setUpdating(id);

  try {
    await api.patch(`/admin/consultations/status?id=${encodeURIComponent(id)}`, {
      status,
    });

    toast.success("Status updated.");
    await load();
  } catch (error) {
    toast.error(
      getSafeErrorMessage(
        error,
        "Database operation failed while updating consultation status.",
      ),
    );
  } finally {
    setUpdating(null);
  }
};
  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Consultations</h1>

          <p className="mt-1 text-sm text-gray-500">
            {filteredList.length} consultation
            {filteredList.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-navy hover:text-navy"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            <option value="">All statuses</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
            Loading consultations...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
            No consultations found
          </div>
        ) : (
          filteredList.map((consultation) => {
            const meetingMethod = getMeetingMethod(consultation);
            const isVideo = meetingMethod === "video";

            return (
              <div
                key={consultation.id}
                className="rounded-xl border border-gray-100 bg-white p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(
                          consultation.status,
                        )}`}
                      >
                        {getStatusLabel(consultation.status)}
                      </span>

                      <span className="text-xs text-gray-400">
                        {formatDate(consultation.created_at)}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <User size={13} className="shrink-0 text-gray-400" />
                        <span className="text-sm font-semibold text-navy">
                          {consultation.full_name}
                        </span>
                      </div>

                      {consultation.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="shrink-0 text-gray-400" />
                          <span className="truncate text-sm text-gray-600">
                            {consultation.email}
                          </span>
                        </div>
                      ) : null}

                      {consultation.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="shrink-0 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {consultation.phone}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        {isVideo ? (
                          <Video size={13} className="shrink-0 text-teal" />
                        ) : (
                          <Phone size={13} className="shrink-0 text-teal" />
                        )}

                        <span className="text-sm capitalize text-gray-600">
                          {meetingMethod} call
                        </span>
                      </div>

                      {consultation.preferred_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar
                            size={13}
                            className="shrink-0 text-gray-400"
                          />
                          <span className="text-sm text-gray-600">
                            {formatDate(consultation.preferred_date)}
                          </span>
                        </div>
                      ) : null}

                      {consultation.preferred_time ? (
                        <div className="flex items-center gap-2">
                          <Clock
                            size={13}
                            className="shrink-0 text-gray-400"
                          />
                          <span className="text-sm text-gray-600">
                            {consultation.preferred_time}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {consultation.company_name ? (
                      <div className="mt-3 rounded-lg bg-lightgray p-3">
                        <p className="mb-1 text-xs text-gray-500">Company</p>
                        <p className="text-sm text-charcoal">
                          {consultation.company_name}
                        </p>
                      </div>
                    ) : null}

                    {consultation.subject ? (
                      <div className="mt-3 rounded-lg bg-lightgray p-3">
                        <p className="mb-1 text-xs text-gray-500">Subject</p>
                        <p className="text-sm text-charcoal">
                          {consultation.subject}
                        </p>
                      </div>
                    ) : null}

                    {consultation.message ? (
                      <div className="mt-3 rounded-lg bg-lightgray p-3">
                        <p className="mb-1 text-xs text-gray-500">Message</p>
                        <p className="text-sm text-charcoal">
                          {consultation.message}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                    <label className="text-xs font-semibold text-gray-500">
                      Change status
                    </label>

                    <select
                      value={consultation.status}
                      disabled={updating === consultation.id}
                      onChange={(event) =>
                        handleStatus(
                          consultation.id,
                          event.target.value as ConsultationStatus,
                        )
                      }
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-50"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export type { Consultation, ConsultationStatus };