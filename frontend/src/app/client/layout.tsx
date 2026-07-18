"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MessagesSquare,
  User,
  UserCircle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

type ClientLayoutProps = {
  children: ReactNode;
};

const CLIENT_NAV = [
  {
    href: "/client/dashboard",
    icon: Home,
    label: "Dashboard",
  },
  {
    href: "/client/requests",
    icon: FileText,
    label: "My Requests",
  },
  {
    href: "/client/documents",
    icon: FolderOpen,
    label: "Documents",
  },
  {
    href: "/client/messages",
    icon: MessagesSquare,
    label: "Messages",
  },
  {
  href: "/client/tax-credentials",
  icon: KeyRound,
  label: "Tax Credentials",
},
  {
    href: "/client/profile",
    icon: UserCircle,
    label: "Profile",
  },
];

function ClientShell({ children }: ClientLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "client")) {
      router.replace(routes.login);
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out.");
    router.replace(routes.login);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lightgray">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "client") {
    return null;
  }

  return (
    <div className="min-h-screen bg-lightgray">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-white">
                Kivu Advisory
              </span>
              <span className="mb-2.5 ml-1 h-1.5 w-1.5 rounded-full bg-gold" />
            </Link>

            <div className="flex items-center gap-2 lg:hidden">
              <User size={15} className="text-gray-300" />
              <span className="max-w-32 truncate text-sm text-gray-300">
                {user.full_name || user.email}
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {CLIENT_NAV.map(({ href, icon: Icon, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "text-gray-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <User size={15} />
              <span className="max-w-40 truncate">
                {user.full_name || user.email}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-red-400"
            >
              <LogOut size={13} />
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <ClientShell>{children}</ClientShell>
    </AuthProvider>
  );
}