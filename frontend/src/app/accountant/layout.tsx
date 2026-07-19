import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

type AccountantLayoutProps = {
  children: ReactNode;
};

export default function AccountantLayout({ children }: AccountantLayoutProps) {
  return <DashboardLayout variant="accountant">{children}</DashboardLayout>;
}
