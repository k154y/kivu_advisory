"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";

import { ClientMessages } from "@/components/client/client-messages";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import type { MessageItem, ServiceRequest } from "@/types/api";

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    const [messagesResult, requestsResult] = await Promise.allSettled([
      api.get(endpoints.messages.list({ page_size: 100 })),
      api.get(endpoints.client.serviceRequests),
    ]);

    if (messagesResult.status === "rejected" && requestsResult.status === "rejected") {
      setError(
        getSafeErrorMessage(
          messagesResult.reason,
          "Client messages are unavailable right now.",
        ),
      );
    } else {
      setMessages(
        messagesResult.status === "fulfilled"
          ? extractItems<MessageItem>(messagesResult.value.data)
          : [],
      );
      setRequests(
        requestsResult.status === "fulfilled"
          ? extractItems<ServiceRequest>(requestsResult.value.data)
          : [],
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  return isLoading ? (
    <LoadingState
      title="Loading messages"
      description="Preparing your request conversations."
    />
  ) : error ? (
    <EmptyState
      title="Messages unavailable"
      description={error}
      icon={<MessageSquareText className="h-5 w-5" />}
    />
  ) : (
    <ClientMessages
      messages={messages}
      requests={requests.map((request) => ({
        id: request.id,
        title: request.title,
        reference_number: request.reference_number,
      }))}
      onSent={loadData}
    />
  );
}
