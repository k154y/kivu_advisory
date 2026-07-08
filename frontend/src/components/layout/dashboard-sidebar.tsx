"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import {
  accountantNavigation,
  adminNavigation,
  clientNavigation,
  routes,
} from "@/lib/routes";
import { cn, getSafeInitials } from "@/lib/utils";
import type { UserRole } from "@/types/api";

type DashboardSidebarProps = {
  className?: string;
};

const getNavigationByRole = (role?: UserRole) => {
  if (role === "admin") return adminNavigation;
  if (role === "client") return clientNavigation;
  if (role === "accountant") return accountantNavigation;

  return [];
};

const getRoleLabel = (role?: UserRole) => {
  if (role === "admin") return "Administrator";
  if (role === "client") return "Client";
  if (role === "accountant") return "Accountant";

  return "User";
};

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigation = getNavigationByRole(user?.role);

  return (
    <aside
      className={cn(
        "hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-6 py-5">
          <Link href={routes.home} className="block">
            <p className="text-lg font-bold tracking-tight text-[#0F2742]">
              Kivu Advisory
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C99A35]">
              Professional portal
            </p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#0F2742] text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F2742] text-sm font-semibold text-white">
              {getSafeInitials(user?.full_name || user?.email || "User")}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {user?.full_name || "Logged in user"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {getRoleLabel(user?.role)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export type { DashboardSidebarProps };