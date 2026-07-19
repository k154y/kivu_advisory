import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "md" | "lg";
};

type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

const spinnerSizes: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        spinnerSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function LoadingState({
  title = "Loading",
  description = "Please wait while we prepare the information.",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <Spinner className="text-[#0F2742]" size="lg" />

      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200", className)}
      {...props}
    />
  );
}

export type { LoadingStateProps, SkeletonProps, SpinnerProps };