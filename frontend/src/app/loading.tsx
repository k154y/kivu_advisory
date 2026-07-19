import { LoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <LoadingState
        title="Loading page"
        description="Please wait while we prepare the page."
      />
    </main>
  );
}