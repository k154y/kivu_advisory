import type { HTMLAttributes } from "react";

import {
  getActiveStatusStyle,
  getAssignmentStatusStyle,
  getConsultationStatusStyle,
  getDocumentTypeStyle,
  getDocumentVisibilityStyle,
  getMessageVisibilityStyle,
  getPriorityStyle,
  getServiceRequestStatusStyle,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusBadgeType =
  | "service-request"
  | "assignment"
  | "consultation"
  | "message-visibility"
  | "document-visibility"
  | "document-type"
  | "priority"
  | "active";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  type: StatusBadgeType;
  value?: string | boolean | null;
};

const getStatusStyle = (type: StatusBadgeType, value?: string | boolean | null) => {
  if (type === "service-request") {
    return getServiceRequestStatusStyle(typeof value === "string" ? value : null);
  }

  if (type === "assignment") {
    return getAssignmentStatusStyle(typeof value === "string" ? value : null);
  }

  if (type === "consultation") {
    return getConsultationStatusStyle(typeof value === "string" ? value : null);
  }

  if (type === "message-visibility") {
    return getMessageVisibilityStyle(typeof value === "string" ? value : null);
  }

  if (type === "document-visibility") {
    return getDocumentVisibilityStyle(typeof value === "string" ? value : null);
  }

  if (type === "document-type") {
    return getDocumentTypeStyle(typeof value === "string" ? value : null);
  }

  if (type === "priority") {
    return getPriorityStyle(typeof value === "string" ? value : null);
  }

  return getActiveStatusStyle(Boolean(value));
};

export function StatusBadge({
  type,
  value,
  className,
  ...props
}: StatusBadgeProps) {
  const statusStyle = getStatusStyle(type, value);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyle.className,
        className,
      )}
      {...props}
    >
      {statusStyle.label}
    </span>
  );
}

export type { StatusBadgeProps, StatusBadgeType };