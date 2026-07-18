"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type FloatingStat = {
  id?: string;
  value: string;
  label: string;
  description: string;
  display_order?: number;
  is_active?: boolean;
};

type FloatingStatsProps = {
  stats?: FloatingStat[];
  className?: string;
};

const defaultStats: FloatingStat[] = [
  {
    value: "10+",
    label: "Years experience",
    description: "Accounting, tax, audit, and advisory support.",
    display_order: 1,
    is_active: true,
  },
  {
    value: "500+",
    label: "Clients assisted",
    description: "Businesses, institutions, and entrepreneurs.",
    display_order: 2,
    is_active: true,
  },
  {
    value: "100%",
    label: "Confidential",
    description: "Secure handling of client information and documents.",
    display_order: 3,
    is_active: true,
  },
  {
    value: "24h",
    label: "Response target",
    description: "Fast follow-up for service requests and consultations.",
    display_order: 4,
    is_active: true,
  },
];

function getStatisticItems(response: unknown): FloatingStat[] {
  if (Array.isArray(response)) {
    return response as FloatingStat[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: FloatingStat[];
    data?: FloatingStat[] | { items?: FloatingStat[] };
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

function normalizeStats(items: FloatingStat[]) {
  return items
    .filter((item) => item.is_active !== false)
    .filter((item) => item.value?.trim() && item.label?.trim())
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map((item) => ({
      ...item,
      description: item.description || "",
    }));
}

export function FloatingStats({ stats, className }: FloatingStatsProps) {
  const initialStats = useMemo(() => {
    const providedStats = normalizeStats(stats || []);
    return providedStats.length > 0 ? providedStats : defaultStats;
  }, [stats]);

  const [displayStats, setDisplayStats] = useState<FloatingStat[]>(initialStats);

  useEffect(() => {
    let cancelled = false;

    const loadStatistics = async () => {
      try {
        const result = await api.get<unknown>("/statistics?page_size=20");
        const items = normalizeStats(getStatisticItems(result.data));

        if (!cancelled && items.length > 0) {
          setDisplayStats(items);
        }
      } catch {
        if (!cancelled) {
          setDisplayStats(initialStats);
        }
      }
    };

    void loadStatistics();

    return () => {
      cancelled = true;
    };
  }, [initialStats]);

  const repeatedStats = [...displayStats, ...displayStats];

  return (
    <section
      className={cn(
        "relative z-20 mx-auto -mt-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8",
        className,
      )}
      aria-label="Kivu Advisory key statistics"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="hidden min-w-max animate-[homepageStats_28s_linear_infinite] grid-cols-8 md:grid">
          {repeatedStats.map((stat, index) => (
            <div
              key={`${stat.id || stat.label}-${index}`}
              className="w-72 border-r border-slate-100 px-6 py-6 last:border-r-0"
            >
              <p className="text-3xl font-semibold tracking-tight text-[#0F2742]">
                {stat.value}
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-950">
                {stat.label}
              </p>

              {stat.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {stat.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-0 md:hidden">
          {displayStats.map((stat) => (
            <div
              key={stat.id || stat.label}
              className="border-b border-slate-100 px-6 py-5 last:border-b-0"
            >
              <p className="text-3xl font-semibold tracking-tight text-[#0F2742]">
                {stat.value}
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-950">
                {stat.label}
              </p>

              {stat.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {stat.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export type { FloatingStat, FloatingStatsProps };