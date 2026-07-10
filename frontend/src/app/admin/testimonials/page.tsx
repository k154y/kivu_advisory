import { MessageSquareQuote } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { endpoints } from "@/lib/endpoints";

export default function AdminTestimonialsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Testimonials
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Client testimonials</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          This section is prepared for testimonial management once the backend endpoint is confirmed.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Backend readiness</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <EmptyState
            title="Testimonials backend endpoint needed"
            description={`A safe placeholder is shown because testimonial management is only listed under the project's missing backend routes (${endpoints.missingBackend.testimonials.adminList}). Once the backend is enabled, this page can support create, edit, and activation controls without changing route structure.`}
            icon={<MessageSquareQuote className="h-5 w-5" />}
          />
        </CardContent>
      </Card>
    </div>
  );
}
