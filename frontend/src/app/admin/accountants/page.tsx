"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminAccountant,
  formatAccountantDate,
  loadAccountants,
} from "@/lib/admin-accountants";

export default function AdminAccountantsPage() {
  const [accountants, setAccountants] = useState<AdminAccountant[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const filteredAccountants = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return [...accountants]
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .filter((accountant) => {
        if (!searchValue) return true;

        return (
          accountant.full_name.toLowerCase().includes(searchValue) ||
          accountant.email.toLowerCase().includes(searchValue) ||
          (accountant.phone || "").toLowerCase().includes(searchValue)
        );
      });
  }, [accountants, search]);

  const refreshAccountants = async () => {
    setIsLoading(true);

    try {
      const items = await loadAccountants();
      setAccountants(items);
    } catch {
      toast.error("Failed to load accountants.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAccountants();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Admin
          </p>

          <h1 className="text-2xl font-bold">Manage Accountants</h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            View accountant accounts and create new accountant logins for the
            internal advisory team.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refreshAccountants()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <Link
            href="/admin/accountants/create"
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-navy hover:bg-gold-600"
          >
            <Plus size={16} />
            New Accountant
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search accountants..."
              className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>

          <div className="rounded-lg bg-navy-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total
            </p>
            <p className="text-lg font-bold text-navy">
              {filteredAccountants.length}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading accountants...</p>
        ) : filteredAccountants.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredAccountants.map((accountant) => (
              <Link
                key={accountant.id}
                href={`/admin/accountants/${accountant.id}`}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-navy/30 hover:bg-gray-50"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50">
                    <UserRound size={22} className="text-navy" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-navy">
                      {accountant.full_name}
                    </h2>

                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                        accountant.is_active
                          ? "bg-teal-50 text-teal"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {accountant.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Mail size={15} className="text-gray-400" />
                    <span className="truncate">{accountant.email}</span>
                  </p>

                  {accountant.phone ? (
                    <p className="flex items-center gap-2">
                      <Phone size={15} className="text-gray-400" />
                      <span>{accountant.phone}</span>
                    </p>
                  ) : null}
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  Created: {formatAccountantDate(accountant.created_at)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <UserRound className="mx-auto mb-3 text-gray-300" size={44} />

            <p className="font-semibold text-navy">No accountants found</p>

            <p className="mt-1 text-sm text-gray-500">
              Create your first accountant account.
            </p>

            <Link
              href="/admin/accountants/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700"
            >
              <Plus size={16} />
              New Accountant
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}