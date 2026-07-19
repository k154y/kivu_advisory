"use client";

import { Copy, Edit3, ExternalLink, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RevealPasswordButton } from "@/components/tax-credentials/RevealPasswordButton";
import { StatusBadge } from "@/components/tax-credentials/StatusBadge";
import type { ClientTaxCredential } from "@/components/tax-credentials/CredentialForm";

type CredentialCardProps = {
  credential: ClientTaxCredential;
  revealEndpoint: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (credential: ClientTaxCredential) => void;
  onDelete?: (credential: ClientTaxCredential) => void;
};

function formatDate(value?: string) {
  if (!value) return "Never";

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

export function CredentialCard({
  credential,
  revealEndpoint,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: CredentialCardProps) {
  const copyUsername = async () => {
    await navigator.clipboard.writeText(credential.username);
    toast.success("Username copied.");
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-navy">
            <KeyRound size={18} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-navy">
              {credential.system_name}
            </h3>

            <a
              href={credential.login_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-teal hover:underline"
            >
              <span className="truncate">{credential.login_url}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <StatusBadge active={credential.is_active !== false} />
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-lightgray p-3">
          <p className="text-xs font-semibold text-gray-400">Username</p>

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate font-mono text-sm text-charcoal">
              {credential.username}
            </p>

            <button
              type="button"
              onClick={copyUsername}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-navy"
            >
              <Copy size={13} />
              Copy
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-lightgray p-3">
          <p className="text-xs font-semibold text-gray-400">Password</p>
          <p className="mt-1 font-mono text-sm text-charcoal">
            {credential.has_password ? "••••••••" : "No password"}
          </p>
        </div>

        {credential.notes ? (
          <div className="rounded-lg bg-lightgray p-3">
            <p className="text-xs font-semibold text-gray-400">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-charcoal">
              {credential.notes}
            </p>
          </div>
        ) : null}

        <p className="text-xs text-gray-400">
          Last revealed: {formatDate(credential.last_revealed_at)}
        </p>

        <RevealPasswordButton
          credentialId={credential.id}
          revealEndpoint={revealEndpoint}
        />
      </div>

      {canEdit || canDelete ? (
        <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4">
          {canEdit ? (
            <button
              type="button"
              onClick={() => onEdit?.(credential)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-lightgray"
            >
              <Edit3 size={13} />
              Edit
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete?.(credential)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}