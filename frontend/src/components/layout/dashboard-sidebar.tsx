"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BarChart2,
  BookOpen,
  Calendar,
  Edit3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  ShieldCheck,
  Star,
  UserCheck,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

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

type NavigationItem = {
  label: string;
  href: string;
};

type SidebarContentProps = {
  className?: string;
  onClose?: () => void;
};

type SidebarIcon = ComponentType<{ size?: number; className?: string }>;

const adminIconByHref: Record<string, SidebarIcon> = {
  [routes.admin.dashboard]: LayoutDashboard,
  [routes.admin.requests]: FileText,
  [routes.admin.consultations]: Calendar,
  [routes.admin.clients]: Users,
  [routes.admin.accountants]: UserCheck,
  [routes.admin.documents]: FolderOpen,
  [routes.admin.messages]: MessagesSquare,
  [routes.admin.profile]: UserCircle,
  [routes.admin.auditLog]: ShieldCheck,
  [routes.admin.contentManager]: Edit3,
  [routes.admin.services]: BookOpen,
  [routes.admin.staff]: Users,
  [routes.admin.blog]: MessageSquare,
  [routes.admin.testimonials]: Star,
  [routes.admin.socialLinks]: Edit3,
  [routes.admin.statistics]: BarChart2,
  [routes.admin.settings]: ShieldCheck,
};

const clientIconByHref: Record<string, SidebarIcon> = {
  [routes.client.dashboard]: LayoutDashboard,
  [routes.client.requests]: FileText,
  [routes.client.documents]: FolderOpen,
  [routes.client.messages]: MessagesSquare,
  [routes.client.profile]: UserCircle,
};

const accountantIconByHref: Record<string, SidebarIcon> = {
  [routes.accountant.dashboard]: LayoutDashboard,
  [routes.accountant.assignedWork]: FileText,
  [routes.accountant.messages]: MessagesSquare,
  [routes.accountant.profile]: UserCircle,
};

const getNavigationByRole = (role?: UserRole): NavigationItem[] => {
  if (role === "admin") return adminNavigation;
  if (role === "client") return clientNavigation;
  if (role === "accountant") return accountantNavigation;

  return [];
};

const getIconByRoleAndHref = (role: UserRole | undefined, href: string) => {
  if (role === "admin") return adminIconByHref[href] || FileText;
  if (role === "client") return clientIconByHref[href] || FileText;
  if (role === "accountant") return accountantIconByHref[href] || FileText;

  return FileText;
};

const getRoleLabel = (role?: UserRole) => {
  if (role === "admin") return "Administrator";
  if (role === "client") return "Client";
  if (role === "accountant") return "Accountant";

  return "User";
};

function SidebarContent({ className, onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigation = getNavigationByRole(user?.role);
  const displayName = user?.full_name || user?.email || "User";

  const handleLogout = () => {
    logout();
    toast.success("Logged out.");
    router.replace(routes.login);
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-screen w-72 shrink-0 flex-col overflow-hidden bg-navy text-white",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link href={routes.home} onClick={onClose} className="flex items-center">
          <span className="text-xl font-bold tracking-tight text-white">
            Kivu Advisory
          </span>
          <span className="mb-2.5 ml-1 h-1.5 w-1.5 rounded-full bg-gold" />
        </Link>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navigation.map((item, index) => {
          const Icon = getIconByRoleAndHref(user?.role, item.href);
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          const shouldAddSeparator =
            user?.role === "admin" &&
            item.href === routes.admin.contentManager;

          return (
            <div key={item.href}>
              {shouldAddSeparator ? (
                <div className="my-3 border-t border-white/10" />
              ) : null}

              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-teal text-white"
                    : "text-gray-400 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            {getSafeInitials(displayName)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {displayName}
            </p>

            <p className="truncate text-xs capitalize text-gray-400">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 text-xs text-gray-400 transition-colors hover:text-red-400"
        >
          <LogOut size={13} />
          Log Out
        </button>
      </div>
    </aside>
  );
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="hidden lg:block">
        <SidebarContent className={className} />
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white shadow-md lg:hidden"
      >
        <Menu size={18} />
      </button>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />

          <div className="fixed left-0 top-0 z-50 h-full lg:hidden">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      ) : null}
    </>
  );
}

export type { DashboardSidebarProps };