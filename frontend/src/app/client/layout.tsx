import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

type ClientLayoutProps = {
  children: ReactNode;
};

export default function ClientLayout({ children }: ClientLayoutProps) {
  return <DashboardLayout variant="client">{children}</DashboardLayout>;
}
