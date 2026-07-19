import type {
  AssignmentStatus,
  ConsultationStatus,
  MessageVisibility,
  ServiceRequestStatus,
} from "@/types/api";

type StatusStyle = {
  label: string;
  className: string;
};

const fallbackDateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const fallbackDateTimeFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const rwfFormatter = new Intl.NumberFormat("en-RW", {
  style: "currency",
  currency: "RWF",
  maximumFractionDigits: 0,
});

export const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return fallbackDateFormatter.format(date);
};

export const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return fallbackDateTimeFormatter.format(date);
};

export const formatTime = (value?: string | Date | null) => {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatMoney = (value?: number | string | null) => {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return rwfFormatter.format(numericValue);
};

export const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex += 1;
  }

  const displaySize = size >= 10 ? Math.round(size) : Number(size.toFixed(1));

  return `${displaySize} ${units[unitIndex]}`;
};

export const formatBoolean = (value?: boolean | null) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
};

export const formatEmpty = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return String(value);
};

export const formatName = (value?: string | null) => {
  if (!value) return "Unknown";

  const cleanValue = value.trim();

  if (!cleanValue) {
    return "Unknown";
  }

  return cleanValue;
};

export const getInitials = (name?: string | null) => {
  if (!name) return "KA";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "KA";
  }

  return parts.map((part) => part[0]?.toUpperCase()).join("");
};

export const truncateText = (value?: string | null, maxLength = 80) => {
  if (!value) return "—";

  const cleanValue = value.trim();

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength).trim()}...`;
};

export const titleCase = (value?: string | null) => {
  if (!value) return "—";

  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => {
      const lowerWord = word.toLowerCase();
      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
    .join(" ");
};

export const formatReference = (value?: string | null) => {
  if (!value) return "No reference";
  return value.trim();
};

export const formatPhoneForDisplay = (value?: string | null) => {
  if (!value) return "—";
  return value.trim();
};

export const formatEmailForDisplay = (value?: string | null) => {
  if (!value) return "—";
  return value.trim().toLowerCase();
};

export const formatDocumentName = (value?: string | null) => {
  if (!value) return "Unnamed document";
  return value.trim();
};

export const formatMimeType = (value?: string | null) => {
  if (!value) return "Unknown file type";

  const cleanValue = value.trim().toLowerCase();

  if (cleanValue === "application/pdf") return "PDF";
  if (cleanValue.includes("word")) return "Word";
  if (cleanValue.includes("excel") || cleanValue.includes("spreadsheet")) {
    return "Excel";
  }
  if (cleanValue.startsWith("image/")) return "Image";

  return cleanValue;
};

export const serviceRequestStatusStyles: Record<string, StatusStyle> = {
  new: {
    label: "New",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  in_review: {
    label: "In review",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  waiting_client: {
    label: "Waiting client",
    className: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  in_progress: {
    label: "In progress",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

export const assignmentStatusStyles: Record<string, StatusStyle> = {
  assigned: {
    label: "Assigned",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  accepted: {
    label: "Accepted",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  in_progress: {
    label: "In progress",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

export const consultationStatusStyles: Record<string, StatusStyle> = {
  new: {
    label: "New",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  contacted: {
    label: "Contacted",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
  },
  in_progress: {
    label: "In progress",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  closed: {
    label: "Closed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

export const messageVisibilityStyles: Record<string, StatusStyle> = {
  conversation: {
    label: "Client conversation",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  staff: {
    label: "Staff only",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  admin: {
    label: "Admin only",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
};

export const documentVisibilityStyles: Record<string, StatusStyle> = {
  client: {
    label: "Client",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  admin: {
    label: "Admin",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  accountant: {
    label: "Accountant",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  internal: {
    label: "Internal",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  shared: {
    label: "Shared",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
};

export const documentTypeStyles: Record<string, StatusStyle> = {
  client_upload: {
    label: "Client upload",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  admin_upload: {
    label: "Admin upload",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  accountant_upload: {
    label: "Accountant upload",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  final_deliverable: {
    label: "Final deliverable",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
  },
  internal: {
    label: "Internal",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

export const activeStatusStyles: Record<string, StatusStyle> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  inactive: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

export const priorityStyles: Record<string, StatusStyle> = {
  low: {
    label: "Low",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  normal: {
    label: "Normal",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  high: {
    label: "High",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

const fallbackStatusStyle = (status?: string | null): StatusStyle => {
  return {
    label: titleCase(status || "unknown"),
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  };
};

export const getServiceRequestStatusStyle = (
  status?: ServiceRequestStatus | string | null,
) => {
  if (!status) return fallbackStatusStyle(status);
  return serviceRequestStatusStyles[status] || fallbackStatusStyle(status);
};

export const getAssignmentStatusStyle = (
  status?: AssignmentStatus | string | null,
) => {
  if (!status) return fallbackStatusStyle(status);
  return assignmentStatusStyles[status] || fallbackStatusStyle(status);
};

export const getConsultationStatusStyle = (
  status?: ConsultationStatus | string | null,
) => {
  if (!status) return fallbackStatusStyle(status);
  return consultationStatusStyles[status] || fallbackStatusStyle(status);
};

export const getMessageVisibilityStyle = (
  visibility?: MessageVisibility | string | null,
) => {
  if (!visibility) return fallbackStatusStyle(visibility);
  return messageVisibilityStyles[visibility] || fallbackStatusStyle(visibility);
};

export const getDocumentVisibilityStyle = (visibility?: string | null) => {
  if (!visibility) return fallbackStatusStyle(visibility);
  return documentVisibilityStyles[visibility] || fallbackStatusStyle(visibility);
};

export const getDocumentTypeStyle = (documentType?: string | null) => {
  if (!documentType) return fallbackStatusStyle(documentType);
  return documentTypeStyles[documentType] || fallbackStatusStyle(documentType);
};

export const getActiveStatusStyle = (isActive?: boolean | null) => {
  return isActive ? activeStatusStyles.active : activeStatusStyles.inactive;
};

export const getPriorityStyle = (priority?: string | null) => {
  if (!priority) return priorityStyles.normal;
  return priorityStyles[priority] || fallbackStatusStyle(priority);
};

export const downloadBlob = (blob: Blob, filename = "download") => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
};