"use client";

import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/providers/auth-provider";

type DashboardLayoutProps = {
  children: ReactNode;
  variant?: "admin" | "accountant" | "client";
};

function DashboardShell({
  children,
  variant = "admin",
}: DashboardLayoutProps) {
  const { isLoading, user } = useAuth();

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

  if (variant === "client") {
    return (
      <div className="min-h-screen bg-lightgray">
        <DashboardTopbar variant="client" />

        <main className="px-4 py-8 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lightgray">
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <div className="min-w-0 flex-1">
          <main className="px-4 py-16 sm:px-6 sm:py-8 lg:px-8">
            <div
              className={
                variant === "accountant"
                  ? "mx-auto w-full max-w-5xl"
                  : "mx-auto w-full max-w-7xl"
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