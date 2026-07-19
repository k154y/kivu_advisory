"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Calendar,
  Eye,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminAccountantPaths,
  buildCreateAccountantPayload,
  emptyAccountantForm,
  formatAccountantDate,
  loadAccountants,
  validateStrongPassword,
  type AccountantFormState,
  type AdminAccountant,
} from "@/lib/admin-accountants";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminAccountantsPage() {
  const [accountants, setAccountants] = useState<AdminAccountant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AccountantFormState>(emptyAccountantForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const items = await loadAccountants();
      setAccountants(items);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load accountants."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyAccountantForm);
  };

  const handleCreate = async () => {
    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Email address is required.");
      return;
    }

    if (!form.password) {
      toast.error("Password is required.");
      return;
    }

    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }

    const passwordErrors = validateStrongPassword(form.password);

    if (passwordErrors.length > 0) {
      toast.error(`Password is weak: ${passwordErrors.join(", ")}.`);
      return;
    }

    setSaving(true);

    try {
      await api.post(
        adminAccountantPaths.create,
        buildCreateAccountantPayload(form),
      );

      toast.success("Accountant account created.");
      closeModal();
      await load();
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to create accountant account."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (accountant: AdminAccountant) => {
    setToggling(accountant.id);

    try {
      await api.patch(adminAccountantPaths.status(accountant.id), {
        is_active: !accountant.is_active,
      });

      toast.success(
        accountant.is_active
          ? "Accountant account suspended."
          : "Accountant account activated.",
      );

      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update status."));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Accountants</h1>
          <p className="mt-1 text-sm text-gray-500">
            {accountants.length} accountant
            {accountants.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          <Plus size={16} />
          Add Accountant
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading accountants...
          </div>
        ) : accountants.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 text-teal">
              <ShieldCheck size={20} />
            </div>

            <p className="text-sm font-semibold text-navy">
              No accountants yet
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Add the first accountant account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-gray-100 bg-lightgray">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Added
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {accountants.map((accountant) => (
                  <tr key={accountant.id} className="hover:bg-lightgray/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                          {getInitials(accountant.full_name)}
                        </div>

                        <div>
                          <p className="font-semibold text-navy">
                            {accountant.full_name}
                          </p>
                          <p className="text-xs capitalize text-gray-400">
                            {accountant.role || "accountant"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Mail size={12} className="text-gray-400" />
                        {accountant.email}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {accountant.phone ? (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone size={12} className="text-gray-400" />
                          {accountant.phone}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not provided
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar size={12} />
                        {formatAccountantDate(accountant.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          accountant.is_active
                            ? "bg-teal-50 text-teal"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {accountant.is_active ? (
                          <UserCheck size={11} />
                        ) : (
                          <UserX size={11} />
                        )}
                        {accountant.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={routes.admin.accountantDetail(accountant.id)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-navy hover:text-navy"
                        >
                          <span className="flex items-center gap-1.5">
                            <Eye size={13} />
                            View
                          </span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleToggle(accountant)}
                          disabled={toggling === accountant.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            accountant.is_active
                              ? "border border-red-200 text-red-600 hover:bg-red-50"
                              : "border border-teal-200 text-teal hover:bg-teal-50"
                          }`}
                        >
                          {toggling === accountant.id
                            ? "..."
                            : accountant.is_active
                              ? "Suspend"
                              : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-navy">
                  Add Accountant
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create a staff account with accountant permissions.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="Jean-Pierre Nkurunziza"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="accountant@kivuadvisory.com"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="078 XXX XXXX"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Minimum 10 characters"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Use uppercase, lowercase, number, and special character.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirm_password: event.target.value,
                    }))
                  }
                  placeholder="Repeat password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}