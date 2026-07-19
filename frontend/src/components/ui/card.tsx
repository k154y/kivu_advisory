import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type DivProps = HTMLAttributes<HTMLDivElement>;
type HeadingProps = HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = HTMLAttributes<HTMLParagraphElement>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn("space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HeadingProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-slate-950",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ParagraphProps) {
  return (
    <p
      className={cn("text-sm leading-6 text-slate-600", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-slate-100 p-6",
        className,
      )}
      {...props}
    />
  );
}