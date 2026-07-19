"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  KeyRound,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { CredentialCard } from "@/components/tax-credentials/CredentialCard";
import type { ClientTaxCredential } from "@/components/tax-credentials/CredentialForm";
import { StatusBadge } from "@/components/tax-credentials/StatusBadge";

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

export default function AdminTaxCredentialsPage() {
  const [credentials, setCredentials] = useState<ClientTaxCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page_size", "100");

      if (clientId.trim()) {
        params.set("client_id", clientId.trim());
      }

      const result = await api.get<unknown>(
        `/admin/tax-credentials?${params.toString()}`,
      );

      setCredentials(getItems<ClientTaxCredential>(result.data));
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load tax credentials."),
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCredentials = useMemo(() => {
    const term = search.trim().toLowerCase();

    return credentials.filter((credential) => {
      const matchesSearch = !term
        ? true
        : [
            credential.system_name,
            credential.login_url,
            credential.username,
            credential.client_id,
            credential.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term);

      const matchesActive =
        activeFilter === ""
          ? true
          : activeFilter === "active"
            ? credential.is_active !== false
            : credential.is_active === false;

      return matchesSearch && matchesActive;
    });
  }, [credentials, search, activeFilter]);

  const toggleStatus = async (credential: ClientTaxCredential) => {
    try {
      await api.patch(
        `/admin/tax-credentials/status?id=${encodeURIComponent(
          credential.id,
        )}`,
        {
          is_active: credential.is_active === false,
        },
      );

      toast.success("Credential status updated.");
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update status."));
    }
  };

  const deleteCredential = async (credential: ClientTaxCredential) => {
    const confirmed = window.confirm(
      `Delete credential for ${credential.system_name}?`,
    );

    if (!confirmed) return;

    try {
      await api.request(
        `/admin/tax-credentials/detail?id=${encodeURIComponent(
          credential.id,
        )}`,
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
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-gold">
            Tax Credentials
          </p>

          <h1 className="text-2xl font-bold text-navy">
            Client Tax Credentials
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            View client tax portal credentials and reveal passwords only when
            necessary.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
        >
          <RefreshCcw size={15} />
          Refresh
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search credentials..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>

          <input
            type="text"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="Filter by client ID"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          />

          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
            <KeyRound size={28} className="text-gray-300" />
          </div>

          <h3 className="font-semibold text-navy">No credentials found</h3>

          <p className="mt-1 text-sm text-gray-400">
            Client tax credentials will appear here after clients save them.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-navy">
                {filteredCredentials.length} credential
                {filteredCredentials.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="divide-y divide-gray-50">
              {filteredCredentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-navy">
                      <KeyRound size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-navy">
                          {credential.system_name}
                        </h3>

                        <StatusBadge active={credential.is_active !== false} />
                      </div>

                      <a
                        href={credential.login_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"
                      >
                        {credential.login_url}
                        <ExternalLink size={12} />
                      </a>

                      <p className="mt-2 text-sm text-gray-600">
                        Username:{" "}
                        <span className="font-mono text-charcoal">
                          {credential.username}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Client ID: {credential.client_id || "—"} · Last
                        revealed: {formatDate(credential.last_revealed_at)} ·
                        Created: {formatDate(credential.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(credential)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
                    >
                      {credential.is_active === false
                        ? "Activate"
                        : "Deactivate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteCredential(credential)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCredentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                revealEndpoint="/admin/tax-credentials/reveal"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}