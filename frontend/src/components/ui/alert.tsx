import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
};

const alertVariants: Record<AlertVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const defaultIcons: Record<AlertVariant, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "!",
};

export function Alert({
  variant = "info",
  title,
  icon,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        alertVariants[variant],
        className,
      )}
      {...props}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
        {icon || defaultIcons[variant]}
      </div>

      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}

        {children ? (
          <div className={cn("leading-6", title && "mt-1")}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export type { AlertProps, AlertVariant };