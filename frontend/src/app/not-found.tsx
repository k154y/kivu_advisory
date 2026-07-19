import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/lib/routes";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <EmptyState
          title="Page not found"
          description="The page you are looking for does not exist or may have been moved."
          action={
            <Link
              href={routes.home}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2742] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16385D]"
            >
              Go to homepage
            </Link>
          }
        />
      </div>
    </main>
  );
}