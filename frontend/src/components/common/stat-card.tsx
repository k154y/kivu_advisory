import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  footer,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </p>

            {description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>

          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F2742]/10 text-[#0F2742]">
              {icon}
            </div>
          ) : null}
        </div>

        {trend ? <div className="mt-4">{trend}</div> : null}

        {footer ? (
          <div className="mt-5 border-t border-slate-100 pt-4">{footer}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export type { StatCardProps };