"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ChatWindow } from "@/components/forms/message-form";

function ChatPageInner() {
  const params = useSearchParams();

  const withUserId = params.get("with") ?? undefined;
  const serviceRequestId =
    params.get("service_request_id") ?? params.get("request") ?? undefined;

  return (
    <ChatWindow
      defaultUserId={withUserId}
      defaultServiceRequestId={serviceRequestId}
      roleLabel="client"
    />
  );
}

export default function ClientChatPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy">Messages</h1>
        <p className="mt-1 text-sm text-gray-400">
          Chat with Kivu Advisory about your requests and documents.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          </div>
        }
      >
        <ChatPageInner />
      </Suspense>
    </div>
  );
}