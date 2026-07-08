import { cn } from "@/lib/utils";

type FloatingStat = {
  value: string;
  label: string;
  description: string;
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
  },
  {
    value: "500+",
    label: "Clients assisted",
    description: "Businesses, institutions, and entrepreneurs.",
  },
  {
    value: "100%",
    label: "Confidential",
    description: "Secure handling of client information and documents.",
  },
  {
    value: "24h",
    label: "Response target",
    description: "Fast follow-up for service requests and consultations.",
  },
];

export function FloatingStats({
  stats = defaultStats,
  className,
}: FloatingStatsProps) {
  const repeatedStats = [...stats, ...stats];

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
              key={`${stat.label}-${index}`}
              className="w-72 border-r border-slate-100 px-6 py-6 last:border-r-0"
            >
              <p className="text-3xl font-semibold tracking-tight text-[#0F2742]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {stat.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-0 md:hidden">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border-b border-slate-100 px-6 py-5 last:border-b-0"
            >
              <p className="text-3xl font-semibold tracking-tight text-[#0F2742]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {stat.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export type { FloatingStat, FloatingStatsProps };