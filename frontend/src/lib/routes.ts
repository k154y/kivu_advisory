export const routes = {
  home: "/",
  about: "/about",
  services: "/services",
  serviceDetail: (slug: string) => `/services/${slug}`,
  blog: "/blog",
  blogDetail: (slug: string) => `/blog/${slug}`,
  contact: "/contact",
  login: "/login",
  register: "/register",
  requestService: "/request-service",
  bookConsultation: "/book-consultation",

  admin: {
    dashboard: "/admin/dashboard",
    accountants: "/admin/accountants",
    accountantCreate: "/admin/accountants/create",
    accountantDetail: (id: string) => `/admin/accountants/${id}`,
    clients: "/admin/clients",
    clientDetail: (id: string) => `/admin/clients/${id}`,
    services: "/admin/services",
    serviceCreate: "/admin/services/create",
    serviceDetail: (id: string) => `/admin/services/${id}`,
    requests: "/admin/requests",
    requestDetail: (id: string) => `/admin/requests/${id}`,
    consultations: "/admin/consultations",
    blog: "/admin/blog",
    blogCreate: "/admin/blog/create",
    blogDetail: (id: string) => `/admin/blog/${id}`,
    testimonials: "/admin/testimonials",
    settings: "/admin/settings",
    content: {
      homepage: "/admin/content/homepage",
      about: "/admin/content/about",
      contact: "/admin/content/contact",
      footer: "/admin/content/footer",
      socialMedia: "/admin/content/social-media",
    },
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
  },
} as const;

export const publicNavigation = [
  { label: "Home", href: routes.home },
  { label: "About", href: routes.about },
  { label: "Services", href: routes.services },
  { label: "Blog", href: routes.blog },
  { label: "Contact", href: routes.contact },
];

export const adminNavigation = [
  { label: "Dashboard", href: routes.admin.dashboard },
  { label: "Accountants", href: routes.admin.accountants },
  { label: "Clients", href: routes.admin.clients },
  { label: "Service Requests", href: routes.admin.requests },
  { label: "Services", href: routes.admin.services },
  { label: "Consultations", href: routes.admin.consultations },
  { label: "Blog", href: routes.admin.blog },
  { label: "Testimonials", href: routes.admin.testimonials },
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
];

export const roleDashboardRoutes = {
  admin: routes.admin.dashboard,
  client: routes.client.dashboard,
  accountant: routes.accountant.dashboard,
} as const;

export const authRoutes = [routes.login, routes.register];

export const protectedRoutePrefixes = ["/admin", "/client", "/accountant"];