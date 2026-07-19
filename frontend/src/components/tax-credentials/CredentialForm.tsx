"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

import type { TaxCredentialSystem } from "@/components/tax-credentials/SystemForm";

export type ClientTaxCredential = {
  id: string;
  client_id?: string;
  system_id: string;
  system_name: string;
  login_url: string;
  username: string;
  notes?: string;
  is_active?: boolean;
  has_password: boolean;
  last_revealed_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type CredentialCreatePayload = {
  system_id: string;
  username: string;
  password: string;
  notes: string;
};

export type CredentialUpdatePayload = {
  username: string;
  password?: string;
  notes: string;
  is_active: boolean;
};

type CredentialFormProps = {
  mode: "create" | "update";
  systems: TaxCredentialSystem[];
  initialValue?: ClientTaxCredential | null;
  submitting?: boolean;
  onSubmit: (
    payload: CredentialCreatePayload | CredentialUpdatePayload,
  ) => Promise<void>;
  onCancel: () => void;
};

type CredentialFormState = {
  system_id: string;
  username: string;
  password: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: CredentialFormState = {
  system_id: "",
  username: "",
  password: "",
  notes: "",
  is_active: true,
};

export function CredentialForm({
  mode,
  systems,
  initialValue,
  submitting = false,
  onSubmit,
  onCancel,
}: CredentialFormProps) {
  const [form, setForm] = useState<CredentialFormState>(emptyForm);

  useEffect(() => {
    if (!initialValue) {
      setForm(emptyForm);
      return;
    }

    setForm({
      system_id: initialValue.system_id || "",
      username: initialValue.username || "",
      password: "",
      notes: initialValue.notes || "",
      is_active: initialValue.is_active !== false,
    });
  }, [initialValue]);

  const selectedSystem = useMemo(() => {
    return systems.find((system) => system.id === form.system_id) || null;
  }, [systems, form.system_id]);

  const updateField = <K extends keyof CredentialFormState>(
    field: K,
    value: CredentialFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "create" && !form.system_id) {
      toast.error("Please select a tax system.");
      return;
    }

    if (!form.username.trim()) {
      toast.error("Username is required.");
      return;
    }

    if (mode === "create" && !form.password.trim()) {
      toast.error("Password is required.");
      return;
    }

    if (mode === "create") {
      await onSubmit({
        system_id: form.system_id,
        username: form.username.trim(),
        password: form.password,
        notes: form.notes.trim(),
      });

      return;
    }

    const updatePayload: CredentialUpdatePayload = {
      username: form.username.trim(),
      notes: form.notes.trim(),
      is_active: form.is_active,
    };

    if (form.password.trim()) {
      updatePayload.password = form.password;
    }

    await onSubmit(updatePayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "create" ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal">
            Tax System *
          </label>

          <select
            value={form.system_id}
            onChange={(event) => updateField("system_id", event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            <option value="">Select system</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.system_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {selectedSystem ? (
        <div className="rounded-lg bg-lightgray p-3">
          <p className="text-xs font-semibold text-gray-500">Login URL</p>
          <a
            href={selectedSystem.login_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
          >
            {selectedSystem.login_url}
            <ExternalLink size={13} />
          </a>
        </div>
      ) : initialValue?.login_url ? (
        <div className="rounded-lg bg-lightgray p-3">
          <p className="text-xs font-semibold text-gray-500">Login URL</p>
          <a
            href={initialValue.login_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
          >
            {initialValue.login_url}
            <ExternalLink size={13} />
          </a>
        </div>
      ) : null}

      <Input
        label="Username *"
        value={form.username}
        onChange={(value) => updateField("username", value)}
        placeholder="client_rra_username"
      />

      <Input
        label={mode === "create" ? "Password *" : "New Password"}
        type="password"
        value={form.password}
        onChange={(value) => updateField("password", value)}
        placeholder={
          mode === "create"
            ? "Enter password"
            : "Leave empty to keep current password"
        }
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          placeholder="Optional notes"
        />
      </div>

      {mode === "update" ? (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField("is_active", event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
          />
          Active credential
        </label>
      ) : null}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-lightgray"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-teal disabled:opacity-50"
        >
          <Save size={15} />
          {submitting ? "Saving..." : "Save Credential"}
        </button>
      </div>
    </form>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: InputProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
    </div>
  );
}