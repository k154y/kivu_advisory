"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Phone,
  RefreshCcw,
  UserCheck,
  UserCircle,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminAccountantPaths,
  formatAccountantDate,
  type AdminAccountant,
} from "@/lib/admin-accountants";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

type AccountantDetail = AdminAccountant & {
  last_login_at?: string | null;
};

type AssignmentTask = {
  id: string;
  service_request_id?: string;
  accountant_user_id?: string;
  assigned_to_user_id?: string;
  title?: string;
  request_title?: string;
  service_request_title?: string;
  requester_name?: string;
  requester_full_name?: string;
  client_name?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

type AssignedConsultation = {
  id: string;
  full_name: string;
  company_name?: string;
  subject?: string;
  consultation_type?: string;
  status?: string;
  priority?: string;
  preferred_date?: string | null;
  preferred_time?: string;
  created_at?: string;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getLabel(value?: string | null) {
  if (!value) return "Not specified";

  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => {
    return letter.toUpperCase();
  });
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

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStatusColor(status?: string) {
  if (status === "completed" || status === "closed") {
    return "bg-teal-50 text-teal";
  }

  if (status === "in_progress") {
    return "bg-purple-50 text-purple-700";
  }

  if (status === "accepted" || status === "scheduled") {
    return "bg-gold-50 text-gold-600";
  }

  if (status === "cancelled") {
    return "bg-red-50 text-red-600";
  }

  if (status === "contacted") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-gray-100 text-gray-600";
}

function getPriorityColor(priority?: string) {
  if (priority === "urgent") return "bg-red-50 text-red-600";
  if (priority === "high") return "bg-gold-50 text-gold-600";
  if (priority === "normal") return "bg-blue-50 text-blue-700";
  if (priority === "low") return "bg-gray-100 text-gray-600";

  return "bg-gray-100 text-gray-600";
}

function getAccountantFromResponse(response: unknown): AccountantDetail | null {
  if (!response || typeof response !== "object") return null;

  const direct = response as Partial<AccountantDetail>;

  if (typeof direct.id === "string" && typeof direct.email === "string") {
    return direct as AccountantDetail;
  }

  const wrapped = response as {
    accountant?: AccountantDetail;
    item?: AccountantDetail;
    data?: unknown;
  };

  if (wrapped.accountant?.id) return wrapped.accountant;
  if (wrapped.item?.id) return wrapped.item;

  if (wrapped.data && wrapped.data !== response) {
    return getAccountantFromResponse(wrapped.data);
  }

  return null;
}

function getItemsFromResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: T[];
    data?: T[] | { items?: T[] };
    assignments?: T[];
    consultations?: T[];
  };

  if (Array.isArray(objectResponse.items)) return objectResponse.items;
  if (Array.isArray(objectResponse.assignments)) {
    return objectResponse.assignments;
  }
  if (Array.isArray(objectResponse.consultations)) {
    return objectResponse.consultations;
  }
  if (Array.isArray(objectResponse.data)) return objectResponse.data;

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function isTaskAssignedToAccountant(task: AssignmentTask, accountantId: string) {
  const possibleIds = [
    task.accountant_user_id,
    task.assigned_to_user_id,
  ].filter(Boolean);

  if (possibleIds.length === 0) {
    return true;
  }

  return possibleIds.includes(accountantId);
}

function isConsultationAssignedToAccountant(
  consultation: AssignedConsultation & { assigned_to_user_id?: string },
  accountantId: string,
) {
  if (!consultation.assigned_to_user_id) {
    return true;
  }

  return consultation.assigned_to_user_id === accountantId;
}

function getTaskTitle(task: AssignmentTask) {
  return (
    task.service_request_title ||
    task.request_title ||
    task.title ||
    `Assignment ${task.id.slice(0, 8)}`
  );
}

function getTaskClient(task: AssignmentTask) {
  return (
    task.client_name ||
    task.requester_full_name ||
    task.requester_name ||
    "Client not specified"
  );
}

export default function AdminAccountantDetailPage() {
  const params = useParams<{ id: string }>();
  const accountantId = params.id;

  const [accountant, setAccountant] = useState<AccountantDetail | null>(null);
  const [tasks, setTasks] = useState<AssignmentTask[]>([]);
  const [consultations, setConsultations] = useState<AssignedConsultation[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [accountantResult, tasksResult, consultationsResult] =
        await Promise.all([
          api.get<unknown>(adminAccountantPaths.detail(accountantId)),

          api
            .get<unknown>(
              `/admin/assignments?accountant_user_id=${encodeURIComponent(
                accountantId,
              )}&page_size=100`,
            )
            .catch(() => null),

          api
            .get<unknown>(
              `/admin/consultations?assigned_to_user_id=${encodeURIComponent(
                accountantId,
              )}&page_size=100`,
            )
            .catch(() => null),
        ]);

      const accountantItem = getAccountantFromResponse(accountantResult.data);

      setAccountant(accountantItem);

      const taskItems = tasksResult
        ? getItemsFromResponse<AssignmentTask>(tasksResult.data).filter(
            (task) => isTaskAssignedToAccountant(task, accountantId),
          )
        : [];

      const consultationItems = consultationsResult
        ? getItemsFromResponse<
            AssignedConsultation & { assigned_to_user_id?: string }
          >(consultationsResult.data).filter((consultation) =>
            isConsultationAssignedToAccountant(consultation, accountantId),
          )
        : [];

      setTasks(taskItems);
      setConsultations(consultationItems);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load accountant details."),
      );
    } finally {
      setLoading(false);
    }
  }, [accountantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async () => {
    if (!accountant) return;

    setUpdatingStatus(true);

    try {
      await api.patch(adminAccountantPaths.status(accountant.id), {
        is_active: !accountant.is_active,
      });

      toast.success(
        accountant.is_active
          ? "Accountant account suspended."
          : "Accountant account activated.",
      );

      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update status."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        Loading accountant details...
      </div>
    );
  }

  if (!accountant) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-navy">
          Accountant account not found
        </p>

        <Link
          href={routes.admin.accountants}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowLeft size={15} />
          Back to accountants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Link
            href={routes.admin.accountants}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-navy"
          >
            <ArrowLeft size={15} />
            Back to accountants
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal/10 text-lg font-bold text-teal">
              {getInitials(accountant.full_name)}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-navy">
                {accountant.full_name}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Accountant account details and assigned work.
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    accountant.is_active
                      ? "bg-teal-50 text-teal"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {accountant.is_active ? (
                    <UserCheck size={12} />
                  ) : (
                    <UserX size={12} />
                  )}
                  {accountant.is_active ? "Active" : "Suspended"}
                </span>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {consultations.length} consultation
                  {consultations.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:border-navy hover:text-navy"
        >
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="mb-5 text-lg font-bold text-navy">
              Account Information
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <InfoItem
                icon={<UserCircle size={16} />}
                label="Full name"
                value={accountant.full_name}
              />

              <InfoItem
                icon={<Mail size={16} />}
                label="Email address"
                value={accountant.email}
              />

              <InfoItem
                icon={<Phone size={16} />}
                label="Phone number"
                value={accountant.phone || "Not provided"}
              />

              <InfoItem
                icon={<Calendar size={16} />}
                label="Created"
                value={formatAccountantDate(accountant.created_at)}
              />

              <InfoItem
                icon={<Clock size={16} />}
                label="Updated"
                value={formatAccountantDate(accountant.updated_at)}
              />

              <InfoItem
                icon={<CheckCircle2 size={16} />}
                label="Last login"
                value={formatDate(accountant.last_login_at)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-navy">
                Assigned Service Request Tasks
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Tasks assigned to this accountant from the assignment module.
              </p>
            </div>

            {tasks.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">
                No service request tasks assigned yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {tasks.map((task) => (
                  <div key={task.id} className="px-6 py-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">
                          {getTaskTitle(task)}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {getTaskClient(task)}
                        </p>

                        {task.notes ? (
                          <p className="mt-2 text-sm text-gray-500">
                            {task.notes}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                              task.status,
                            )}`}
                          >
                            {getLabel(task.status)}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityColor(
                              task.priority,
                            )}`}
                          >
                            {getLabel(task.priority)}
                          </span>

                          {task.due_date ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                              Due {formatDate(task.due_date)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {task.service_request_id ? (
                        <Link
                          href={routes.admin.requestDetail(
                            task.service_request_id,
                          )}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-navy hover:text-navy"
                        >
                          <FileText size={13} />
                          View request
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-navy">
                Assigned Consultations
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Consultations assigned to this accountant.
              </p>
            </div>

            {consultations.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">
                No consultations assigned yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="px-6 py-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">
                          {consultation.subject || "Consultation request"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {consultation.full_name}
                          {consultation.company_name
                            ? ` · ${consultation.company_name}`
                            : ""}
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
                              consultation.priority,
                            )}`}
                          >
                            {getLabel(consultation.priority)}
                          </span>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {getLabel(consultation.consultation_type)}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/admin/consultations/${consultation.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-navy hover:text-navy"
                      >
                        <BriefcaseBusiness size={13} />
                        View consultation
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="text-lg font-bold text-navy">Access Control</h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Deactivating this account should prevent the accountant from
              accessing the accountant dashboard when backend authentication
              checks account status.
            </p>

            <button
              type="button"
              onClick={updateStatus}
              disabled={updatingStatus}
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                accountant.is_active
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-teal text-white hover:bg-teal-700"
              }`}
            >
              {accountant.is_active ? (
                <UserX size={16} />
              ) : (
                <UserCheck size={16} />
              )}

              {updatingStatus
                ? "Updating..."
                : accountant.is_active
                  ? "Suspend Account"
                  : "Activate Account"}
            </button>
          </div>

          <div className="rounded-xl border border-gray-100 bg-lightgray p-6">
            <h2 className="text-sm font-bold text-navy">Work Summary</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryBox label="Tasks" value={tasks.length} />
              <SummaryBox label="Consultations" value={consultations.length} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
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

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}