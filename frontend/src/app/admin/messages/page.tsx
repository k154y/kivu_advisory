"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, truncateText } from "@/lib/format";
import { extractItems, extractPaginationInfo, getSafeErrorMessage } from "@/lib/portal";
import { routes } from "@/lib/routes";
import type { MessageItem } from "@/types/api";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.get(endpoints.messages.list({ page, page_size: 20 }));

        if (!cancelled) {
          setMessages(extractItems<MessageItem>(result.data));
          setTotalPages(extractPaginationInfo(result.data).totalPages);
        }
      } catch (loadError) {
        if (!cancelled) {
          setMessages([]);
          setError(getSafeErrorMessage(loadError, "Messages could not be loaded."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#092B44] p-6 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C99A35]">
          Messages
        </p>
        <h1 className="mt-2 text-3xl font-semibold">All conversations</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Every message sent across all service requests, including internal
          staff and admin-only notes.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingState
              title="Loading messages"
              description="Fetching all conversations."
            />
          ) : error ? (
            <EmptyState
              title="Messages unavailable"
              description={error}
              icon={<MessagesSquare className="h-5 w-5" />}
            />
          ) : messages.length === 0 ? (
            <EmptyState
              title="No messages found"
              description="Messages sent on any service request will appear here."
              icon={<MessagesSquare className="h-5 w-5" />}
            />
          ) : (
            <>
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge type="message-visibility" value={message.visibility} />
                      {message.is_internal ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Internal
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-400">
                        {formatDateTime(message.created_at)}
                      </span>
                    </div>

                    {message.subject ? (
                      <p className="mb-1 text-sm font-semibold text-slate-900">
                        {message.subject}
                      </p>
                    ) : null}

                    <p className="text-sm text-slate-600">
                      {truncateText(message.body, 160)}
                    </p>

                    {message.service_request_id ? (
                      <Link
                        href={routes.admin.requestDetail(message.service_request_id)}
                        className="mt-2 inline-block text-xs font-medium text-[#092B44] hover:underline"
                      >
                        View service request
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
