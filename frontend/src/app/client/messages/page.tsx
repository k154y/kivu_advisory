"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ChatWindow } from "@/components/forms/message-form";

function ClientMessagesInner() {
  const params = useSearchParams();

  const serviceRequestId =
    params.get("service_request_id") ?? params.get("request") ?? undefined;

  const referenceNumber =
    params.get("reference") ?? params.get("reference_number") ?? undefined;

  return (
    <ChatWindow
      defaultServiceRequestId={serviceRequestId}
      defaultReferenceNumber={referenceNumber}
      roleLabel="client"
    />
  );
}

export default function ClientMessagesPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy">Messages</h1>
        <p className="mt-1 text-sm text-gray-400">
          Chat with Kivu Advisory about your service requests.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        }
      >
        <ClientMessagesInner />
      </Suspense>
    </div>
  );
}