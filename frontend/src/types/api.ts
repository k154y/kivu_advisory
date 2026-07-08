export type UserRole = "admin" | "client" | "accountant";

export type ServiceRequestStatus =
  | "new"
  | "pending"
  | "in_review"
  | "waiting_client"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ConsultationStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "in_progress"
  | "closed"
  | "cancelled";

export type Priority = "low" | "normal" | "high" | "urgent";

export type ContactMethod = "email" | "phone" | "whatsapp";

export type ServiceRequestSource = "website" | "client_portal" | "admin";

export type ConsultationType =
  | "general"
  | "accounting"
  | "tax"
  | "audit"
  | "business_advisory"
  | "legal"
  | "other";

export type MessageType = "message" | "note" | "system" | "status_update";

export type MessageVisibility = "conversation" | "staff" | "admin";

export type DocumentVisibility =
  | "client"
  | "admin"
  | "accountant"
  | "internal"
  | "shared";

export type DocumentType =
  | "client_upload"
  | "admin_upload"
  | "accountant_upload"
  | "final_deliverable"
  | "internal";

export type DocumentStatus = "active" | "deleted";
export type BlogStatus = "draft" | "published" | "archived";

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type PaginationMeta = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type ApiSuccessEnvelope<T> = {
  success: true;
  message?: string;
  data?: T;
  meta?: PaginationMeta | unknown;
  timestamp: string;
};

export type ApiErrorEnvelope = {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export type ValidationErrors = Record<string, string>;

export type ListQueryParams = {
  search?: string;
  page?: number;
  page_size?: number;
};

export type AuthenticatedUser = {
  id: string;
  full_name: string;
  company_name?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  refresh_expires_in_seconds: number;
  user: AuthenticatedUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterClientRequest = {
  full_name: string;
  company_name?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  location?: string;
  password: string;
  accept_terms: boolean;
};

export type CreateAccountantRequest = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

export type PublicAccountant = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicClient = {
  id: string;
  user_id: string;
  company_name?: string;
  tin?: string;
  business_type?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  category?: string;
  price_label?: string;
  show_price_label: boolean;
  estimated_duration?: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ServiceRequest = {
  id: string;
  reference_number: string;
  client_id?: string;
  service_id?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_company?: string;
  title: string;
  description: string;
  status: ServiceRequestStatus | string;
  priority: Priority | string;
  preferred_contact_method?: ContactMethod | string;
  expected_deadline?: string | null;
  source: ServiceRequestSource | string;
  admin_notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
};

export type CreateServiceRequestRequest = {
  client_id?: string;
  service_id?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_company?: string;
  title: string;
  description: string;
  priority?: Priority;
  preferred_contact_method?: ContactMethod;
  expected_deadline?: string | null;
  source?: ServiceRequestSource;
};

export type UpdateServiceRequestRequest = {
  service_id?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_company?: string;
  title: string;
  description: string;
  priority?: Priority;
  preferred_contact_method?: ContactMethod;
  expected_deadline?: string | null;
  admin_notes?: string;
  internal_notes?: string;
};

export type UpdateServiceRequestStatusRequest = {
  status: ServiceRequestStatus;
  admin_notes?: string;
  internal_notes?: string;
};

export type Assignment = {
  id: string;
  service_request_id: string;
  accountant_user_id: string;
  assigned_by_user_id?: string;
  status: AssignmentStatus | string;
  priority: Priority | string;
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
};

export type CreateAssignmentRequest = {
  service_request_id: string;
  accountant_user_id: string;
  priority?: Priority;
  due_date?: string | null;
  notes?: string;
  internal_notes?: string;
};

export type UpdateAssignmentRequest = {
  accountant_user_id: string;
  priority?: Priority;
  due_date?: string | null;
  notes?: string;
  internal_notes?: string;
};

export type UpdateAssignmentStatusRequest = {
  status: AssignmentStatus;
  notes?: string;
  internal_notes?: string;
};

export type DocumentItem = {
  id: string;
  service_request_id?: string;
  uploaded_by_user_id?: string;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_driver?: string;
  visibility: DocumentVisibility | string;
  document_type: DocumentType | string;
  status: DocumentStatus | string;
  is_final: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type UploadDocumentRequest = {
  service_request_id: string;
  file: File;
  visibility?: DocumentVisibility;
  document_type?: DocumentType;
  is_final?: boolean;
  description?: string;
};

export type UpdateDocumentRequest = {
  visibility: DocumentVisibility;
  document_type: DocumentType;
  is_final: boolean;
  description?: string;
};

export type MessageItem = {
  id: string;
  service_request_id?: string;
  sender_user_id?: string;
  recipient_user_id?: string;
  subject?: string;
  body: string;
  message_type: MessageType | string;
  visibility: MessageVisibility | string;
  is_internal: boolean;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMessageRequest = {
  service_request_id?: string;
  recipient_user_id?: string;
  subject?: string;
  body: string;
  message_type?: MessageType;
  visibility?: MessageVisibility;
  is_internal?: boolean;
};

export type Consultation = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  subject: string;
  message: string;
  consultation_type: ConsultationType | string;
  preferred_contact_method: ContactMethod | string;
  preferred_date?: string | null;
  preferred_time?: string;
  status: ConsultationStatus | string;
  priority: Priority | string;
  assigned_to_user_id?: string;
  handled_by_user_id?: string;
  admin_notes?: string;
  follow_up_notes?: string;
  contacted_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateConsultationRequest = {
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  subject: string;
  message: string;
  consultation_type?: ConsultationType;
  preferred_contact_method?: ContactMethod;
  preferred_date?: string | null;
  preferred_time?: string;
  priority?: Priority;
};

export type UpdateConsultationRequest = {
  full_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company_name?: string;
  subject: string;
  message: string;
  consultation_type?: ConsultationType;
  preferred_contact_method?: ContactMethod;
  preferred_date?: string | null;
  preferred_time?: string;
  priority?: Priority;
  assigned_to_user_id?: string;
  handled_by_user_id?: string;
  admin_notes?: string;
  follow_up_notes?: string;
};

export type UpdateConsultationStatusRequest = {
  status: ConsultationStatus;
  assigned_to_user_id?: string;
  handled_by_user_id?: string;
  admin_notes?: string;
  follow_up_notes?: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  category?: string;
  tags: string[];
  featured_image_url?: string;
  status: BlogStatus | string;
  is_featured: boolean;
  meta_title?: string;
  meta_description?: string;
  author_user_id?: string;
  published_at?: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type ContentBlock = {
  id: string;
  content_key: string;
  title?: string;
  slug?: string;
  content_type: string;
  body?: string;
  summary?: string;
  meta_title?: string;
  meta_description?: string;
  image_url?: string;
  button_label?: string;
  button_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type PublicStaffMember = {
  id: string;
  full_name: string;
  slug: string;
  role_title: string;
  short_description?: string;
  bio?: string;
  education_background?: string;
  work_experience?: string;
  professional_certifications?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminStaffMember = PublicStaffMember & {
  show_on_website: boolean;
  show_on_homepage: boolean;
  show_bio: boolean;
  show_education: boolean;
  show_work_experience: boolean;
  show_certifications: boolean;
  show_contact: boolean;
  is_active: boolean;
  created_by_user_id?: string;
  updated_by_user_id?: string;
};

export type CreateStaffMemberRequest = {
  full_name: string;
  slug: string;
  role_title: string;
  short_description?: string;
  bio?: string;
  education_background?: string;
  work_experience?: string;
  professional_certifications?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  show_on_website: boolean;
  show_on_homepage: boolean;
  show_bio: boolean;
  show_education: boolean;
  show_work_experience: boolean;
  show_certifications: boolean;
  show_contact: boolean;
  display_order: number;
  is_active: boolean;
};

export type UpdateStaffMemberRequest = CreateStaffMemberRequest;

export type UpdateStaffStatusRequest = {
  is_active: boolean;
  show_on_website: boolean;
  show_on_homepage: boolean;
};

export type ApiListResult<T> = {
  items: T[];
  meta?: PaginationMeta | unknown;
};

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  cache?: RequestCache;
};