"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useState,
  type ComponentProps,
  type FormEvent,
} from "react";
import { ArrowLeft, BriefcaseBusiness, FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { RequestDetailCard } from "@/components/admin/request-detail-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { routes } from "@/lib/routes";

type AdminRequestDetail = ComponentProps<typeof RequestDetailCard>["request"];

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

const priorityOptions: AssignmentPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
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

  return (
    <div className="space-y-6">
      <Link href={routes.admin.requests}>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to requests
        </Button>
      </Link>

      {isLoading ? (
        <LoadingState
          title="Loading request"
          description="Fetching the full request details and current status."
        />
      ) : !request ? (
        <EmptyState
          title="Request unavailable"
          description={error || "This request could not be found."}
          icon={<FileText className="h-5 w-5" />}
        />
      ) : (
        <>
          <RequestDetailCard request={request} onUpdated={setRequest} />

          <AssignAccountantCard
            serviceRequestId={requestId}
            onAssigned={() => void loadRequest()}
          />
        </>
      )}
    </div>
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
    } catch {
      toast.error("Failed to assign request.");
    } finally {
      setIsAssigning(false);
    }
  };

  const activeAccountants = accountants.filter(
    (accountant) => accountant.is_active,
  );

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy">
          <BriefcaseBusiness className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-navy">
            Assign Request to Accountant
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select the accountant who will work on this service request.
          </p>
        </div>
      </div>

      <form onSubmit={handleAssign} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-navy">
              Accountant
            </span>

            <select
              value={form.accountant_user_id}
              onChange={(event) =>
                updateForm("accountant_user_id", event.target.value)
              }
              disabled={isLoadingAccountants}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-gray-50"
            >
              <option value="">
                {isLoadingAccountants
                  ? "Loading accountants..."
                  : "Select accountant"}
              </option>

              {activeAccountants.map((accountant) => (
                <option key={accountant.id} value={accountant.id}>
                  {accountant.full_name} — {accountant.email}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-navy">
              Priority
            </span>

            <select
              value={form.priority}
              onChange={(event) =>
                updateForm("priority", event.target.value as AssignmentPriority)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm capitalize outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-navy">
            Due Date
          </span>

          <input
            type="date"
            value={form.due_date}
            onChange={(event) => updateForm("due_date", event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-navy">
            Notes for Accountant
          </span>

          <textarea
            value={form.notes}
            onChange={(event) => updateForm("notes", event.target.value)}
            rows={3}
            placeholder="Write instructions visible to the accountant..."
            className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-navy">
            Internal Notes
          </span>

          <textarea
            value={form.internal_notes}
            onChange={(event) =>
              updateForm("internal_notes", event.target.value)
            }
            rows={3}
            placeholder="Private admin notes..."
            className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </label>

        <Button
          type="submit"
          disabled={isAssigning || isLoadingAccountants}
          leftIcon={<Send className="h-4 w-4" />}
        >
          {isAssigning ? "Assigning..." : "Assign Request"}
        </Button>
      </form>
    </section>
  );
}