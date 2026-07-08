"use client";

import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type DashboardTopbarProps = {
  className?: string;
};

const getTitleFromPathname = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return "Dashboard";
  }

  const lastPart = parts[parts.length - 1];

  if (lastPart === "dashboard") return "Dashboard";
  if (lastPart === "assigned-work") return "Assigned Work";
  if (lastPart === "service-requests") return "Service Requests";

  if (lastPart === "create") {
    const previousPart = parts[parts.length - 2] || "Create";
    return `Create ${previousPart
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())}`;
  }

  if (lastPart.startsWith("[") && lastPart.endsWith("]")) {
    return "Details";
  }

  return lastPart
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export function DashboardTopbar({ className }: DashboardTopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const title = getTitleFromPathname(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur",
        className,
      )}
    >
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
            Kivu Advisory
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold text-slate-950">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="max-w-[220px] truncate text-sm font-medium text-slate-950">
              {user?.full_name || "User"}
            </p>
            <p className="max-w-[220px] truncate text-xs text-slate-500">
              {user?.email}
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

export type { DashboardTopbarProps };