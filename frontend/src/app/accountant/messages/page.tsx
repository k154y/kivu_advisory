"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, formatEmpty } from "@/lib/format";
import { extractItems, getSafeErrorMessage } from "@/lib/portal";
import type { MessageItem } from "@/types/api";

export default function AccountantMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get(`${endpoints.messages.list({ page_size: 50 })}`);

        if (!cancelled) {
          setMessages(extractItems<MessageItem>(result.data));
        }
      } catch (loadError) {
        if (!cancelled) {
          setMessages([]);
          setError(
            getSafeErrorMessage(
              loadError,
              "Messages are not available for accountant accounts right now.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Messages
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Work communication</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Review role-available conversation history when the backend exposes message data.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Recent messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {isLoading ? (
            <LoadingState
              title="Loading messages"
              description="Checking whether accountant message history is available."
            />
          ) : error ? (
            <EmptyState
              title="Messages unavailable"
              description={error}
              icon={<MessageSquareText className="h-5 w-5" />}
            />
          ) : messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Message activity will appear here when the backend returns accountant-visible conversations."
              icon={<MessageSquareText className="h-5 w-5" />}
            />
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {message.subject || "Assignment message"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {message.body}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge type="message-visibility" value={message.visibility} />
                    <span className="text-xs text-slate-500">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {message.is_read ? "Read" : "Unread"} • {formatEmpty(message.message_type)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
