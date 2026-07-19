"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MessageSquareText,
  UserCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { clientNavigation, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type DashboardTopbarProps = {
  className?: string;
  variant?: "default" | "client";
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

const clientIcons = {
  [routes.client.dashboard]: Home,
  [routes.client.requests]: FileText,
  [routes.client.documents]: FolderOpen,
  [routes.client.messages]: MessageSquareText,
  [routes.client.profile]: UserCircle,
} as const;

export function DashboardTopbar({
  className,
  variant = "default",
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const title = getTitleFromPathname(pathname);

  if (variant === "client") {
    return (
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-white/10 bg-[#092B44] text-white",
          className,
        )}
      >
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={routes.home} className="flex items-center gap-1">
            <span className="text-lg font-bold tracking-tight">Kivu Advisory</span>
            <span className="mb-2.5 h-1.5 w-1.5 rounded-full bg-[#C99A35]" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {clientNavigation.map((item) => {
              const Icon = clientIcons[item.href as keyof typeof clientIcons] || Home;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    isActive
                      ? "bg-white/10 font-semibold text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[220px] truncate text-sm font-medium text-white">
                {user?.full_name || "Client"}
              </p>
              <p className="max-w-[220px] truncate text-xs text-slate-300">
                {user?.email}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-300 hover:bg-white/5 hover:text-red-300"
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
    );
  }

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
