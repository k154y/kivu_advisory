"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, formatEmpty } from "@/lib/format";
import { getSafeErrorMessage } from "@/lib/portal";
import type { MessageItem } from "@/types/api";

type ClientMessagesProps = {
  messages: MessageItem[];
  requests: Array<{ id: string; title: string; reference_number?: string }>;
  onSent?: () => Promise<void> | void;
};

export function ClientMessages({
  messages,
  requests,
  onSent,
}: ClientMessagesProps) {
  const [selectedRequestId, setSelectedRequestId] = useState(requests[0]?.id || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const requestOptions = useMemo(
    () =>
      requests.map((request) => ({
        label: request.reference_number
          ? `${request.reference_number} - ${request.title}`
          : request.title,
        value: request.id,
      })),
    [requests],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRequestId) {
      toast.error("Select a service request before sending a message.");
      return;
    }

    if (!body.trim()) {
      toast.error("Enter a message before sending.");
      return;
    }

    setIsSending(true);

    try {
      await api.post(endpoints.messages.create, {
        service_request_id: selectedRequestId,
        subject: subject.trim() || undefined,
        body: body.trim(),
        visibility: "conversation",
        message_type: "message",
      });

      setSubject("");
      setBody("");
      toast.success("Message sent successfully.");
      await onSent?.();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Unable to send this message."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Send a message</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {requestOptions.length === 0 ? (
            <EmptyState
              title="No request available"
              description="Messages can be linked to a service request once one exists on your account."
            />
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Select
                label="Service request"
                value={selectedRequestId}
                onChange={(event) => setSelectedRequestId(event.target.value)}
                options={requestOptions}
              />
              <Input
                label="Subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Optional subject"
              />
              <Textarea
                label="Message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your question or update for the Kivu Advisory team."
              />
              <Button type="submit" variant="secondary" isLoading={isSending}>
                Send message
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Recent messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Conversation history with Kivu Advisory will appear here."
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
                      {message.subject || "Client message"}
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
                  {message.is_read ? "Read" : "Unread"} •{" "}
                  {formatEmpty(message.message_type)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
