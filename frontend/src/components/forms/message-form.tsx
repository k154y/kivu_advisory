"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type MessageItem = {
  id: string;
  service_request_id?: string;
  sender_user_id?: string;
  recipient_user_id?: string;
  subject?: string;
  body: string;
  message_type: "message" | "note" | "system" | "status_update" | string;
  visibility: "conversation" | "staff" | "admin" | string;
  is_internal: boolean;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
};

type ChatThread = {
  key: string;
  title: string;
  subtitle: string;
  serviceRequestId?: string;
  recipientUserId?: string;
  subject?: string;
  lastMessage?: string;
  lastDate?: string;
  unreadCount: number;
};

type ChatWindowProps = {
  defaultUserId?: string;
  defaultServiceRequestId?: string;
  roleLabel?: "admin" | "accountant" | "client";
};

function getMessageItems(response: unknown): MessageItem[] {
  if (Array.isArray(response)) {
    return response as MessageItem[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: MessageItem[];
    data?: MessageItem[] | { items?: MessageItem[] };
  };

  if (Array.isArray(objectResponse.items)) return objectResponse.items;
  if (Array.isArray(objectResponse.data)) return objectResponse.data;

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function getCreatedTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDateTime(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function shortId(value?: string) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getOtherUserId(message: MessageItem, currentUserId?: string) {
  if (message.sender_user_id && message.sender_user_id !== currentUserId) {
    return message.sender_user_id;
  }

  if (message.recipient_user_id && message.recipient_user_id !== currentUserId) {
    return message.recipient_user_id;
  }

  return message.recipient_user_id || message.sender_user_id || "";
}

function makeThreadKey(message: MessageItem, currentUserId?: string) {
  if (message.service_request_id) {
    return `request:${message.service_request_id}`;
  }

  const otherUserId = getOtherUserId(message, currentUserId);

  if (otherUserId) {
    return `user:${otherUserId}`;
  }

  return `message:${message.id}`;
}

function buildThreads(messages: MessageItem[], currentUserId?: string) {
  const map = new Map<string, ChatThread>();

  for (const message of messages) {
    const key = makeThreadKey(message, currentUserId);
    const otherUserId = getOtherUserId(message, currentUserId);
    const existing = map.get(key);

    const isRequestThread = Boolean(message.service_request_id);
    const title = isRequestThread
      ? `Service Request ${shortId(message.service_request_id)}`
      : otherUserId
        ? `User ${shortId(otherUserId)}`
        : message.subject || "Conversation";

    const subtitle = isRequestThread
      ? message.subject || "Request conversation"
      : message.subject || "Direct conversation";

    const unread =
      !message.is_read && message.recipient_user_id === currentUserId ? 1 : 0;

    if (!existing) {
      map.set(key, {
        key,
        title,
        subtitle,
        serviceRequestId: message.service_request_id,
        recipientUserId: otherUserId || message.recipient_user_id,
        subject: message.subject,
        lastMessage: message.body,
        lastDate: message.created_at,
        unreadCount: unread,
      });

      continue;
    }

    existing.unreadCount += unread;

    if (getCreatedTime(message.created_at) >= getCreatedTime(existing.lastDate)) {
      existing.lastMessage = message.body;
      existing.lastDate = message.created_at;
      existing.subject = message.subject || existing.subject;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => getCreatedTime(b.lastDate) - getCreatedTime(a.lastDate),
  );
}

function isMessageInThread(
  message: MessageItem,
  thread: ChatThread,
  currentUserId?: string,
) {
  if (thread.serviceRequestId) {
    return message.service_request_id === thread.serviceRequestId;
  }

  if (thread.recipientUserId) {
    const otherUserId = getOtherUserId(message, currentUserId);
    return otherUserId === thread.recipientUserId;
  }

  return false;
}

function roleText(role?: string) {
  if (role === "admin") return "Admin";
  if (role === "accountant") return "Accountant";
  if (role === "client") return "Client";
  return "User";
}

function roleTone(role?: string) {
  if (role === "admin") return "bg-red-50 text-red-700";
  if (role === "accountant") return "bg-teal/10 text-teal";
  if (role === "client") return "bg-indigo-50 text-indigo-700";
  return "bg-gray-100 text-gray-600";
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function ChatWindow({
  defaultUserId,
  defaultServiceRequestId,
  roleLabel,
}: ChatWindowProps) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(() => {
    if (defaultServiceRequestId) return `request:${defaultServiceRequestId}`;
    if (defaultUserId) return `user:${defaultUserId}`;
    return null;
  });

  const [manualRecipientId, setManualRecipientId] = useState(
    defaultUserId || "",
  );
  const [manualServiceRequestId, setManualServiceRequestId] = useState(
    defaultServiceRequestId || "",
  );
  const [manualSubject, setManualSubject] = useState("");

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<
    "conversation" | "staff" | "admin"
  >("conversation");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    setLoading(true);

    try {
      const query = defaultServiceRequestId
        ? `/messages?service_request_id=${encodeURIComponent(
            defaultServiceRequestId,
          )}&page_size=100`
        : "/messages?page_size=100";

      const result = await api.get<unknown>(query);
      const items = getMessageItems(result.data).sort(
        (a, b) => getCreatedTime(a.created_at) - getCreatedTime(b.created_at),
      );

      setMessages(items);

      if (!activeThreadKey && items.length > 0) {
        setActiveThreadKey(makeThreadKey(items[items.length - 1], user?.id));
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load messages."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultServiceRequestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeThreadKey]);

  const threads = useMemo(
    () => buildThreads(messages, user?.id),
    [messages, user?.id],
  );

  const syntheticThread = useMemo<ChatThread | null>(() => {
    if (defaultServiceRequestId) {
      return {
        key: `request:${defaultServiceRequestId}`,
        title: `Service Request ${shortId(defaultServiceRequestId)}`,
        subtitle: "Request conversation",
        serviceRequestId: defaultServiceRequestId,
        subject: manualSubject || "Service request message",
        unreadCount: 0,
      };
    }

    if (defaultUserId) {
      return {
        key: `user:${defaultUserId}`,
        title: `User ${shortId(defaultUserId)}`,
        subtitle: "Direct conversation",
        recipientUserId: defaultUserId,
        subject: manualSubject || "Direct message",
        unreadCount: 0,
      };
    }

    return null;
  }, [defaultServiceRequestId, defaultUserId, manualSubject]);

  const allThreads = useMemo(() => {
    if (!syntheticThread) return threads;

    const exists = threads.some((thread) => thread.key === syntheticThread.key);
    return exists ? threads : [syntheticThread, ...threads];
  }, [threads, syntheticThread]);

  const selectedThread =
    allThreads.find((thread) => thread.key === activeThreadKey) || null;

  const selectedMessages = useMemo(() => {
    if (!selectedThread) return [];

    return messages.filter((message) =>
      isMessageInThread(message, selectedThread, user?.id),
    );
  }, [messages, selectedThread, user?.id]);

  const handleStartConversation = () => {
    const recipientId = manualRecipientId.trim();
    const serviceRequestId = manualServiceRequestId.trim();

    if (!recipientId && !serviceRequestId) {
      toast.error("Enter a recipient user ID or service request ID.");
      return;
    }

    if (serviceRequestId) {
      setActiveThreadKey(`request:${serviceRequestId}`);
      return;
    }

    setActiveThreadKey(`user:${recipientId}`);
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    const serviceRequestId =
      selectedThread?.serviceRequestId || manualServiceRequestId.trim();
    const recipientUserId =
      selectedThread?.recipientUserId || manualRecipientId.trim();

    if (!serviceRequestId && !recipientUserId) {
      toast.error("Select or start a conversation first.");
      return;
    }

    setSending(true);

    try {
      const payload = {
        service_request_id: serviceRequestId || undefined,
        recipient_user_id: recipientUserId || undefined,
        subject:
          selectedThread?.subject ||
          manualSubject.trim() ||
          selectedThread?.title ||
          "Message",
        body: text.trim(),
        message_type: "message",
        visibility,
        is_internal: visibility !== "conversation",
      };

      const result = await api.post<unknown>("/messages", payload);
      const created = getMessageItems(result.data)[0];

      if (created) {
        setMessages((current) =>
          [...current, created].sort(
            (a, b) => getCreatedTime(a.created_at) - getCreatedTime(b.created_at),
          ),
        );
      } else {
        await loadMessages();
      }

      setText("");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const selectedTitle = selectedThread?.title || "No conversation selected";
  const selectedSubtitle =
    selectedThread?.subtitle || "Choose a conversation or start a new one.";

  return (
    <div
      className="flex overflow-hidden rounded-xl border border-gray-100 bg-white"
      style={{ height: "calc(100vh - 150px)", minHeight: 540 }}
    >
      <div className="flex w-80 shrink-0 flex-col border-r border-gray-100">
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-navy">Conversations</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Service request and direct messages
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadMessages()}
              className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-lightgray hover:text-navy"
              title="Refresh"
            >
              <RefreshCcw size={15} />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 bg-lightgray/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Start conversation
          </p>

          <div className="space-y-2">
            <input
              type="text"
              value={manualRecipientId}
              onChange={(event) => setManualRecipientId(event.target.value)}
              placeholder="Recipient user ID"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal/30"
            />

            <input
              type="text"
              value={manualServiceRequestId}
              onChange={(event) =>
                setManualServiceRequestId(event.target.value)
              }
              placeholder="Service request ID optional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal/30"
            />

            <input
              type="text"
              value={manualSubject}
              onChange={(event) => setManualSubject(event.target.value)}
              placeholder="Subject optional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal/30"
            />

            <button
              type="button"
              onClick={handleStartConversation}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700"
            >
              <Plus size={14} />
              Open Chat
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            </div>
          ) : allThreads.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-lightgray">
                <MessageCircle size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                No conversations yet
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Start with a recipient user ID or a service request ID.
              </p>
            </div>
          ) : (
            allThreads.map((thread) => {
              const active = activeThreadKey === thread.key;

              return (
                <button
                  key={thread.key}
                  type="button"
                  onClick={() => setActiveThreadKey(thread.key)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-lightgray",
                    active && "border-l-2 border-l-teal bg-teal/5",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {thread.serviceRequestId ? "R" : "U"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-navy">
                        {thread.title}
                      </p>

                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-teal px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {thread.lastMessage || thread.subtitle}
                    </p>

                    {thread.lastDate ? (
                      <p className="mt-1 text-[11px] text-gray-300">
                        {formatDateTime(thread.lastDate)}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
            {selectedThread?.serviceRequestId ? "R" : "U"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">
              {selectedTitle}
            </p>

            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  roleTone(roleLabel || user?.role),
                )}
              >
                {roleText(roleLabel || user?.role)}
              </span>

              <span className="text-xs text-gray-400">{selectedSubtitle}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Circle size={8} className="fill-green-400 text-green-400" />
            <span className="text-xs text-gray-400">Live view</span>
          </div>
        </div>

        {!selectedThread ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-lightgray">
                <Send size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium">
                Select a conversation to start chatting
              </p>
              <p className="mt-1 text-xs">
                You can also open a chat using a recipient user ID.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                </div>
              ) : selectedMessages.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  No messages yet. Start the conversation.
                </div>
              ) : (
                selectedMessages.map((message) => {
                  const isMe = message.sender_user_id === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isMe ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "flex max-w-[75%] flex-col gap-1",
                          isMe ? "items-end" : "items-start",
                        )}
                      >
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-xs text-gray-400">
                            {isMe
                              ? "You"
                              : `User ${shortId(message.sender_user_id)}`}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(message.created_at)}
                          </span>
                        </div>

                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                            isMe
                              ? "rounded-tr-sm bg-navy text-white"
                              : "rounded-tl-sm bg-lightgray text-charcoal",
                          )}
                        >
                          {message.body}
                        </div>

                        {message.visibility !== "conversation" ? (
                          <span className="px-1 text-[11px] text-gray-400">
                            {message.visibility}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-gray-500">
                  Visibility
                </label>

                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(
                      event.target.value as "conversation" | "staff" | "admin",
                    )
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="conversation">Conversation</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin only</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Use the Documents page to upload files. This message API currently supports text messages.",
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition-colors hover:bg-lightgray hover:text-navy"
                  title="Attach file"
                >
                  <Paperclip size={16} />
                </button>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Write your message..."
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !text.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white transition-colors hover:bg-teal disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}