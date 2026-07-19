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
  KeyRound,

} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  adminNavigation,
  clientNavigation,
  routes,
} from "@/lib/routes";
import { cn, getSafeInitials } from "@/lib/utils";
import type { UserRole } from "@/types/api";

type DashboardSidebarProps = {
  className?: string;
  variant?: "admin" | "accountant" | "client";
};

type NavigationItem = {
  label: string;
  href: string;
};

type SidebarContentProps = {
  className?: string;
  onClose?: () => void;
  variant?: "admin" | "accountant" | "client";
};

type SidebarIcon = ComponentType<{ size?: number; className?: string }>;

const accountantNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/accountant/dashboard",
  },
  {
    label: "Assigned Work",
    href: "/accountant/assigned-work",
  },
  {
    label: "Consultations",
    href: "/accountant/consultation",
  },
  {
    label: "My Documents",
    href: "/accountant/documents",
  },
  {
    label: "Messages",
    href: "/accountant/messages",
  },
  {
    label: "Tax Credentials",
    href: "/accountant/tax-credentials",
  },
  {
    label: "My Profile",
    href: "/accountant/profile",
  },
];
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
  [routes.admin.taxCredentialSystems]: KeyRound,
  [routes.admin.taxCredentials]: KeyRound,


};

const clientIconByHref: Record<string, SidebarIcon> = {
  [routes.client.dashboard]: LayoutDashboard,
  [routes.client.requests]: FileText,
  [routes.client.documents]: FolderOpen,
  [routes.client.messages]: MessagesSquare,
  [routes.client.profile]: UserCircle,
};

const accountantIconByHref: Record<string, SidebarIcon> = {
  "/accountant/dashboard": LayoutDashboard,
  "/accountant/assigned-work": FileText,
  "/accountant/consultation": Calendar,
  "/accountant/documents": FolderOpen,
  "/accountant/messages": MessagesSquare,
  "/accountant/profile": UserCircle,
  "/accountant/tax-credentials": KeyRound,
};

const getNavigationByRole = (
  role?: UserRole,
  variant?: "admin" | "accountant" | "client",
): NavigationItem[] => {
  const effectiveRole = variant || role;

  if (effectiveRole === "admin") return adminNavigation;
  if (effectiveRole === "client") return clientNavigation;
  if (effectiveRole === "accountant") return accountantNavigation;

  return [];
};

const getIconByRoleAndHref = (
  role: UserRole | undefined,
  href: string,
  variant?: "admin" | "accountant" | "client",
) => {
  const effectiveRole = variant || role;

  if (effectiveRole === "admin") return adminIconByHref[href] || FileText;
  if (effectiveRole === "client") return clientIconByHref[href] || FileText;
  if (effectiveRole === "accountant") {
    return accountantIconByHref[href] || FileText;
  }

  return FileText;
};

const getRoleLabel = (
  role?: UserRole,
  variant?: "admin" | "accountant" | "client",
) => {
  const effectiveRole = variant || role;

  if (effectiveRole === "admin") return "Administrator";
  if (effectiveRole === "client") return "Client";
  if (effectiveRole === "accountant") return "Accountant";

  return "User";
};

function SidebarContent({
  className,
  onClose,
  variant,
}: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigation = getNavigationByRole(user?.role, variant);
  const displayName = user?.full_name || user?.email || "User";
  const effectiveRole = variant || user?.role;

  const handleLogout = () => {
    logout();
    toast.success("Logged out.");
    router.replace(routes.login);
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-screen w-60 shrink-0 flex-col overflow-hidden bg-navy text-white",
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

      <div className="border-b border-white/10 px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {getRoleLabel(user?.role, variant)}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const Icon = getIconByRoleAndHref(user?.role, item.href, variant);

          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          const shouldAddSeparator =
            effectiveRole === "admin" &&
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
              {getRoleLabel(user?.role, variant)}
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

export function DashboardSidebar({
  className,
  variant,
}: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="fixed left-0 top-0 z-30 hidden h-screen lg:block">
        <SidebarContent className={className} variant={variant} />
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
            <SidebarContent
              variant={variant}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      ) : null}
    </>
  );
}

export type { DashboardSidebarProps };