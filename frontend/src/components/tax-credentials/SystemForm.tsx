"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

export type TaxCredentialSystem = {
  id: string;
  system_name: string;
  login_url: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TaxCredentialSystemPayload = {
  system_name: string;
  login_url: string;
  description: string;
  display_order: number;
  is_active: boolean;
};

type SystemFormProps = {
  initialValue?: TaxCredentialSystem | null;
  submitting?: boolean;
  onSubmit: (payload: TaxCredentialSystemPayload) => Promise<void>;
  onCancel: () => void;
};

const emptyForm: TaxCredentialSystemPayload = {
  system_name: "",
  login_url: "",
  description: "",
  display_order: 0,
  is_active: true,
};

export function SystemForm({
  initialValue,
  submitting = false,
  onSubmit,
  onCancel,
}: SystemFormProps) {
  const [form, setForm] = useState<TaxCredentialSystemPayload>(emptyForm);

  useEffect(() => {
    if (!initialValue) {
      setForm(emptyForm);
      return;
    }

    setForm({
      system_name: initialValue.system_name || "",
      login_url: initialValue.login_url || "",
      description: initialValue.description || "",
      display_order: initialValue.display_order || 0,
      is_active: initialValue.is_active !== false,
    });
  }, [initialValue]);

  const updateField = <K extends keyof TaxCredentialSystemPayload>(
    field: K,
    value: TaxCredentialSystemPayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.system_name.trim()) {
      toast.error("System name is required.");
      return;
    }

    if (!form.login_url.trim()) {
      toast.error("Login URL is required.");
      return;
    }

    if (
      !form.login_url.trim().startsWith("http://") &&
      !form.login_url.trim().startsWith("https://")
    ) {
      toast.error("Login URL must start with http:// or https://.");
      return;
    }

    if (form.display_order < 0) {
      toast.error("Display order must be zero or higher.");
      return;
    }

    await onSubmit({
      ...form,
      system_name: form.system_name.trim(),
      login_url: form.login_url.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="System Name *"
        value={form.system_name}
        onChange={(value) => updateField("system_name", value)}
        placeholder="RRA Tax Portal"
      />

      <Input
        label="Login URL *"
        value={form.login_url}
        onChange={(value) => updateField("login_url", value)}
        placeholder="https://etax.rra.gov.rw/"
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-charcoal">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          placeholder="Short description of this external system"
        />
      </div>

      <Input
        label="Display Order"
        type="number"
        value={String(form.display_order)}
        onChange={(value) => updateField("display_order", Number(value || 0))}
      />

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) => updateField("is_active", event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
        />
        Active system
      </label>

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
          {submitting ? "Saving..." : "Save System"}
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