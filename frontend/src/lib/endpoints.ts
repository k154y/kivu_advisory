const withQuery = (
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!params) return path;

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `${path}?${queryString}` : path;
};

export const endpoints = {
  health: "/health",

  auth: {
    login: "/auth/login",
    register: "/auth/register",
    refresh: "/auth/refresh",
    me: "/auth/me",
    createAccountant: "/admin/accountants",
  },

  client: {
    profile: "/client/profile",

    serviceRequests: "/client/service-requests",
    serviceRequestDetail: (id: string) =>
      withQuery("/client/service-requests/detail", { id }),
  },

public: {
  services: "/services",
  serviceDetailBySlug: (slug: string) =>
    withQuery("/services/detail", { slug }),

  visitorServiceRequests: "/service-requests",

  consultations: "/consultations",

  content: "/content",
  contentDetail: (slug: string) => withQuery("/content/detail", { slug }),

  blog: "/blog",
  blogDetail: (slug: string) => withQuery("/blog/detail", { slug }),

  staff: (params?: {
    search?: string;
    homepage?: boolean;
    page?: number;
    page_size?: number;
  }) => withQuery("/staff", params),

  staffDetail: (slug: string) => withQuery("/staff/detail", { slug }),
},

  admin: {
    clients: (params?: { search?: string; page?: number; page_size?: number }) =>
      withQuery("/admin/clients", params),
    clientDetail: (id: string) => withQuery("/admin/clients/detail", { id }),

    services: "/admin/services",
    adminServices: (params?: {
      search?: string;
      page?: number;
      page_size?: number;
      is_active?: boolean;
    }) => withQuery("/admin/services", params),
    serviceDetail: (id: string) => withQuery("/admin/services/detail", { id }),
    serviceStatus: (id: string) => withQuery("/admin/services/status", { id }),

    serviceRequests: (params?: {
      search?: string;
      status?: string;
      page?: number;
      page_size?: number;
    }) => withQuery("/admin/service-requests", params),
    serviceRequestDetail: (id: string) =>
      withQuery("/admin/service-requests/detail", { id }),
    serviceRequestStatus: (id: string) =>
      withQuery("/admin/service-requests/status", { id }),
    serviceRequestByReference: (referenceNumber: string) =>
      withQuery("/admin/service-requests/reference", {
        reference_number: referenceNumber,
      }),

    assignments: (params?: {
      search?: string;
      status?: string;
      accountant_id?: string;
      service_request_id?: string;
      page?: number;
      page_size?: number;
    }) => withQuery("/admin/assignments", params),
    assignmentDetail: (id: string) =>
      withQuery("/admin/assignments/detail", { id }),
    assignmentStatus: (id: string) =>
      withQuery("/admin/assignments/status", { id }),

    consultations: (params?: {
      search?: string;
      status?: string;
      consultation_type?: string;
      priority?: string;
      page?: number;
      page_size?: number;
    }) => withQuery("/admin/consultations", params),
    consultationDetail: (id: string) =>
      withQuery("/admin/consultations/detail", { id }),
    consultationStatus: (id: string) =>
      withQuery("/admin/consultations/status", { id }),

    /*
     * Backend-confirmed accountant management endpoints.
     * These are different from POST /admin/accountants.
     */
    accountantAccounts: (params?: {
      search?: string;
      is_active?: boolean;
      page?: number;
      page_size?: number;
    }) => withQuery("/admin/accountant-accounts", params),
    accountantAccountDetail: (id: string) =>
      withQuery("/admin/accountant-accounts/detail", { id }),
    accountantAccountStatus: (id: string) =>
      withQuery("/admin/accountant-accounts/status", { id }),

    content: "/admin/content",
    contentDetail: (id: string) => withQuery("/admin/content/detail", { id }),
    contentStatus: (id: string) => withQuery("/admin/content/status", { id }),

    blog: "/admin/blog",
    blogDetail: (id: string) => withQuery("/admin/blog/detail", { id }),
    blogStatus: (id: string) => withQuery("/admin/blog/status", { id }),

    staff: (params?: {
      search?: string;
      show_on_website?: boolean;
      show_on_homepage?: boolean;
      is_active?: boolean;
      page?: number;
      page_size?: number;
    }) => withQuery("/admin/staff", params),

    staffCreate: "/admin/staff",

    staffDetail: (id: string) => withQuery("/admin/staff/detail", { id }),

    staffStatus: (id: string) => withQuery("/admin/staff/status", { id }),
    },

  accountant: {
    profile: "/accountant/profile",

    assignments: (params?: {
      status?: string;
      page?: number;
      page_size?: number;
    }) => withQuery("/accountant/assignments", params),
    assignmentDetail: (id: string) =>
      withQuery("/accountant/assignments/detail", { id }),
    assignmentStatus: (id: string) =>
      withQuery("/accountant/assignments/status", { id }),
  },

  documents: {
    list: (params?: {
      service_request_id?: string;
      page?: number;
      page_size?: number;
    }) => withQuery("/documents", params),
    upload: "/documents",
    detail: (id: string) => withQuery("/documents/detail", { id }),
    download: (id: string) => withQuery("/documents/download", { id }),
  },

  messages: {
    list: (params?: {
      service_request_id?: string;
      page?: number;
      page_size?: number;
    }) => withQuery("/messages", params),
    create: "/messages",
    detail: (id: string) => withQuery("/messages/detail", { id }),
    markRead: (id: string) => withQuery("/messages/read", { id }),
  },

  /*
   * These features are required by the project but not fully confirmed
   * as callable frontend endpoints from the pasted backend routes.
   * We will not call them until backend support is added.
   */
  missingBackend: {
    notifications: {
      list: "/notifications",
      markRead: (id: string) => withQuery("/notifications/read", { id }),
    },

    staff: {
      publicList: "/staff",
      adminList: "/admin/staff",
    },

    clientTaxAccounts: {
      list: (clientId: string) =>
        withQuery("/admin/client-tax-accounts", { client_id: clientId }),
      create: "/admin/client-tax-accounts",
      detail: (id: string) =>
        withQuery("/admin/client-tax-accounts/detail", { id }),
    },

    testimonials: {
      publicList: "/testimonials",
      adminList: "/admin/testimonials",
      adminDetail: (id: string) =>
        withQuery("/admin/testimonials/detail", { id }),
      adminStatus: (id: string) =>
        withQuery("/admin/testimonials/status", { id }),
    },
  },
} as const;

export type EndpointKey = typeof endpoints;