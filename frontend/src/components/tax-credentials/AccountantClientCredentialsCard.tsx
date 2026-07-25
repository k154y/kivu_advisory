"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { cn } from "@/lib/utils";
import type {
  AccountantTaxCredential,
  RevealedCredential,
} from "@/types/api";

type AccountantClientCredentialsCardProps = {
  clientId?: string;
  serviceRequestId?: string;
  referenceNumber?: string;
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

function unwrapData<T>(response: unknown): T | null {
  if (!response || typeof response !== "object") return null;

  const objectResponse = response as {
    data?: unknown;
    item?: unknown;
  };

  if (objectResponse.item) return objectResponse.item as T;

  if (objectResponse.data) {
    const nested = objectResponse.data;

    if (nested && typeof nested === "object") {
      const nestedObject = nested as {
        data?: unknown;
        item?: unknown;
      };

      if (nestedObject.item) return nestedObject.item as T;
      if (nestedObject.data) return nestedObject.data as T;
    }

    return nested as T;
  }

  return response as T;
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function copyToClipboard(value: string, label: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error(`Failed to copy ${label.toLowerCase()}.`));
}

export function AccountantClientCredentialsCard({
  clientId,
  serviceRequestId,
  referenceNumber,
}: AccountantClientCredentialsCardProps) {
  const [credentials, setCredentials] = useState<AccountantTaxCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevealing, setIsRevealing] = useState<string | null>(null);
  const [revealedCredential, setRevealedCredential] =
    useState<RevealedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoadCredentials = Boolean(clientId);

  const loadCredentials = useCallback(async () => {
    if (!clientId) {
      setCredentials([]);
      setError(
        "Client credentials cannot be loaded because the assigned request response does not include client_id.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setRevealedCredential(null);

    try {
      const result = await api.get<unknown>(
        endpoints.accountantTaxCredentials.list(clientId),
      );

      setCredentials(getItems<AccountantTaxCredential>(result.data));
    } catch (loadError) {
      setCredentials([]);
      setError(
        getSafeErrorMessage(
          loadError,
          "Client credentials could not be loaded.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  useEffect(() => {
    return () => {
      setRevealedCredential(null);
    };
  }, []);

  const credentialCountLabel = useMemo(() => {
    if (credentials.length === 1) return "1 credential";
    return `${credentials.length} credentials`;
  }, [credentials.length]);

  const handleRevealPassword = async (credential: AccountantTaxCredential) => {
    if (!credential.has_password) return;

    const confirmed = window.confirm(
      "This action will reveal a sensitive client credential. Continue only if needed for the assigned work.",
    );

    if (!confirmed) return;

    setIsRevealing(credential.id);
    setRevealedCredential(null);

    try {
      const result = await api.post<unknown>(
        endpoints.accountantTaxCredentials.reveal(credential.id),
        {},
      );

      const revealed = unwrapData<RevealedCredential>(result.data);

      if (!revealed?.password) {
        throw new Error("Password was not returned by the backend.");
      }

      setRevealedCredential(revealed);
    } catch (revealError) {
      toast.error(
        getSafeErrorMessage(revealError, "Failed to reveal password."),
      );
    } finally {
      setIsRevealing(null);
    }
  };

  return (
    <section className="rounded-xl border border-gray-100 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-navy">
            <KeyRound size={18} />
          </div>

          <div>
            <h2 className="font-bold text-navy">Client Credentials</h2>

            <p className="mt-1 text-xs text-gray-400">
              {referenceNumber || serviceRequestId || "Assigned request"} ·{" "}
              {canLoadCredentials
                ? credentialCountLabel
                : "Client ID unavailable"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCredentials()}
          disabled={isLoading || !canLoadCredentials}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
        >
          <RefreshCcw
            size={14}
            className={isLoading ? "animate-spin" : undefined}
          />
          Refresh
        </button>
      </div>

      {!canLoadCredentials ? (
        <div className="p-5">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Client credentials unavailable
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  Client credentials cannot be loaded because the assigned
                  request response does not include client_id.
                </p>

                <p className="mt-2 text-xs text-amber-700">
                  TODO: backend should include client_id and reference_number in
                  accountant assignment response.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="p-5">
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-xl border border-gray-100 p-4"
              >
                <div className="mb-3 h-4 w-40 rounded bg-gray-100" />
                <div className="mb-2 h-3 w-64 rounded bg-gray-100" />
                <div className="h-3 w-32 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-5">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Credentials unavailable
            </p>

            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      ) : credentials.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lightgray">
            <ShieldCheck size={24} className="text-gray-300" />
          </div>

          <h3 className="font-semibold text-navy">
            No client credentials have been shared for this client yet.
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Credentials added by the client will appear here only when you are
            assigned to work for that client.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {credentials.map((credential) => {
            const isRevealed = revealedCredential?.id === credential.id;

            return (
              <article key={credential.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          credential.is_active
                            ? "bg-teal/10 text-teal"
                            : "bg-red-50 text-red-700",
                        )}
                      >
                        {credential.is_active ? "Active" : "Inactive"}
                      </span>

                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                          credential.has_password
                            ? "bg-navy/5 text-navy"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        <Lock size={12} />
                        {credential.has_password
                          ? "Password stored"
                          : "No password"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-navy">
                      {credential.system_name || "Tax System"}
                    </h3>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <Field label="Username" value={credential.username || "—"} />

                      <Field
                        label="Last revealed"
                        value={formatDateTime(credential.last_revealed_at)}
                      />

                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Login URL
                        </p>

                        {credential.login_url ? (
                          <a
                            href={credential.login_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 break-all text-sm font-medium text-teal hover:underline"
                          >
                            {credential.login_url}
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-gray-500">—</p>
                        )}
                      </div>

                      {credential.notes ? (
                        <div className="sm:col-span-2">
                          <Field label="Notes" value={credential.notes} />
                        </div>
                      ) : null}
                    </dl>

                    {isRevealed ? (
                      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                          <AlertTriangle size={14} />
                          Revealed credential
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <SecureValue
                            label="Username"
                            value={revealedCredential.username}
                          />

                          <SecureValue
                            label="Password"
                            value={revealedCredential.password}
                            sensitive
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(credential.username, "Username")
                      }
                      disabled={!credential.username}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray disabled:opacity-50"
                    >
                      <Copy size={14} />
                      Copy username
                    </button>

                    {isRevealed ? (
                      <button
                        type="button"
                        onClick={() => setRevealedCredential(null)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
                      >
                        <EyeOff size={14} />
                        Hide password
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleRevealPassword(credential)}
                        disabled={
                          !credential.has_password ||
                          isRevealing === credential.id
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-teal disabled:opacity-50"
                      >
                        {isRevealing === credential.id ? (
                          <RefreshCcw size={14} className="animate-spin" />
                        ) : (
                          <Eye size={14} />
                        )}
                        Reveal password
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
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

function SecureValue({
  label,
  value,
  sensitive,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
        {label}
      </p>

      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-navy">
          {value}
        </code>

        <button
          type="button"
          onClick={() => copyToClipboard(value, label)}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
        >
          <Copy size={13} />
          Copy {sensitive ? "password" : "username"}
        </button>
      </div>
    </div>
  );
}