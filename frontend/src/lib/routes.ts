export const routes = {
  home: "/",
  about: "/about",
  services: "/services",
  serviceDetail: (slug: string) => `/services/${slug}`,
  staff: "/staff",
  staffDetail: (slug: string) => `/staff/${slug}`,
  blog: "/blog",
  blogDetail: (slug: string) => `/blog/${slug}`,
  contact: "/contact",
  login: "/login",
  register: "/register",
  requestService: "/request-service",
  bookConsultation: "/book-consultation",

  admin: {
    dashboard: "/admin/dashboard",

    requests: "/admin/requests",
    requestDetail: (id: string) => `/admin/requests/${id}`,

    consultations: "/admin/consultations",
    consultationDetail: (id: string) => `/admin/consultations/${id}`,

    clients: "/admin/clients",
    clientDetail: (id: string) => `/admin/clients/${id}`,

    accountants: "/admin/accountants",
    accountantCreate: "/admin/accountants/create",
    accountantDetail: (id: string) => `/admin/accountants/${id}`,

    documents: "/admin/documents",
    messages: "/admin/messages",
    profile: "/admin/profile",
    auditLog: "/admin/audit-log",

    taxCredentialSystems: "/admin/tax-credential-systems",
    taxCredentials: "/admin/tax-credentials",

    contentManager: "/admin/content",
    content: {
      homepage: "/admin/content/homepage",
      about: "/admin/content/about",
      contact: "/admin/content/contact",
      footer: "/admin/content/footer",
      socialMedia: "/admin/content/social-media",
    },

    services: "/admin/services",
    serviceCreate: "/admin/services/create",
    serviceDetail: (id: string) => `/admin/services/${id}`,

    staff: "/admin/staff",

    blog: "/admin/blog",
    blogCreate: "/admin/blog/create",
    blogDetail: (id: string) => `/admin/blog/${id}`,

    testimonials: "/admin/testimonials",
    socialLinks: "/admin/content/social-media",
    statistics: "/admin/statistics",

    settings: "/admin/settings",
  },

  client: {
    dashboard: "/client/dashboard",
    profile: "/client/profile",
    requests: "/client/requests",
    requestDetail: (id: string) => `/client/requests/${id}`,
    documents: "/client/documents",
    messages: "/client/messages",
  },
accountant: {
  dashboard: "/accountant/dashboard",
  assignedWork: "/accountant/assigned-work",
  assignmentDetail: (id: string) => `/accountant/assigned-work/${id}`,
  messages: "/accountant/messages",
  profile: "/accountant/profile",
},
} as const;

export const publicNavigation = [
  { label: "Home", href: routes.home },
  { label: "About", href: routes.about },
  { label: "Services", href: routes.services },
  { label: "Staff", href: routes.staff },
  { label: "Blog", href: routes.blog },
  { label: "Contact", href: routes.contact },
];

export const adminNavigation = [
  { label: "Dashboard", href: routes.admin.dashboard },
  { label: "Service Requests", href: routes.admin.requests },
  { label: "Consultations", href: routes.admin.consultations },
  { label: "Clients", href: routes.admin.clients },
  { label: "Accountants", href: routes.admin.accountants },
  { label: "My Documents", href: routes.admin.documents },
  { label: "Messages", href: routes.admin.messages },
  {
    label: "Tax Systems",
    href: routes.admin.taxCredentialSystems,
  },
  {
    label: "Tax Credentials",
    href: routes.admin.taxCredentials,
  },
  { label: "My Profile", href: routes.admin.profile },
  { label: "Audit Log", href: routes.admin.auditLog },

  { label: "Website Content", href: routes.admin.contentManager },
  { label: "Services", href: routes.admin.services },
  { label: "Staff", href: routes.admin.staff },
  { label: "Blog Posts", href: routes.admin.blog },
  { label: "Testimonials", href: routes.admin.testimonials },
  { label: "Social Links", href: routes.admin.socialLinks },
  { label: "Statistics", href: routes.admin.statistics },
  { label: "Settings", href: routes.admin.settings },
];

export const adminContentNavigation = [
  { label: "Homepage", href: routes.admin.content.homepage },
  { label: "About page", href: routes.admin.content.about },
  { label: "Contact page", href: routes.admin.content.contact },
  { label: "Footer", href: routes.admin.content.footer },
  { label: "Social media", href: routes.admin.content.socialMedia },
];

export const clientNavigation = [
  { label: "Dashboard", href: routes.client.dashboard },
  { label: "My Requests", href: routes.client.requests },
  { label: "Documents", href: routes.client.documents },
  { label: "Messages", href: routes.client.messages },
  { label: "Profile", href: routes.client.profile },
];

export const accountantNavigation = [
  { label: "Dashboard", href: routes.accountant.dashboard },
  { label: "Assigned Work", href: routes.accountant.assignedWork },
  { label: "Messages", href: routes.accountant.messages },
  { label: "My Profile", href: routes.accountant.profile },
];

export const roleDashboardRoutes = {
  admin: routes.admin.dashboard,
  client: routes.client.dashboard,
  accountant: routes.accountant.dashboard,
} as const;

export const authRoutes = [routes.login, routes.register];

export const protectedRoutePrefixes = ["/admin", "/client", "/accountant"];