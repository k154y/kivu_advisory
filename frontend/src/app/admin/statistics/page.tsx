"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type Statistic = {
  id: string;
  value: string;
  label: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type StatEdit = {
  value?: string;
  label?: string;
  description?: string;
};

const statisticPaths = {
  list: "/admin/statistics?page_size=100",
  detail: (id: string) =>
    `/admin/statistics/detail?id=${encodeURIComponent(id)}`,
};

function getStatisticItems(response: unknown): Statistic[] {
  if (Array.isArray(response)) {
    return response as Statistic[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: Statistic[];
    data?: Statistic[] | { items?: Statistic[] };
  };

  if (Array.isArray(objectResponse.items)) {
    return objectResponse.items;
  }

  if (Array.isArray(objectResponse.data)) {
    return objectResponse.data;
  }

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildPayload(stat: Statistic, patch: StatEdit) {
  return {
    value: patch.value ?? stat.value,
    label: patch.label ?? stat.label,
    description: patch.description ?? stat.description ?? "",
    display_order: stat.display_order ?? 0,
    is_active: stat.is_active ?? true,
  };
}

export default function AdminStatisticsPage() {
  const [stats, setStats] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, StatEdit>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api.get<unknown>(statisticPaths.list);
      const items = getStatisticItems(result.data).sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0),
      );

      setStats(items);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load statistics."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (id: string, field: keyof StatEdit, value: string) => {
    setEdits((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [field]: value,
      },
    }));
  };

  const get = (stat: Statistic, field: keyof StatEdit) => {
    const editedValue = edits[stat.id]?.[field];

    if (editedValue !== undefined) {
      return editedValue;
    }

    if (field === "value") return stat.value || "";
    if (field === "label") return stat.label || "";
    if (field === "description") return stat.description || "";

    return "";
  };

  const hasChanges = (id: string) => {
    return Boolean(edits[id] && Object.keys(edits[id]).length > 0);
  };

  const handleSave = async (stat: Statistic) => {
    const patch = edits[stat.id];

    if (!patch || Object.keys(patch).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(stat.id);

    try {
      const payload = buildPayload(stat, patch);

      await api.put(statisticPaths.detail(stat.id), payload);

      toast.success(`"${payload.label}" updated.`);

      setStats((current) =>
        current.map((item) =>
          item.id === stat.id
            ? {
                ...item,
                ...payload,
              }
            : item,
        ),
      );

      setEdits((current) => {
        const next = { ...current };
        delete next[stat.id];
        return next;
      });
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to save statistic."),
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Statistics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update the numbers displayed in the homepage statistics bar.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl border border-gray-100 bg-white p-5"
            />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
          No statistics found.
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map((stat) => {
            const changed = hasChanges(stat.id);

            return (
              <div
                key={stat.id}
                className={`rounded-xl border bg-white p-5 transition-colors ${
                  changed ? "border-teal/40" : "border-gray-100"
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                      <TrendingUp size={15} className="text-gold" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {get(stat, "label") || "Statistic"}
                      </p>

                      {changed ? (
                        <p className="text-xs text-teal">
                          Unsaved changes
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSave(stat)}
                    disabled={saving === stat.id || !changed}
                    className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-default disabled:opacity-40"
                  >
                    <Save size={12} />
                    {saving === stat.id ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Value *
                    </label>

                    <input
                      type="text"
                      value={get(stat, "value")}
                      onChange={(event) =>
                        update(stat.id, "value", event.target.value)
                      }
                      placeholder="500+"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />

                    <p className="mt-1 text-xs text-gray-400">
                      Include suffix in the value, for example 500+ or 98%.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Label *
                    </label>

                    <input
                      type="text"
                      value={get(stat, "label")}
                      onChange={(event) =>
                        update(stat.id, "label", event.target.value)
                      }
                      placeholder="Clients Served"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs text-gray-500">
                    Description
                  </label>

                  <textarea
                    rows={2}
                    value={get(stat, "description")}
                    onChange={(event) =>
                      update(stat.id, "description", event.target.value)
                    }
                    placeholder="Optional short description"
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div className="mt-3 rounded-lg bg-lightgray p-3">
                  <p className="text-xs text-gray-500">
                    Preview:{" "}
                    <span className="font-bold text-navy">
                      {get(stat, "value") || "—"}
                    </span>{" "}
                    <span className="text-gray-600">
                      {get(stat, "label") || "Statistic label"}
                    </span>
                  </p>

                  {get(stat, "description") ? (
                    <p className="mt-1 text-xs text-gray-400">
                      {get(stat, "description")}
                    </p>
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