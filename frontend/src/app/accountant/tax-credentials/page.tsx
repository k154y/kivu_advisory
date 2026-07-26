"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, RefreshCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;

type AssignedClient = {
  clientId: string;
  clientName: string;
  referenceNumber?: string;
  requestTitle?: string;
};

type TaxCredential = {
  id: string;
  client_id?: string;
  system_id?: string;
  system_name?: string;
  system_code?: string;
  login_url?: string;
  username?: string;
  identifier?: string;
  notes?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

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

function readString(source: UnknownRecord | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getRequestObject(item: UnknownRecord) {
  if (item.service_request && typeof item.service_request === "object") {
    return item.service_request as UnknownRecord;
  }

  if (item.request && typeof item.request === "object") {
    return item.request as UnknownRecord;
  }

  return {};
}

function normaliseAssignedClient(item: unknown): AssignedClient | null {
  if (!item || typeof item !== "object") return null;

  const assignment = item as UnknownRecord;
  const request = getRequestObject(assignment);

  const clientId =
    readString(request, ["client_id", "client_profile_id"]) ||
    readString(assignment, ["client_id", "client_profile_id"]);

  if (!clientId) return null;

  const clientName =
    readString(request, [
      "requester_name",
      "client_name",
      "full_name",
      "name",
    ]) || "Client";

  const referenceNumber =
    readString(request, [
      "reference_number",
      "service_request_reference_number",
      "request_reference_number",
    ]) || undefined;

  const requestTitle =
    readString(request, ["title", "service_name", "service_title"]) || undefined;

  return {
    clientId,
    clientName,
    referenceNumber,
    requestTitle,
  };
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatStatus(value?: string, active?: boolean) {
  if (typeof active === "boolean") return active ? "Active" : "Inactive";
  if (!value) return "Active";

  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AccountantTaxCredentialsPage() {
  const [clients, setClients] = useState<AssignedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [credentials, setCredentials] = useState<TaxCredential[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);

    try {
      const result = await api.get<unknown>("/accountant/assignments?page_size=500");
      const assignments = getItems<unknown>(result.data);

      const map = new Map<string, AssignedClient>();

      for (const assignment of assignments) {
        const client = normaliseAssignedClient(assignment);

        if (client && !map.has(client.clientId)) {
          map.set(client.clientId, client);
        }
      }

      const list = Array.from(map.values()).sort((a, b) =>
        a.clientName.localeCompare(b.clientName),
      );

      setClients(list);

      if (!selectedClientId && list.length > 0) {
        setSelectedClientId(list[0].clientId);
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load assigned clients."));
    } finally {
      setLoadingClients(false);
    }
  }, [selectedClientId]);

  const loadCredentials = useCallback(async (clientId: string) => {
    if (!clientId) {
      setCredentials([]);
      return;
    }

    setLoadingCredentials(true);

    try {
      const result = await api.get<unknown>(
        `/accountant/tax-credentials?client_id=${encodeURIComponent(clientId)}&page_size=100`,
      );

      setCredentials(getItems<TaxCredential>(result.data));
    } catch (error) {
      setCredentials([]);
      toast.error(getSafeErrorMessage(error, "Failed to load tax credentials."));
    } finally {
      setLoadingCredentials(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadCredentials(selectedClientId);
  }, [loadCredentials, selectedClientId]);

  useEffect(() => {
    return () => {
      setRevealedPasswords({});
    };
  }, []);

  const selectedClient = clients.find((client) => client.clientId === selectedClientId);

  const filteredCredentials = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return credentials;

    return credentials.filter((credential) =>
      [
        credential.system_name,
        credential.system_code,
        credential.username,
        credential.identifier,
        credential.notes,
        credential.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [credentials, search]);

  const handleReveal = async (credential: TaxCredential) => {
    if (revealedPasswords[credential.id]) {
      setRevealedPasswords((current) => {
        const next = { ...current };
        delete next[credential.id];
        return next;
      });
      return;
    }

    setRevealingId(credential.id);

    try {
      const result = await api.post<unknown>(
        `/accountant/tax-credentials/reveal?id=${encodeURIComponent(credential.id)}`,
        {},
      );

      const data =
        result.data && typeof result.data === "object"
          ? (result.data as Record<string, unknown>)
          : {};

      const password =
        typeof data.password === "string"
          ? data.password
          : typeof data.revealed_password === "string"
            ? data.revealed_password
            : "";

      if (!password) {
        throw new Error("Password was not returned by the backend.");
      }

      setRevealedPasswords((current) => ({
        ...current,
        [credential.id]: password,
      }));
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to reveal password."));
    } finally {
      setRevealingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-gold">
          Accountant Portal
        </p>

        <h1 className="text-2xl font-bold text-navy">Tax Credentials</h1>

        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          View tax system credentials only for clients connected to your assigned work.
        </p>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[300px_1fr_auto]">
        <select
          value={selectedClientId}
          onChange={(event) => {
            setRevealedPasswords({});
            setSelectedClientId(event.target.value);
          }}
          disabled={loadingClients}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
        >
          <option value="">Select assigned client</option>
          {clients.map((client) => (
            <option key={client.clientId} value={client.clientId}>
              {client.clientName}
              {client.referenceNumber ? ` — ${client.referenceNumber}` : ""}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search system, username, notes..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>

        <button
          type="button"
          onClick={() => void loadCredentials(selectedClientId)}
          disabled={loadingCredentials || !selectedClientId}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
        >
          <RefreshCcw
            size={15}
            className={loadingCredentials ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      {selectedClient ? (
        <div className="mb-6 rounded-xl border border-teal/20 bg-teal/5 p-4">
          <p className="text-sm font-semibold text-navy">
            Selected client: {selectedClient.clientName}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {selectedClient.referenceNumber || "Assigned client"}{" "}
            {selectedClient.requestTitle ? `· ${selectedClient.requestTitle}` : ""}
          </p>
        </div>
      ) : null}

      {loadingClients || loadingCredentials ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : !selectedClientId ? (
        <EmptyMessage
          title="No assigned clients found"
          description="Tax credentials appear after you have assigned work connected to a client."
        />
      ) : filteredCredentials.length === 0 ? (
        <EmptyMessage
          title="No tax credentials found"
          description="No credentials are available for this assigned client."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCredentials.map((credential) => {
            const revealed = revealedPasswords[credential.id];

            return (
              <div
                key={credential.id}
                className="rounded-xl border border-gray-100 bg-white p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white">
                      <KeyRound size={18} />
                    </div>

                    <h2 className="truncate font-bold text-navy">
                      {credential.system_name || credential.system_code || "Tax System"}
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      {formatStatus(credential.status, credential.is_active)}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      credential.is_active === false
                        ? "bg-red-50 text-red-700"
                        : "bg-teal/10 text-teal",
                    )}
                  >
                    {credential.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <Field label="Username" value={credential.username || credential.identifier || "—"} />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Password
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-lightgray px-3 py-2 text-xs text-navy">
                        {revealed || "••••••••••••"}
                      </code>

                      <button
                        type="button"
                        onClick={() => void handleReveal(credential)}
                        disabled={revealingId === credential.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
                      >
                        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        {revealed ? "Hide" : "Reveal"}
                      </button>
                    </div>
                  </div>

                  {credential.login_url ? (
                    <a
                      href={credential.login_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs font-semibold text-teal hover:underline"
                    >
                      Open login portal
                    </a>
                  ) : null}

                  {credential.notes ? (
                    <Field label="Notes" value={credential.notes} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-navy">{value}</p>
    </div>
  );
}

function EmptyMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lightgray">
        <ShieldCheck size={24} className="text-gray-300" />
      </div>

      <h2 className="font-bold text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}