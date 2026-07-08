import Link from "next/link";

import { AccountantsTable } from "@/components/admin/accountants-table";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminAccountantsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Accountant Accounts"
        description="Create accountant accounts, manage access status, and prepare accountants to receive assigned client work."
        actions={
          <Link
            href="/admin/accountants/create"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2742] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16385D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2742] focus-visible:ring-offset-2"
          >
            Create accountant
          </Link>
        }
      />

      <AccountantsTable />
    </div>
  );
}