import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <DashboardLayout variant="admin">{children}</DashboardLayout>;
}
