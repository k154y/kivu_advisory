"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  AccountantFormState,
  adminAccountantPaths,
  buildCreateAccountantPayload,
  emptyAccountantForm,
  validateStrongPassword,
} from "@/lib/admin-accountants";

export function AccountantForm() {
  const router = useRouter();

  const [form, setForm] = useState<AccountantFormState>(emptyAccountantForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const passwordErrors = validateStrongPassword(form.password);

  const updateForm = <K extends keyof AccountantFormState>(
    field: K,
    value: AccountantFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    if (passwordErrors.length > 0) {
      toast.error("Password is not strong enough.");
      return;
    }

    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      await api.post(
        adminAccountantPaths.create,
        buildCreateAccountantPayload(form),
      );

      toast.success("Accountant account created.");
      router.replace("/admin/accountants");
    } catch {
      toast.error("Failed to create accountant account.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-navy p-6 text-white">
        <Link
          href="/admin/accountants"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Accountants
        </Link>

        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
          Admin
        </p>

        <h1 className="text-2xl font-bold">Create Accountant Account</h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
          Create a staff login account for an accountant. The accountant will
          use this account to access assigned work and messages.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              label="Full Name"
              value={form.full_name}
              onChange={(value) => updateForm("full_name", value)}
              placeholder="Accountant full name"
              required
            />

            <TextInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => updateForm("email", value)}
              placeholder="accountant@example.com"
              required
            />

            <TextInput
              label="Phone"
              value={form.phone}
              onChange={(value) => updateForm("phone", value)}
              placeholder="0786196355"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <PasswordInput
              label="Password"
              value={form.password}
              show={showPassword}
              onToggleShow={() => setShowPassword((value) => !value)}
              onChange={(value) => updateForm("password", value)}
              placeholder="Strong password"
              required
            />

            <PasswordInput
              label="Confirm Password"
              value={form.confirm_password}
              show={showPassword}
              onToggleShow={() => setShowPassword((value) => !value)}
              onChange={(value) => updateForm("confirm_password", value)}
              placeholder="Repeat password"
              required
            />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-navy">
              <ShieldCheck size={18} />
              Password Rules
            </h2>

            <div className="space-y-2">
              {[
                "At least 10 characters",
                "At least one uppercase letter",
                "At least one lowercase letter",
                "At least one number",
                "At least one special character",
              ].map((rule) => {
                const failed = passwordErrors.includes(rule);

                return (
                  <div
                    key={rule}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      form.password && !failed
                        ? "bg-teal-50 text-teal"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {rule}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-navy">Preview</h2>

            <p className="text-lg font-bold text-navy">
              {form.full_name || "Accountant name"}
            </p>

            <p className="mt-1 text-sm text-gray-600">
              {form.email || "accountant@example.com"}
            </p>

            {form.phone ? (
              <p className="mt-1 text-sm text-gray-600">{form.phone}</p>
            ) : null}

            <p className="mt-4 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal">
              Accountant
            </p>
          </section>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? "Creating..." : "Create Accountant"}
          </button>
        </aside>
      </form>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: TextInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
    </label>
  );
}

type PasswordInputProps = {
  label: string;
  value: string;
  show: boolean;
  onToggleShow: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

function PasswordInput({
  label,
  value,
  show,
  onToggleShow,
  onChange,
  placeholder,
  required,
}: PasswordInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}