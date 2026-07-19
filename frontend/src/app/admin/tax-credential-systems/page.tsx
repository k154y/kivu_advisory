"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { StatusBadge } from "@/components/tax-credentials/StatusBadge";
import {
  SystemForm,
  type TaxCredentialSystem,
  type TaxCredentialSystemPayload,
} from "@/components/tax-credentials/SystemForm";

function getItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: T[];
    data?: T[] | { items?: T[] };
  };

  if (Array.isArray(objectResponse.items)) return objectResponse.items;
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

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminTaxCredentialSystemsPage() {
  const [systems, setSystems] = useState<TaxCredentialSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxCredentialSystem | null>(null);

  const sortedSystems = useMemo(() => {
    return [...systems].sort(
      (a, b) => (a.display_order || 0) - (b.display_order || 0),
    );
  }, [systems]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api.get<unknown>(
        "/admin/tax-credential-systems?page_size=100",
      );

      setSystems(getItems<TaxCredentialSystem>(result.data));
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load tax systems."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (system: TaxCredentialSystem) => {
    setEditing(system);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setModalOpen(false);
  };

  const saveSystem = async (payload: TaxCredentialSystemPayload) => {
    setSaving(true);

    try {
      if (editing) {
        await api.put(
          `/admin/tax-credential-systems/detail?id=${encodeURIComponent(
            editing.id,
          )}`,
          payload,
        );

        toast.success("Tax system updated.");
      } else {
        await api.post("/admin/tax-credential-systems", payload);
        toast.success("Tax system created.");
      }

      closeModal();
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to save tax system."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (system: TaxCredentialSystem) => {
    try {
      await api.patch(
        `/admin/tax-credential-systems/status?id=${encodeURIComponent(
          system.id,
        )}`,
        {
          is_active: system.is_active === false,
        },
      );

      toast.success(
        system.is_active === false
          ? "Tax system activated."
          : "Tax system deactivated.",
      );

      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update status."));
    }
  };

  const deleteSystem = async (system: TaxCredentialSystem) => {
    const confirmed = window.confirm(
      `Delete "${system.system_name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await api.request(
        `/admin/tax-credential-systems/detail?id=${encodeURIComponent(
          system.id,
        )}`,
        {
          method: "DELETE",
        },
      );

      toast.success("Tax system deleted.");
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to delete tax system."));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-gold">
            Tax Credentials
          </p>

          <h1 className="text-2xl font-bold text-navy">Tax Systems</h1>

          <p className="mt-1 text-sm text-gray-400">
            Manage external Rwanda Revenue and tax portals clients can select.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal"
          >
            <Plus size={15} />
            Add System
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-navy">External Tax Systems</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : sortedSystems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
              <KeyRound size={28} className="text-gray-300" />
            </div>

            <h3 className="font-semibold text-navy">No systems yet</h3>

            <p className="mt-1 text-sm text-gray-400">
              Add RRA and tax-related systems clients can use.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sortedSystems.map((system) => (
              <div
                key={system.id}
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-navy">
                    <KeyRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-navy">
                        {system.system_name}
                      </h3>

                      <StatusBadge active={system.is_active !== false} />
                    </div>

                    <a
                      href={system.login_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"
                    >
                      {system.login_url}
                      <ExternalLink size={12} />
                    </a>

                    {system.description ? (
                      <p className="mt-1 text-sm text-gray-500">
                        {system.description}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-gray-400">
                      Order: {system.display_order || 0} · Created:{" "}
                      {formatDate(system.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleStatus(system)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
                  >
                    {system.is_active === false ? "Activate" : "Deactivate"}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(system)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteSystem(system)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-navy">
              {editing ? "Edit Tax System" : "Add Tax System"}
            </h2>

            <SystemForm
              initialValue={editing}
              submitting={saving}
              onSubmit={saveSystem}
              onCancel={closeModal}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}