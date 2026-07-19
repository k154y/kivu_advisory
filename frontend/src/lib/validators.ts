import { z } from "zod";

type CustomValidationIssue = {
  code: typeof z.ZodIssueCode.custom;
  path?: Array<string | number>;
  message: string;
};

type SuperRefineContext = {
  addIssue: (issue: CustomValidationIssue) => void;
};

const requiredText = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required.`);

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Maximum ${max} characters allowed.`)
    .optional()
    .or(z.literal(""));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .optional()
  .or(z.literal(""));

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .min(7, "Phone number is too short.")
  .max(30, "Phone number is too long.")
  .regex(
    /^[0-9+\-\s()]+$/,
    "Phone number can only contain numbers, spaces, +, -, and brackets.",
  );

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30, "Phone number is too long.")
  .regex(
    /^[0-9+\-\s()]*$/,
    "Phone number can only contain numbers, spaces, +, -, and brackets.",
  )
  .optional()
  .or(z.literal(""));

export const strongPasswordSchema = z
  .string()
  .min(1, "Password is required.")
  .min(10, "Password must be at least 10 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character.",
  );

export const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const contactMethodSchema = z.enum(["email", "phone", "whatsapp"]);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const registerClientSchema = z.object({
  full_name: requiredText("Full name").min(
    2,
    "Full name must be at least 2 characters.",
  ),
  company_name: optionalText(150),
  email: emailSchema,
  phone: phoneSchema,
  whatsapp: optionalPhoneSchema,
  location: optionalText(150),
  password: strongPasswordSchema,
  accept_terms: z.literal(true, {
    error: "You must accept the terms and conditions.",
  }),
});

type RequesterContactValues = {
  requester_email?: string;
  requester_phone?: string;
};

const requireRequesterEmailOrPhone = (
  values: RequesterContactValues,
  ctx: SuperRefineContext,
) => {
  const hasEmail = Boolean(values.requester_email?.trim());
  const hasPhone = Boolean(values.requester_phone?.trim());

  if (!hasEmail && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["requester_email"],
      message: "Email or phone number is required.",
    });

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["requester_phone"],
      message: "Email or phone number is required.",
    });
  }
};

type ConsultationContactValues = {
  email?: string;
  phone?: string;
  whatsapp?: string;
};

const requireConsultationContact = (
  values: ConsultationContactValues,
  ctx: SuperRefineContext,
) => {
  const hasEmail = Boolean(values.email?.trim());
  const hasPhone = Boolean(values.phone?.trim());
  const hasWhatsapp = Boolean(values.whatsapp?.trim());

  if (!hasEmail && !hasPhone && !hasWhatsapp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Email, phone, or WhatsApp is required.",
    });

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phone"],
      message: "Email, phone, or WhatsApp is required.",
    });

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["whatsapp"],
      message: "Email, phone, or WhatsApp is required.",
    });
  }
};

type AdminServicePriceValues = {
  show_price_label: boolean;
  price_label?: string;
};

const requirePriceLabelWhenVisible = (
  values: AdminServicePriceValues,
  ctx: SuperRefineContext,
) => {
  if (values.show_price_label && !values.price_label?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price_label"],
      message: "Price label is required when price display is enabled.",
    });
  }
};

export const visitorServiceRequestSchema = z
  .object({
    service_id: optionalText(100),
    requester_name: optionalText(150),
    requester_email: optionalEmailSchema,
    requester_phone: optionalPhoneSchema,
    requester_company: optionalText(150),
    title: requiredText("Request title")
      .min(2, "Request title must be at least 2 characters.")
      .max(200, "Request title must not exceed 200 characters."),
    description: requiredText("Description")
      .min(5, "Description must be at least 5 characters.")
      .max(5000, "Description must not exceed 5000 characters."),
    priority: prioritySchema.default("normal"),
    preferred_contact_method: contactMethodSchema.default("phone"),
    expected_deadline: optionalText(30),
    source: z.enum(["website", "client_portal", "admin"]).default("website"),
  })
  .superRefine(requireRequesterEmailOrPhone);

export const clientServiceRequestSchema = z.object({
  service_id: optionalText(100),
  title: requiredText("Request title")
    .min(2, "Request title must be at least 2 characters.")
    .max(200, "Request title must not exceed 200 characters."),
  description: requiredText("Description")
    .min(5, "Description must be at least 5 characters.")
    .max(5000, "Description must not exceed 5000 characters."),
  priority: prioritySchema.default("normal"),
  preferred_contact_method: contactMethodSchema.default("phone"),
  expected_deadline: optionalText(30),
  source: z.enum(["website", "client_portal", "admin"]).default("client_portal"),
});

export const adminServiceRequestSchema = z
  .object({
    service_id: optionalText(100),
    requester_name: optionalText(150),
    requester_email: optionalEmailSchema,
    requester_phone: optionalPhoneSchema,
    requester_company: optionalText(150),
    title: requiredText("Request title")
      .min(2, "Request title must be at least 2 characters.")
      .max(200, "Request title must not exceed 200 characters."),
    description: requiredText("Description")
      .min(5, "Description must be at least 5 characters.")
      .max(5000, "Description must not exceed 5000 characters."),
    priority: prioritySchema.default("normal"),
    preferred_contact_method: contactMethodSchema.default("phone"),
    expected_deadline: optionalText(30),
    source: z.enum(["website", "client_portal", "admin"]).default("admin"),
    admin_notes: optionalText(5000),
    internal_notes: optionalText(5000),
  })
  .superRefine(requireRequesterEmailOrPhone);

export const serviceRequestStatusSchema = z.object({
  status: z.enum([
    "new",
    "pending",
    "in_review",
    "waiting_client",
    "in_progress",
    "completed",
    "cancelled",
  ]),
  admin_notes: optionalText(5000),
  internal_notes: optionalText(5000),
});

export const consultationSchema = z
  .object({
    full_name: requiredText("Full name")
      .min(2, "Full name must be at least 2 characters.")
      .max(150, "Full name must not exceed 150 characters."),
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    whatsapp: optionalPhoneSchema,
    company_name: optionalText(150),
    subject: requiredText("Subject")
      .min(2, "Subject must be at least 2 characters.")
      .max(200, "Subject must not exceed 200 characters."),
    message: requiredText("Message")
      .min(5, "Message must be at least 5 characters.")
      .max(5000, "Message must not exceed 5000 characters."),
    consultation_type: z
      .enum([
        "general",
        "accounting",
        "tax",
        "audit",
        "business_advisory",
        "legal",
        "other",
      ])
      .default("general"),
    preferred_contact_method: contactMethodSchema.default("phone"),
    preferred_date: optionalText(30),
    preferred_time: optionalText(50),
    priority: prioritySchema.default("normal"),
  })
  .superRefine(requireConsultationContact);

export const adminConsultationSchema = consultationSchema.and(
  z.object({
    assigned_to_user_id: optionalText(100),
    handled_by_user_id: optionalText(100),
    admin_notes: optionalText(5000),
    follow_up_notes: optionalText(5000),
  }),
);

export const consultationStatusSchema = z.object({
  status: z.enum([
    "new",
    "contacted",
    "scheduled",
    "in_progress",
    "closed",
    "cancelled",
  ]),
  assigned_to_user_id: optionalText(100),
  handled_by_user_id: optionalText(100),
  admin_notes: optionalText(5000),
  follow_up_notes: optionalText(5000),
});

export const adminServiceSchema = z
  .object({
    title: requiredText("Service title")
      .min(2, "Service title must be at least 2 characters.")
      .max(150, "Service title must not exceed 150 characters."),
    slug: requiredText("Slug")
      .min(2, "Slug must be at least 2 characters.")
      .max(180, "Slug is too long.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must use lowercase letters, numbers, and hyphens only.",
      ),
    short_description: optionalText(300),
    description: optionalText(5000),
    category: optionalText(100),
    price_label: optionalText(100),
    show_price_label: z.coerce.boolean().default(false),
    estimated_duration: optionalText(100),
    is_featured: z.coerce.boolean().default(false),
    is_active: z.coerce.boolean().default(true),
    display_order: z.coerce
      .number()
      .int("Display order must be a whole number.")
      .min(0, "Display order cannot be negative.")
      .default(0),
  })
  .superRefine(requirePriceLabelWhenVisible);

export const assignmentCreateSchema = z.object({
  service_request_id: requiredText("Service request"),
  accountant_user_id: requiredText("Accountant"),
  priority: prioritySchema.default("normal"),
  due_date: optionalText(30),
  notes: optionalText(5000),
  internal_notes: optionalText(5000),
});

export const assignmentUpdateSchema = z.object({
  accountant_user_id: requiredText("Accountant"),
  priority: prioritySchema.default("normal"),
  due_date: optionalText(30),
  notes: optionalText(5000),
  internal_notes: optionalText(5000),
});

export const assignmentStatusSchema = z.object({
  status: z.enum(["assigned", "accepted", "in_progress", "completed", "cancelled"]),
  notes: optionalText(5000),
  internal_notes: optionalText(5000),
});

export const documentUploadSchema = z.object({
  service_request_id: requiredText("Service request"),
  visibility: z
    .enum(["client", "admin", "accountant", "internal", "shared"])
    .default("shared"),
  document_type: z
    .enum([
      "client_upload",
      "admin_upload",
      "accountant_upload",
      "final_deliverable",
      "internal",
    ])
    .default("client_upload"),
  description: optionalText(1000),
  is_final: z.coerce.boolean().default(false),
});

export const documentUpdateSchema = z.object({
  visibility: z.enum(["client", "admin", "accountant", "internal", "shared"]),
  document_type: z.enum([
    "client_upload",
    "admin_upload",
    "accountant_upload",
    "final_deliverable",
    "internal",
  ]),
  description: optionalText(1000),
  is_final: z.coerce.boolean().default(false),
});

export const messageCreateSchema = z.object({
  service_request_id: optionalText(100),
  recipient_user_id: optionalText(100),
  subject: optionalText(200),
  body: requiredText("Message")
    .min(1, "Message is required.")
    .max(5000, "Message must not exceed 5000 characters."),
  message_type: z
    .enum(["message", "note", "system", "status_update"])
    .default("message"),
  visibility: z.enum(["conversation", "staff", "admin"]).default("conversation"),
  is_internal: z.coerce.boolean().default(false),
});

export const searchSchema = z.object({
  search: optionalText(150),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterClientFormValues = z.infer<typeof registerClientSchema>;

export type VisitorServiceRequestFormValues = z.infer<
  typeof visitorServiceRequestSchema
>;
export type ClientServiceRequestFormValues = z.infer<
  typeof clientServiceRequestSchema
>;
export type AdminServiceRequestFormValues = z.infer<
  typeof adminServiceRequestSchema
>;
export type ServiceRequestStatusFormValues = z.infer<
  typeof serviceRequestStatusSchema
>;

export type ConsultationFormValues = z.infer<typeof consultationSchema>;
export type AdminConsultationFormValues = z.infer<typeof adminConsultationSchema>;
export type ConsultationStatusFormValues = z.infer<
  typeof consultationStatusSchema
>;

export type AdminServiceFormValues = z.infer<typeof adminServiceSchema>;

export type AssignmentCreateFormValues = z.infer<typeof assignmentCreateSchema>;
export type AssignmentUpdateFormValues = z.infer<typeof assignmentUpdateSchema>;
export type AssignmentStatusFormValues = z.infer<typeof assignmentStatusSchema>;

export type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;
export type DocumentUpdateFormValues = z.infer<typeof documentUpdateSchema>;

export type MessageCreateFormValues = z.infer<typeof messageCreateSchema>;
export type SearchFormValues = z.infer<typeof searchSchema>;

export const passwordRules = [
  "At least 10 characters",
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one number",
  "At least one special character",
] as const;