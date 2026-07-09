import type { Metadata } from "next";
import { Toaster } from "sonner";

import "@/styles/globals.css";
import { AuthProvider } from "@/providers/auth-provider";

export const metadata: Metadata = {
  title: {
    default: "Kivu Advisory",
    template: "%s | Kivu Advisory",
  },
  description:
    "Professional accounting, tax, audit, compliance, and business advisory services.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-950 antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}