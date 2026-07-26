"use client";

import { resolveAccountantRequestMap } from "@/lib/accountant-request-resolver";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Circle,
  MessageCircle,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  uploadDocument,
  type DocumentType,
  type DocumentVisibility,
} from "@/lib/documents";
import { cn } from "@/lib/utils";

type MessageItem = {
  id: string;
  service_request_id?: string;
  sender_user_id?: string;
  sender_name?: string;
  recipient_user_id?: string;
  recipient_name?: string;
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

type RequestSummary = {
  id: string;
  referenceNumber: string;
  title: string;
  clientName?: string;
  clientUserId?: string;
  accountantName?: string;
  accountantUserId?: string;
};

type ChatThread = {
  key: string;
  title: string;
  subtitle: string;
  serviceRequestId?: string;
  referenceNumber?: string;
  recipientUserId?: string;
  participantName?: string;
  subject?: string;
  lastMessage?: string;
  lastDate?: string;
  unreadCount: number;
};

type ChatWindowProps = {
  defaultUserId?: string;
  defaultServiceRequestId?: string;
  defaultReferenceNumber?: string;
  roleLabel?: "admin" | "accountant" | "client";
};

function getResponseItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: T[];
    data?: T[] | { items?: T[] };
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

function getCreatedMessage(response: unknown): MessageItem | null {
  const items = getResponseItems<MessageItem>(response);

  if (items[0]) return items[0];

  if (!response || typeof response !== "object") return null;

  const objectResponse = response as {
    id?: string;
    body?: string;
    data?: {
      id?: string;
      body?: string;
    };
  };

  if (objectResponse.id && objectResponse.body) {
    return objectResponse as MessageItem;
  }

  if (objectResponse.data?.id && objectResponse.data?.body) {
    return objectResponse.data as MessageItem;
  }

  return null;
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

function normalizeReference(value?: string) {
  return (value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
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

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeRequestItem(item: unknown): RequestSummary | null {
  if (!item || typeof item !== "object") return null;

  const objectItem = item as Record<string, unknown>;

  const nestedRequest =
    typeof objectItem.service_request === "object" &&
    objectItem.service_request !== null
      ? (objectItem.service_request as Record<string, unknown>)
      : typeof objectItem.request === "object" && objectItem.request !== null
        ? (objectItem.request as Record<string, unknown>)
        : null;

  const id =
    getString(objectItem.service_request_id) ||
    getString(objectItem.request_id) ||
    getString(nestedRequest?.id) ||
    getString(nestedRequest?.service_request_id) ||
    getString(nestedRequest?.request_id) ||
    getString(objectItem.id);

  if (!id) return null;

  const referenceNumber =
    getString(objectItem.reference_number) ||
    getString(objectItem.service_request_reference_number) ||
    getString(objectItem.request_reference_number) ||
    getString(nestedRequest?.reference_number) ||
    id;

  const title =
    getString(objectItem.title) ||
    getString(objectItem.service_name) ||
    getString(objectItem.service_title) ||
    getString(objectItem.request_title) ||
    getString(nestedRequest?.title) ||
    getString(nestedRequest?.service_name) ||
    "Service request";

  const clientName =
    getString(objectItem.requester_name) ||
    getString(objectItem.client_name) ||
    getString(objectItem.full_name) ||
    getString(objectItem.name) ||
    getString(nestedRequest?.requester_name) ||
    getString(nestedRequest?.client_name);

  const clientUserId =
    getString(objectItem.client_user_id) ||
    getString(objectItem.user_id) ||
    getString(nestedRequest?.client_user_id) ||
    getString(nestedRequest?.user_id);

  const accountantName =
    getString(objectItem.accountant_name) ||
    getString(objectItem.assigned_accountant_name) ||
    getString(objectItem.assigned_to_name);

  const accountantUserId =
    getString(objectItem.accountant_user_id) ||
    getString(objectItem.assigned_accountant_user_id) ||
    getString(objectItem.assigned_to);

  return {
    id,
    referenceNumber,
    title,
    clientName,
    clientUserId,
    accountantName,
    accountantUserId,
  };
}

async function loadRequestsForRole(role?: "admin" | "accountant" | "client") {
  if (role === "accountant") {
    const accountantMap = await resolveAccountantRequestMap();

    return new Map(
      Array.from(accountantMap.entries()).map(([id, request]) => [
        id,
        {
          id: request.id,
          referenceNumber: request.referenceNumber,
          title: request.title,
          clientName: request.clientName,
          clientUserId: request.clientUserId,
          accountantName: request.accountantName,
          accountantUserId: request.accountantUserId,
        },
      ]),
    );
  }

  const paths =
    role === "client"
      ? [
          "/client/service-requests?page_size=500",
          "/client/requests?page_size=500",
        ]
      : [
          "/admin/service-requests?page_size=500",
          "/admin/requests?page_size=500",
        ];

  const map = new Map<string, RequestSummary>();

  for (const path of paths) {
    try {
      const result = await api.get<unknown>(path);
      const items = getResponseItems<unknown>(result.data);

      for (const item of items) {
        const request = normalizeRequestItem(item);

        if (request) {
          map.set(request.id, request);
        }
      }
    } catch {
      continue;
    }
  }

  return map;
}
async function loadMessagesForRole(
  role: "admin" | "accountant" | "client" | undefined,
  requestMap: Map<string, RequestSummary>,
  defaultServiceRequestId?: string,
) {
  if (role === "admin") {
    try {
      const result = await api.get<unknown>("/messages?page_size=500");
      return getResponseItems<MessageItem>(result.data);
    } catch {
      return [];
    }
  }

  const requestIds = new Set<string>(Array.from(requestMap.keys()));

  if (defaultServiceRequestId) {
    requestIds.add(defaultServiceRequestId);
  }

  const allMessages: MessageItem[] = [];

  for (const requestId of requestIds) {
    try {
      const result = await api.get<unknown>(
        `/messages?service_request_id=${encodeURIComponent(
          requestId,
        )}&page_size=200`,
      );

      allMessages.push(...getResponseItems<MessageItem>(result.data));
    } catch {
      continue;
    }
  }

  return allMessages;
}

function getParticipantNameForRequest(
  request: RequestSummary | undefined,
  role?: "admin" | "accountant" | "client",
) {
  if (!request) return "";

  if (role === "admin") {
    return request.clientName || request.accountantName || "Client";
  }

  if (role === "accountant") {
    return request.clientName || "Client";
  }

  if (role === "client") {
    return request.accountantName || "Kivu Advisory Team";
  }

  return request.clientName || request.accountantName || "";
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

function buildThreads(
  messages: MessageItem[],
  currentUserId: string | undefined,
  requestMap: Map<string, RequestSummary>,
  role?: "admin" | "accountant" | "client",
) {
  const map = new Map<string, ChatThread>();

  for (const message of messages) {
    const key = makeThreadKey(message, currentUserId);
    const request = message.service_request_id
      ? requestMap.get(message.service_request_id)
      : undefined;

    const otherUserId = getOtherUserId(message, currentUserId);

    const participantName =
      getParticipantNameForRequest(request, role) ||
      message.sender_name ||
      message.recipient_name ||
      "";

    const isRequestThread = Boolean(message.service_request_id);

    const title = isRequestThread
      ? request?.referenceNumber || `Request ${shortId(message.service_request_id)}`
      : participantName || `User ${shortId(otherUserId)}`;

    const subtitle = isRequestThread
      ? [request?.title, participantName].filter(Boolean).join(" · ") ||
        "Request conversation"
      : message.subject || "Direct conversation";

    const unread =
      !message.is_read && message.recipient_user_id === currentUserId ? 1 : 0;

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        title,
        subtitle,
        serviceRequestId: message.service_request_id,
        referenceNumber: request?.referenceNumber,
        recipientUserId: otherUserId,
        participantName,
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

function buildRequestThread(
  request: RequestSummary,
  role?: "admin" | "accountant" | "client",
): ChatThread {
  const participantName = getParticipantNameForRequest(request, role);

  return {
    key: `request:${request.id}`,
    title: request.referenceNumber,
    subtitle: [request.title, participantName].filter(Boolean).join(" · "),
    serviceRequestId: request.id,
    referenceNumber: request.referenceNumber,
    participantName,
    subject: request.referenceNumber,
    unreadCount: 0,
  };
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

function getSenderDisplayName(
  message: MessageItem,
  currentUserId: string | undefined,
  request: RequestSummary | undefined,
) {
  if (message.sender_user_id === currentUserId) return "You";

  if (message.sender_name) return message.sender_name;

  if (request?.clientUserId && message.sender_user_id === request.clientUserId) {
    return request.clientName || "Client";
  }

  if (
    request?.accountantUserId &&
    message.sender_user_id === request.accountantUserId
  ) {
    return request.accountantName || "Accountant";
  }

  return `User ${shortId(message.sender_user_id)}`;
}

function getAllowedVisibilityOptions(role?: "admin" | "accountant" | "client") {
  if (role === "admin") {
    return [
      { value: "conversation", label: "Conversation" },
      { value: "staff", label: "Staff" },
      { value: "admin", label: "Admin only" },
    ] as const;
  }

  if (role === "accountant") {
    return [
      { value: "conversation", label: "Conversation" },
      { value: "staff", label: "Staff" },
    ] as const;
  }

  return [{ value: "conversation", label: "Conversation" }] as const;
}

function getMessageTypeForVisibility(visibility: "conversation" | "staff" | "admin") {
  return visibility === "conversation" ? "message" : "note";
}

function getDocumentUploadSettings(
  role: "admin" | "accountant" | "client" | undefined,
  visibility: "conversation" | "staff" | "admin",
): {
  visibility: DocumentVisibility;
  document_type: DocumentType;
  is_final: boolean;
} {
  if (role === "client") {
    return {
      visibility: "client",
      document_type: "client_upload",
      is_final: false,
    };
  }

  if (role === "accountant") {
    return {
      visibility: visibility === "conversation" ? "client" : "staff",
      document_type: "accountant_upload",
      is_final: false,
    };
  }

  if (visibility === "admin") {
    return {
      visibility: "admin",
      document_type: "internal_file",
      is_final: false,
    };
  }

  if (visibility === "conversation") {
    return {
      visibility: "client",
      document_type: "admin_upload",
      is_final: false,
    };
  }

  return {
    visibility: "staff",
    document_type: "admin_upload",
    is_final: false,
  };
}

export function ChatWindow({
  defaultUserId,
  defaultServiceRequestId,
  defaultReferenceNumber,
  roleLabel,
}: ChatWindowProps) {
  const { user } = useAuth();

  const activeRole =
    roleLabel ||
    (user?.role === "admin" ||
    user?.role === "accountant" ||
    user?.role === "client"
      ? user.role
      : undefined);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [requestMap, setRequestMap] = useState<Map<string, RequestSummary>>(
    () => new Map(),
  );

  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(() => {
    if (defaultServiceRequestId) return `request:${defaultServiceRequestId}`;
    if (defaultUserId) return `user:${defaultUserId}`;
    return null;
  });

  const [openedRequestId, setOpenedRequestId] = useState<string | null>(
    defaultServiceRequestId || null,
  );

  const [referenceSearch, setReferenceSearch] = useState(
    defaultReferenceNumber || "",
  );

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"conversation" | "staff" | "admin">(
    "conversation",
  );

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibilityOptions = getAllowedVisibilityOptions(activeRole);

  const loadAll = async () => {
    setLoading(true);

    try {
      const loadedRequestMap = await loadRequestsForRole(activeRole);

      if (defaultServiceRequestId && !loadedRequestMap.has(defaultServiceRequestId)) {
        loadedRequestMap.set(defaultServiceRequestId, {
          id: defaultServiceRequestId,
          referenceNumber:
            defaultReferenceNumber || `Request ${shortId(defaultServiceRequestId)}`,
          title: "Service request",
        });
      }

      const loadedMessages = await loadMessagesForRole(
        activeRole,
        loadedRequestMap,
        defaultServiceRequestId,
      );

      const sortedMessages = loadedMessages.sort(
        (a, b) => getCreatedTime(a.created_at) - getCreatedTime(b.created_at),
      );

      setMessages(sortedMessages);
      setRequestMap(loadedRequestMap);

      if (!activeThreadKey && sortedMessages.length > 0) {
        setActiveThreadKey(makeThreadKey(sortedMessages[sortedMessages.length - 1], user?.id));
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load messages."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole]);

  useEffect(() => {
    if (!defaultReferenceNumber || requestMap.size === 0) return;

    const normalized = normalizeReference(defaultReferenceNumber);

    for (const request of requestMap.values()) {
      if (normalizeReference(request.referenceNumber) === normalized) {
        setOpenedRequestId(request.id);
        setActiveThreadKey(`request:${request.id}`);
        return;
      }
    }
  }, [defaultReferenceNumber, requestMap]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeThreadKey]);

  const threads = useMemo(
    () => buildThreads(messages, user?.id, requestMap, activeRole),
    [messages, user?.id, requestMap, activeRole],
  );

  const syntheticThreads = useMemo(() => {
    const list: ChatThread[] = [];

    if (openedRequestId) {
      const request = requestMap.get(openedRequestId) || {
        id: openedRequestId,
        referenceNumber:
          defaultReferenceNumber || `Request ${shortId(openedRequestId)}`,
        title: "Service request",
      };

      list.push(buildRequestThread(request, activeRole));
    }

    if (defaultUserId) {
      list.push({
        key: `user:${defaultUserId}`,
        title: `User ${shortId(defaultUserId)}`,
        subtitle: "Direct conversation",
        recipientUserId: defaultUserId,
        subject: "Direct message",
        unreadCount: 0,
      });
    }

    return list;
  }, [openedRequestId, requestMap, activeRole, defaultReferenceNumber, defaultUserId]);

  const allThreads = useMemo(() => {
    const result = [...threads];

    for (const syntheticThread of syntheticThreads) {
      const exists = result.some((thread) => thread.key === syntheticThread.key);

      if (!exists) {
        result.unshift(syntheticThread);
      }
    }

    return result;
  }, [threads, syntheticThreads]);

  const selectedThread =
    allThreads.find((thread) => thread.key === activeThreadKey) || null;

  const selectedRequest = selectedThread?.serviceRequestId
    ? requestMap.get(selectedThread.serviceRequestId)
    : undefined;

  const selectedMessages = useMemo(() => {
    if (!selectedThread) return [];

    return messages.filter((message) =>
      isMessageInThread(message, selectedThread, user?.id),
    );
  }, [messages, selectedThread, user?.id]);

  const filteredThreads = useMemo(() => {
    const term = referenceSearch.trim().toLowerCase();

    if (!term) return allThreads;

    return allThreads.filter((thread) =>
      [
        thread.title,
        thread.subtitle,
        thread.referenceNumber,
        thread.participantName,
        thread.lastMessage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [allThreads, referenceSearch]);

  const handleOpenByReference = () => {
    const normalized = normalizeReference(referenceSearch);

    if (!normalized) {
      toast.error("Enter a request reference number.");
      return;
    }

    for (const request of requestMap.values()) {
      if (normalizeReference(request.referenceNumber) === normalized) {
        setOpenedRequestId(request.id);
        setActiveThreadKey(`request:${request.id}`);
        return;
      }
    }

    toast.error("No request found with that reference number.");
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    if (!selectedThread) {
      toast.error("Select a conversation first.");
      return;
    }

    if (!selectedThread.serviceRequestId && !selectedThread.recipientUserId) {
      toast.error("This conversation has no request or recipient.");
      return;
    }

    setSending(true);

    try {
      const finalVisibility =
        activeRole === "client"
          ? "conversation"
          : activeRole === "accountant" && visibility === "admin"
            ? "staff"
            : visibility;

      const payload = {
        service_request_id: selectedThread.serviceRequestId || undefined,
        recipient_user_id: selectedThread.serviceRequestId
          ? undefined
          : selectedThread.recipientUserId || undefined,
        subject:
          selectedThread.referenceNumber ||
          selectedThread.subject ||
          selectedThread.title ||
          "Message",
        body: text.trim(),
        message_type: getMessageTypeForVisibility(finalVisibility),
        visibility: finalVisibility,
        is_internal: finalVisibility !== "conversation",
      };

      const result = await api.post<unknown>("/messages", payload);
      const created = getCreatedMessage(result.data);

      if (created) {
        setMessages((current) =>
          [...current, created].sort(
            (a, b) => getCreatedTime(a.created_at) - getCreatedTime(b.created_at),
          ),
        );
      } else {
        await loadAll();
      }

      setText("");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file) return;

    if (!selectedThread?.serviceRequestId) {
      toast.error("Open a service request conversation before uploading a document.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 20 MB.");
      return;
    }

    setUploading(true);

    try {
      const finalVisibility =
        activeRole === "client"
          ? "conversation"
          : activeRole === "accountant" && visibility === "admin"
            ? "staff"
            : visibility;

      const documentSettings = getDocumentUploadSettings(
        activeRole,
        finalVisibility,
      );

      await uploadDocument({
        file,
        service_request_id: selectedThread.serviceRequestId,
        visibility: documentSettings.visibility,
        document_type: documentSettings.document_type,
        is_final: documentSettings.is_final,
        description: `Uploaded from chat for ${
          selectedThread.referenceNumber || selectedThread.title
        }`,
      });

      const messageBody = text.trim()
        ? `${text.trim()}\n\nUploaded document: ${file.name}`
        : `Uploaded document: ${file.name}`;

      const result = await api.post<unknown>("/messages", {
        service_request_id: selectedThread.serviceRequestId,
        subject:
          selectedThread.referenceNumber ||
          selectedThread.subject ||
          selectedThread.title ||
          "Document upload",
        body: messageBody,
        message_type: getMessageTypeForVisibility(finalVisibility),
        visibility: finalVisibility,
        is_internal: finalVisibility !== "conversation",
      });

      const created = getCreatedMessage(result.data);

      if (created) {
        setMessages((current) =>
          [...current, created].sort(
            (a, b) => getCreatedTime(a.created_at) - getCreatedTime(b.created_at),
          ),
        );
      } else {
        await loadAll();
      }

      setText("");
      toast.success("Document uploaded and message sent.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to upload document."));
    } finally {
      setUploading(false);
    }
  };

  const selectedTitle =
    selectedThread?.participantName || selectedThread?.title || "No conversation selected";

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
                Search by request reference number
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAll()}
              className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-lightgray hover:text-navy"
              title="Refresh"
            >
              <RefreshCcw size={15} />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 bg-lightgray/40 p-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={referenceSearch}
              onChange={(event) => setReferenceSearch(event.target.value)}
              placeholder="Search or enter reference number..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenByReference}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-teal"
          >
            Open by Reference
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-lightgray">
                <MessageCircle size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                No conversations found
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Search using a request reference number.
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const active = activeThreadKey === thread.key;

              return (
                <button
                  key={thread.key}
                  type="button"
                  onClick={() => {
                    if (thread.serviceRequestId) {
                      setOpenedRequestId(thread.serviceRequestId);
                    }

                    setActiveThreadKey(thread.key);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-lightgray",
                    active && "border-l-2 border-l-teal bg-teal/5",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {thread.participantName
                      ? thread.participantName[0]?.toUpperCase()
                      : thread.referenceNumber
                        ? "R"
                        : "U"}
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
                      {thread.participantName
                        ? `${thread.participantName} · ${thread.subtitle}`
                        : thread.subtitle}
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
            {selectedThread?.participantName
              ? selectedThread.participantName[0]?.toUpperCase()
              : selectedThread?.referenceNumber
                ? "R"
                : "U"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">
              {selectedTitle}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {selectedThread?.referenceNumber ? (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-navy">
                  {selectedThread.referenceNumber}
                </span>
              ) : null}

              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  roleTone(activeRole),
                )}
              >
                {roleText(activeRole)}
              </span>

              <span className="truncate text-xs text-gray-400">
                {selectedThread?.subtitle || "Choose a conversation."}
              </span>
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
                Use the request reference number to open a request chat.
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
                  const senderName = getSenderDisplayName(
                    message,
                    user?.id,
                    selectedRequest,
                  );

                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isMe ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "flex max-w-[75%] flex-col gap-1",
                          isMe ? "items-end" : "items-start",
                        )}
                      >
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-xs text-gray-400">
                            {senderName}
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(message.created_at)}
                          </span>
                        </div>

                        <div
                          className={cn(
                            "whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed",
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
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition-colors hover:bg-lightgray hover:text-navy disabled:opacity-50"
                  title="Upload document"
                >
                  {uploading ? (
                    <RefreshCcw size={16} className="animate-spin" />
                  ) : (
                    <Paperclip size={16} />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                />

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={`Message ${
                    selectedThread.participantName ||
                    selectedThread.referenceNumber ||
                    "user"
                  }...`}
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