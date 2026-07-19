import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DetailRowProps = {
  label: string;
  value?: ReactNode;
  emptyText?: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export function DetailRow({
  label,
  value,
  emptyText = "Not provided",
  className,
  labelClassName,
  valueClassName,
}: DetailRowProps) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    !(typeof value === "string" && value.trim() === "");

  return (
    <div className={cn("border-b border-slate-100 py-4", className)}>
      <dt
        className={cn(
          "text-sm font-medium text-slate-500",
          labelClassName,
        )}
      >
        {label}
      </dt>

      <dd
        className={cn(
          "mt-1 text-sm leading-6 text-slate-900",
          !hasValue && "text-slate-400",
          valueClassName,
        )}
      >
        {hasValue ? value : emptyText}
      </dd>
    </div>
  );
}

export type { DetailRowProps };