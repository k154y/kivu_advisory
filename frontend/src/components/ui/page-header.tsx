import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-slate-200 pb-6",
        "md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-4">{children}</div> : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type { PageHeaderProps };