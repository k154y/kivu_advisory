"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ClientsTable, type AdminClientListItem } from "@/components/admin/clients-table";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems } from "@/lib/portal";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get(endpoints.admin.clients({ page_size: 100 }));
      setClients(extractItems<AdminClientListItem>(result.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      if (!query) {
        return true;
      }

      return [client.full_name, client.company_name, client.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [clients, search]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {clients.length} registered client{clients.length !== 1 ? "s" : ""}
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
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {search ? "No clients match your search" : "No registered clients yet"}
          </div>
        ) : (
          <ClientsTable clients={filteredClients} />
        )}
      </div>
    </div>
  );
}
