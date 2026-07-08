import type { ReactNode } from "react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <PublicNavbar />
      <main className="pt-16 lg:pt-[72px]">{children}</main>
      <PublicFooter />
    </>
  );
}