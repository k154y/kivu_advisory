"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/error-state";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <ErrorState
        title="The page could not be loaded"
        description={
          error.message ||
          "Something went wrong while loading this page. Please try again."
        }
        action={
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  );
}