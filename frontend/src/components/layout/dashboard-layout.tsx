"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { routes } from "@/lib/routes";
import { AuthProvider } from "@/providers/auth-provider";

type DashboardLayoutProps = {
  children: ReactNode;
  variant?: "admin" | "accountant" | "client";
};

function DashboardShell({
  children,
  variant = "admin",
}: DashboardLayoutProps) {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(routes.login);
      return;
    }

    if (!isLoading && user && user.role !== variant) {
      router.replace(routes.login);
    }
  }, [isLoading, router, user, variant]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-lightgray p-6">
        <LoadingState
          title="Checking access"
          description="Please wait while we verify your dashboard access."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-lightgray p-6">
        <LoadingState
          title="Redirecting to login"
          description="You need to log in before accessing this dashboard."
        />
      </div>
    );
  }

  if (user.role !== variant) {
    return (
      <div className="min-h-screen bg-lightgray p-6">
        <LoadingState
          title="Redirecting"
          description="You do not have access to this dashboard."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lightgray">
      <div className="flex min-h-screen">
        <DashboardSidebar variant={variant} />

        <div className="min-w-0 flex-1 lg:pl-60">
          <main className="px-4 py-8 sm:px-6 lg:px-8">
            <div
              className={
                variant === "admin"
                  ? "mx-auto w-full max-w-7xl"
                  : "mx-auto w-full max-w-5xl"
              }
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({
  children,
  variant = "admin",
}: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <DashboardShell variant={variant}>{children}</DashboardShell>
    </AuthProvider>
  );
}

export type { DashboardLayoutProps };