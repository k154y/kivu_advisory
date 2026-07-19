"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { CredentialCard } from "@/components/tax-credentials/CredentialCard";
import {
  CredentialForm,
  type ClientTaxCredential,
  type CredentialCreatePayload,
  type CredentialUpdatePayload,
} from "@/components/tax-credentials/CredentialForm";
import type { TaxCredentialSystem } from "@/components/tax-credentials/SystemForm";

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

export default function ClientTaxCredentialsPage() {
  const [systems, setSystems] = useState<TaxCredentialSystem[]>([]);
  const [credentials, setCredentials] = useState<ClientTaxCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientTaxCredential | null>(null);

  const activeSystems = useMemo(() => {
    return systems
      .filter((system) => system.is_active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [systems]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [systemResult, credentialResult] = await Promise.all([
        api.get<unknown>("/tax-credential-systems?page_size=100"),
        api.get<unknown>("/client/tax-credentials?page_size=100"),
      ]);

      setSystems(getItems<TaxCredentialSystem>(systemResult.data));
      setCredentials(getItems<ClientTaxCredential>(credentialResult.data));
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load tax credentials."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    return () => {
      setEditing(null);
    };
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (credential: ClientTaxCredential) => {
    setEditing(credential);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setModalOpen(false);
  };

  const saveCredential = async (
    payload: CredentialCreatePayload | CredentialUpdatePayload,
  ) => {
    setSaving(true);

    try {
      if (editing) {
        await api.put(
          `/client/tax-credentials/detail?id=${encodeURIComponent(editing.id)}`,
          payload,
        );

        toast.success("Credential updated.");
      } else {
        await api.post("/client/tax-credentials", payload);
        toast.success("Credential saved.");
      }

      closeModal();
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to save credential."));
    } finally {
      setSaving(false);
    }
  };

  const deleteCredential = async (credential: ClientTaxCredential) => {
  const confirmed = window.confirm(
    `Delete credential for ${credential.system_name}?`,
  );

  if (!confirmed) return;

  try {
    await api.request(
      `/client/tax-credentials/detail?id=${encodeURIComponent(credential.id)}`,
      {
        method: "DELETE",
      },
    );

    toast.success("Credential deleted.");
    await load();
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to delete credential."));
  }
};

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Tax Credentials</h1>
          <p className="mt-1 text-sm text-gray-400">
            Securely save login details for tax and Rwanda Revenue related
            systems.
          </p>
        </div>

        <div className="flex gap-2">
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
            Add Credential
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-teal/20 bg-teal/5 p-4">
        <div className="flex gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-teal" />
          <p className="text-sm leading-relaxed text-gray-600">
            Your password is stored securely and encrypted on the server. It is
            only revealed to authorized staff when needed for your service.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : credentials.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
            <KeyRound size={28} className="text-gray-300" />
          </div>
          <h3 className="font-semibold text-navy">No tax credentials yet</h3>
          <p className="mt-1 text-sm text-gray-400">
            Add credentials for RRA and tax systems created by admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {credentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              revealEndpoint="/client/tax-credentials/reveal"
              canEdit
              canDelete
              onEdit={openEdit}
              onDelete={deleteCredential}
            />
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-navy">
              {editing ? "Edit Credential" : "Add Credential"}
            </h2>

            <CredentialForm
              mode={editing ? "update" : "create"}
              systems={activeSystems}
              initialValue={editing}
              submitting={saving}
              onSubmit={saveCredential}
              onCancel={closeModal}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}