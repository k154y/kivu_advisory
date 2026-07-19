import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataToolbarProps = {
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function DataToolbar({
  children,
  actions,
  className,
}: DataToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4",
        "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      {children ? (
        <div className="grid flex-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      ) : null}

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type { DataToolbarProps };