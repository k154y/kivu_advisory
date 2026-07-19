export const APP_NAME = "Kivu Advisory";

export const APP_DESCRIPTION =
  "Professional accounting, tax, audit, and business advisory services.";

export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const SERVICE_REQUEST_STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Pending", value: "pending" },
  { label: "In review", value: "in_review" },
  { label: "Waiting client", value: "waiting_client" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export const ASSIGNMENT_STATUS_OPTIONS = [
  { label: "Assigned", value: "assigned" },
  { label: "Accepted", value: "accepted" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export const CONSULTATION_STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In progress", value: "in_progress" },
  { label: "Closed", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
];

export const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export const CONTACT_METHOD_OPTIONS = [
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "WhatsApp", value: "whatsapp" },
];

export const SERVICE_REQUEST_SOURCE_OPTIONS = [
  { label: "Website", value: "website" },
  { label: "Client portal", value: "client_portal" },
  { label: "Admin", value: "admin" },
];

export const CONSULTATION_TYPE_OPTIONS = [
  { label: "General", value: "general" },
  { label: "Accounting", value: "accounting" },
  { label: "Tax", value: "tax" },
  { label: "Audit", value: "audit" },
  { label: "Business advisory", value: "business_advisory" },
  { label: "Legal", value: "legal" },
  { label: "Other", value: "other" },
];

export const DOCUMENT_VISIBILITY_OPTIONS = [
  { label: "Client", value: "client" },
  { label: "Admin", value: "admin" },
  { label: "Accountant", value: "accountant" },
  { label: "Internal", value: "internal" },
  { label: "Shared", value: "shared" },
];

export const DOCUMENT_TYPE_OPTIONS = [
  { label: "Client upload", value: "client_upload" },
  { label: "Admin upload", value: "admin_upload" },
  { label: "Accountant upload", value: "accountant_upload" },
  { label: "Final deliverable", value: "final_deliverable" },
  { label: "Internal", value: "internal" },
];

export const MESSAGE_TYPE_OPTIONS = [
  { label: "Message", value: "message" },
  { label: "Note", value: "note" },
  { label: "System", value: "system" },
  { label: "Status update", value: "status_update" },
];

export const MESSAGE_VISIBILITY_OPTIONS = [
  { label: "Conversation", value: "conversation" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

export const ACTIVE_STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active only", value: "active" },
  { label: "Inactive only", value: "inactive" },
];

export const PUBLIC_SERVICE_CATEGORIES = [
  "Accounting",
  "Tax advisory",
  "Audit",
  "Business advisory",
  "Legal advisory",
  "Company compliance",
  "Training",
];

export const DASHBOARD_DATE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" },
];

export const SUPPORT_EMAIL = "info@kivuadvisory.com";

export const SUPPORT_PHONE = "+250 788 000 000";

export const SUPPORT_WHATSAPP = "+250 788 000 000";