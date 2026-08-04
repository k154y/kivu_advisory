"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Send,
  UploadCloud,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { AdminRequestClientDocumentUploadCard } from "@/components/documents/AdminRequestClientDocumentUploadCard";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { uploadDocument } from "@/lib/documents";
import { endpoints } from "@/lib/endpoints";
import { routes } from "@/lib/routes";

type AdminRequestDetail = {
  id: string;
  reference_number?: string;
  client_id?: string;
  service_id?: string;
  service_name?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_company?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  source?: string;
  preferred_contact_method?: string;
  expected_deadline?: string;
  admin_notes?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
};

type AdminAccountant = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
};

type AccountantListResponse = {
  items: AdminAccountant[];
};

type AssignmentPriority = "low" | "normal" | "high" | "urgent";

type AssignmentFormState = {
  accountant_user_id: string;
  priority: AssignmentPriority;
  due_date: string;
  notes: string;
  internal_notes: string;
};

type StatusFormState = {
  status: string;
  admin_notes: string;
  internal_notes: string;
};

type DocumentUploadState = {
  visibility: "client" | "staff" | "admin";
  document_type:
    | "client_upload"
    | "admin_upload"
    | "accountant_upload"
    | "final_deliverable"
    | "internal_file";
  description: string;
  is_final: boolean;
};

const priorityOptions: AssignmentPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

const statusOptions = [
  "new",
  "pending",
  "in_review",
  "waiting_client",
  "in_progress",
  "completed",
  "cancelled",
];

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getAccountantItems(data: AccountantListResponse | AdminAccountant[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function labelFromValue(value?: string) {
  if (!value) return "—";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status?: string) {
  switch (status) {
    case "completed":
      return "border-teal/20 bg-teal/10 text-teal";
    case "in_progress":
    case "in_review":
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "waiting_client":
    case "pending":
      return "border-amber-100 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-red-100 bg-red-50 text-red-700";
    default:
      return "border-gray-100 bg-lightgray text-gray-600";
  }
}

function priorityClass(priority?: string) {
  switch (priority) {
    case "urgent":
      return "border-red-100 bg-red-50 text-red-700";
    case "high":
      return "border-orange-100 bg-orange-50 text-orange-700";
    case "normal":
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "low":
      return "border-gray-100 bg-lightgray text-gray-600";
    default:
      return "border-gray-100 bg-lightgray text-gray-600";
  }
}

function buildMessageHref(request: AdminRequestDetail) {
  const params = new URLSearchParams();

  if (request.id) {
    params.set("service_request_id", request.id);
  }

  if (request.client_id) {
    params.set("client_id", request.client_id);
  }

  if (request.reference_number) {
    params.set("reference", request.reference_number);
  }

  return `${routes.admin.messages}?${params.toString()}`;
}

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<AdminRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequest = async () => {
    if (!requestId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.get<AdminRequestDetail>(
        endpoints.admin.serviceRequestDetail(requestId),
      );

      setRequest(result.data);
    } catch (loadError) {
      setRequest(null);
      setError(
        getSafeErrorMessage(
          loadError,
          "This service request could not be loaded from the backend.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const runLoad = async () => {
      if (!requestId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get<AdminRequestDetail>(
          endpoints.admin.serviceRequestDetail(requestId),
        );

        if (!cancelled) {
          setRequest(result.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setRequest(null);
          setError(
            getSafeErrorMessage(
              loadError,
              "This service request could not be loaded from the backend.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void runLoad();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (isLoading) {
    return (
      <div className="max-w-5xl">
        <LoadingState
          title="Loading request"
          description="Fetching the full request details and current status."
        />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-5xl">
        <EmptyState
          title="Request unavailable"
          description={error || "This request could not be found."}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={routes.admin.requests}
          className="text-gray-400 transition-colors hover:text-navy"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="min-w-0">
          <h1 className="text-xl font-bold text-navy">Request Details</h1>
          <p className="text-xs text-gray-400">
            {request.reference_number || `ID: ${request.id.slice(0, 8)}…`}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
              request.status,
            )}`}
          >
            {labelFromValue(request.status || "new")}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClass(
              request.priority,
            )}`}
          >
            {labelFromValue(request.priority || "normal")}
          </span>

          <Link
            href={buildMessageHref(request)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 px-3 py-2 text-xs font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
          >
            <MessageSquare size={13} />
            Message
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <ClientInformationCard request={request} />

          <RequestDetailsCard request={request} />

          <AdminRequestClientDocumentUploadCard
            serviceRequestId={request.id}
            referenceNumber={request.reference_number}
          />
        </div>

        <div className="space-y-5">
          <UpdateStatusCard
            request={request}
            onUpdated={setRequest}
            onReload={() => void loadRequest()}
          />

          <AssignAccountantCard
            serviceRequestId={request.id}
            onAssigned={() => void loadRequest()}
          />

          <UploadDocumentCard
            serviceRequestId={request.id}
            onUploaded={() => void loadRequest()}
          />
        </div>
      </div>
    </div>
  );
}

function ClientInformationCard({ request }: { request: AdminRequestDetail }) {
  const fields = [
    {
      icon: User,
      label: "Name",
      value: request.requester_name,
    },
    {
      icon: User,
      label: "Company",
      value: request.requester_company,
    },
    {
      icon: Phone,
      label: "Phone",
      value: request.requester_phone,
    },
    {
      icon: Mail,
      label: "Email",
      value: request.requester_email,
    },
    {
      icon: MapPin,
      label: "Source",
      value: labelFromValue(request.source || "website"),
    },
    {
      icon: Clock,
      label: "Created",
      value: formatDate(request.created_at || request.submitted_at),
    },
  ].filter((field) => field.value);

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">
        Client Information
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const Icon = field.icon;

          return (
            <div key={field.label} className="flex items-start gap-2">
              <Icon size={14} className="mt-0.5 shrink-0 text-gray-400" />

              <div className="min-w-0">
                <p className="text-xs text-gray-400">{field.label}</p>
                <p
                  className="truncate text-sm font-medium text-charcoal"
                  title={String(field.value)}
                >
                  {field.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-gray-50 pt-4">
        <Link
          href={buildMessageHref(request)}
          className="flex items-center gap-2 text-sm font-medium text-teal hover:underline"
        >
          <MessageSquare size={14} />
          Message this client
        </Link>
      </div>
    </section>
  );
}

function RequestDetailsCard({ request }: { request: AdminRequestDetail }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">
        Request Details
      </h2>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-teal" />
          <span className="text-sm font-medium text-charcoal">
            {request.service_name || request.title || "Service request"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">
            Priority:{" "}
            <span className="font-medium capitalize text-charcoal">
              {labelFromValue(request.priority || "normal")}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">
            Contact via:{" "}
            <span className="font-medium capitalize text-charcoal">
              {labelFromValue(request.preferred_contact_method || "—")}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">
            Expected deadline:{" "}
            <span className="font-medium text-charcoal">
              {formatDate(request.expected_deadline)}
            </span>
          </span>
        </div>

        {request.description ? (
          <div className="mt-3 rounded-lg bg-lightgray p-4">
            <p className="mb-1 text-xs text-gray-500">Description</p>
            <p className="max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-charcoal">
              {request.description}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type UpdateStatusCardProps = {
  request: AdminRequestDetail;
  onUpdated: (request: AdminRequestDetail) => void;
  onReload: () => void;
};

function UpdateStatusCard({
  request,
  onUpdated,
  onReload,
}: UpdateStatusCardProps) {
  const [form, setForm] = useState<StatusFormState>({
    status: request.status || "new",
    admin_notes: "",
    internal_notes: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      status: request.status || "new",
      admin_notes: "",
      internal_notes: "",
    });
  }, [request.id, request.status]);

  const updateForm = <K extends keyof StatusFormState>(
    field: K,
    value: StatusFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleStatusUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);

    try {
      const result = await api.patch<AdminRequestDetail>(
        endpoints.admin.serviceRequestStatus(request.id),
        {
          status: form.status,
          admin_notes: form.admin_notes.trim(),
          internal_notes: form.internal_notes.trim(),
        },
      );

      toast.success("Request updated.");
      onUpdated(result.data);
      onReload();

      setForm((current) => ({
        ...current,
        admin_notes: "",
        internal_notes: "",
      }));
    } catch (saveError) {
      toast.error(
        getSafeErrorMessage(saveError, "Failed to update request."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-navy">Update Status</h3>

      <form onSubmit={handleStatusUpdate}>
        <select
          value={form.status}
          onChange={(event) => updateForm("status", event.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm capitalize outline-none focus:ring-2 focus:ring-teal/30"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {labelFromValue(status)}
            </option>
          ))}
        </select>

        <details className="mb-3 rounded-lg border border-gray-100 bg-lightgray/40 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-navy">
            Add notes
          </summary>

          <div className="mt-3 space-y-3">
            <textarea
              value={form.admin_notes}
              onChange={(event) => updateForm("admin_notes", event.target.value)}
              rows={2}
              placeholder="Client-facing notes..."
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal/30"
            />

            <textarea
              value={form.internal_notes}
              onChange={(event) =>
                updateForm("internal_notes", event.target.value)
              }
              rows={2}
              placeholder="Internal notes..."
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>
        </details>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={14} />
              Update Status
            </>
          )}
        </button>
      </form>
    </section>
  );
}

type UploadDocumentCardProps = {
  serviceRequestId: string;
  onUploaded: () => void;
};

function UploadDocumentCard({
  serviceRequestId,
  onUploaded,
}: UploadDocumentCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<DocumentUploadState>({
    visibility: "staff",
    document_type: "admin_upload",
    description: "",
    is_final: false,
  });

  const [isUploading, setIsUploading] = useState(false);

  const handlePurposeChange = (value: string) => {
    if (value === "final_deliverable") {
      setForm({
        visibility: "client",
        document_type: "final_deliverable",
        description: form.description,
        is_final: true,
      });
      return;
    }

    if (value === "internal_file") {
      setForm({
        visibility: "admin",
        document_type: "internal_file",
        description: form.description,
        is_final: false,
      });
      return;
    }

    setForm({
      visibility: "staff",
      document_type: "admin_upload",
      description: form.description,
      is_final: false,
    });
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!serviceRequestId) {
      toast.error("Service request ID is missing.");
      return;
    }

    if (!file) {
      toast.error("Please select a document to upload.");
      return;
    }

    setIsUploading(true);

    try {
      await uploadDocument({
        file,
        service_request_id: serviceRequestId,
        visibility: form.visibility,
        document_type: form.document_type,
        is_final: form.is_final,
        description: form.description,
      });

      toast.success("Document uploaded successfully.");

      setFile(null);
      setForm({
        visibility: "staff",
        document_type: "admin_upload",
        description: "",
        is_final: false,
      });

      const input = document.getElementById(
        "admin-request-document-file",
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      onUploaded();
    } catch (uploadError) {
      toast.error(
        getSafeErrorMessage(uploadError, "Failed to upload document."),
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-navy">Documents</h3>

      <form onSubmit={handleUpload} className="space-y-3">
        <input
          id="admin-request-document-file"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-teal focus:ring-2 focus:ring-teal/30"
        />

        <select
          value={form.document_type}
          onChange={(event) => handlePurposeChange(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal/30"
        >
          <option value="admin_upload">Admin upload / staff document</option>
          <option value="final_deliverable">Final deliverable to client</option>
          <option value="internal_file">Internal admin-only file</option>
        </select>

        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          rows={2}
          placeholder="Short document note..."
          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal/30"
        />

        <p className="rounded-lg bg-lightgray px-3 py-2 text-xs text-gray-500">
          Visibility:{" "}
          <span className="font-semibold text-navy">{form.visibility}</span> ·
          Type:{" "}
          <span className="font-semibold text-navy">
            {labelFromValue(form.document_type)}
          </span>
        </p>

        <button
          type="submit"
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <UploadCloud size={14} />
              Upload
            </>
          )}
        </button>
      </form>
    </section>
  );
}

type AssignAccountantCardProps = {
  serviceRequestId: string;
  onAssigned: () => void;
};

function AssignAccountantCard({
  serviceRequestId,
  onAssigned,
}: AssignAccountantCardProps) {
  const [accountants, setAccountants] = useState<AdminAccountant[]>([]);
  const [isLoadingAccountants, setIsLoadingAccountants] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  const [form, setForm] = useState<AssignmentFormState>({
    accountant_user_id: "",
    priority: "normal",
    due_date: "",
    notes: "",
    internal_notes: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadAccountants = async () => {
      setIsLoadingAccountants(true);

      try {
        const result = await api.get<AccountantListResponse | AdminAccountant[]>(
          "/admin/accountant-accounts?page_size=100",
        );

        if (!cancelled) {
          setAccountants(getAccountantItems(result.data));
        }
      } catch {
        if (!cancelled) {
          setAccountants([]);
          toast.error("Failed to load accountants.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccountants(false);
        }
      }
    };

    void loadAccountants();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateForm = <K extends keyof AssignmentFormState>(
    field: K,
    value: AssignmentFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.accountant_user_id) {
      toast.error("Please select an accountant.");
      return;
    }

    setIsAssigning(true);

    try {
      await api.post("/admin/assignments", {
        service_request_id: serviceRequestId,
        accountant_user_id: form.accountant_user_id,
        priority: form.priority,
        due_date: form.due_date || null,
        notes: form.notes.trim(),
        internal_notes: form.internal_notes.trim(),
      });

      toast.success("Request assigned to accountant.");

      setForm({
        accountant_user_id: "",
        priority: "normal",
        due_date: "",
        notes: "",
        internal_notes: "",
      });

      onAssigned();
    } catch (assignError) {
      toast.error(
        getSafeErrorMessage(assignError, "Failed to assign request."),
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const activeAccountants = accountants.filter(
    (accountant) => accountant.is_active,
  );

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-navy">Assign Case</h3>

      <form onSubmit={handleAssign} className="space-y-3">
        <select
          value={form.accountant_user_id}
          onChange={(event) =>
            updateForm("accountant_user_id", event.target.value)
          }
          disabled={isLoadingAccountants}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal/30 disabled:bg-gray-50"
        >
          <option value="">
            {isLoadingAccountants ? "Loading accountants…" : "Select accountant…"}
          </option>

          {activeAccountants.map((accountant) => (
            <option key={accountant.id} value={accountant.id}>
              {accountant.full_name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.priority}
            onChange={(event) =>
              updateForm("priority", event.target.value as AssignmentPriority)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm capitalize outline-none focus:ring-2 focus:ring-teal/30"
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.due_date}
            onChange={(event) => updateForm("due_date", event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>

        <details className="rounded-lg border border-gray-100 bg-lightgray/40 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-navy">
            Add notes
          </summary>

          <div className="mt-3 space-y-3">
            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              rows={2}
              placeholder="Notes for accountant..."
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal/30"
            />

            <textarea
              value={form.internal_notes}
              onChange={(event) =>
                updateForm("internal_notes", event.target.value)
              }
              rows={2}
              placeholder="Internal notes..."
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>
        </details>

        <button
          type="submit"
          disabled={isAssigning || isLoadingAccountants}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy disabled:opacity-60"
        >
          {isAssigning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Assigning…
            </>
          ) : (
            <>
              <Send size={14} />
              Assign to Accountant
            </>
          )}
        </button>
      </form>
    </section>
  );
}