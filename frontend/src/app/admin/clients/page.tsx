"use client";

import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";

import { ClientsTable, type AdminClientListItem } from "@/components/admin/clients-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems, extractPaginationInfo, getSafeErrorMessage } from "@/lib/portal";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      const load = async () => {
        setLoading(true);
        setError(null);

        try {
          const result = await api.get(
            endpoints.admin.clients({ search: search || undefined, page, page_size: 20 }),
          );

          if (!cancelled) {
            setClients(extractItems<AdminClientListItem>(result.data));
            setTotalPages(extractPaginationInfo(result.data).totalPages);
          }
        } catch (loadError) {
          if (!cancelled) {
            setClients([]);
            setError(getSafeErrorMessage(loadError, "Clients could not be loaded."));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      void load();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [search, page]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {clients.length} client{clients.length !== 1 ? "s" : ""} on this page
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8">
            <EmptyState
              title="Clients unavailable"
              description={error}
              icon={<Users className="h-5 w-5" />}
            />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {search ? "No clients match your search" : "No registered clients yet"}
          </div>
        ) : (
          <ClientsTable clients={clients} />
        )}
      </div>

      {!loading && !error && clients.length > 0 ? (
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
