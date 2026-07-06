export const siteConfig = {
  name: "Kivu Advisory",
  shortName: "Kivu",
  description:
    "Accounting, tax, audit support and business advisory services for growing organizations.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  contact: {
    phone: "+250 788 000 000",
    whatsapp: "+250 788 000 000",
    email: "info@kivuadvisory.com",
    location: "Rubavu, Rwanda",
    workingHours: "Monday - Friday, 8:00 AM - 5:00 PM",
  },

  colors: {
    primary: "#0F2742",
    secondary: "#1E3A5F",
    accent: "#C99A35",
  },

  publicNav: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Services",
      href: "/services",
    },
    {
      label: "About",
      href: "/about",
    },
    {
      label: "Blog",
      href: "/blog",
    },
    {
      label: "Contact",
      href: "/contact",
    },
  ],

  publicActions: {
    consultation: {
      label: "Book Consultation",
      href: "/book-consultation",
    },
    login: {
      label: "Client Login",
      href: "/login",
    },
    requestService: {
      label: "Request a Service",
      href: "/request-service",
    },
  },

  homepage: {
    heroTitle:
      "Accounting, Tax and Business Advisory Services for Growing Organizations",
    heroSubtitle:
      "Kivu Advisory helps businesses, institutions and entrepreneurs manage accounting, tax compliance, audit preparation, payroll, business planning and financial reporting with confidence.",
    primaryCta: {
      label: "Request a Service",
      href: "/request-service",
    },
    secondaryCta: {
      label: "Book a Consultation",
      href: "/book-consultation",
    },
  },

  stats: [
    {
      label: "Core service areas",
      value: "8+",
      description: "Accounting, tax, payroll, audit support and advisory",
    },
    {
      label: "Client portal",
      value: "24/7",
      description: "Secure access to requests, documents and messages",
    },
    {
      label: "Process visibility",
      value: "100%",
      description: "Track request status from submission to completion",
    },
    {
      label: "Document handling",
      value: "Secure",
      description: "Protected upload and download through the portal",
    },
  ],

  trustIndicators: [
    "Accounting",
    "Tax advisory",
    "Audit support",
    "Business planning",
    "Payroll",
    "Compliance",
  ],

  servicePreview: [
    {
      title: "Accounting and Bookkeeping",
      description:
        "Organized accounting records, transaction posting, reconciliations and management reporting.",
    },
    {
      title: "Tax Declaration and Advisory",
      description:
        "Support with tax declarations, compliance review, RRA advisory and tax planning.",
    },
    {
      title: "Payroll Management",
      description:
        "Payroll preparation, statutory deductions, staff payment schedules and payroll reporting.",
    },
    {
      title: "Financial Statements",
      description:
        "Preparation and review of financial statements for businesses, institutions and projects.",
    },
    {
      title: "Business Plans",
      description:
        "Professional business plans, financial projections and investment-ready documentation.",
    },
    {
      title: "Audit Support",
      description:
        "Internal audit preparation, documentation review and support during external audits.",
    },
  ],

  processSteps: [
    {
      title: "Submit request",
      description:
        "Send your service request online with your contact and business details.",
    },
    {
      title: "Upload documents",
      description:
        "After login, upload the required documents securely through the client portal.",
    },
    {
      title: "Expert review",
      description:
        "The advisory team reviews your request and assigns the right accountant or advisor.",
    },
    {
      title: "Receive deliverables",
      description:
        "Track progress, exchange messages and download completed work from your portal.",
    },
  ],

  values: [
    {
      title: "Confidentiality",
      description:
        "Client documents and business information must be handled with care and protected access.",
    },
    {
      title: "Accuracy",
      description:
        "Financial, tax and compliance work requires clear review, organized records and reliable outputs.",
    },
    {
      title: "Practical advice",
      description:
        "Recommendations should help clients make better decisions, not only complete paperwork.",
    },
    {
      title: "Local understanding",
      description:
        "The platform is designed for accounting, tax and advisory work in Rwanda and the region.",
    },
  ],

  staffPreview: [
    {
      name: "Advisory Team",
      role: "Accounting, Tax and Business Advisory",
      description:
        "A professional team supporting clients with accounting, compliance, reporting and advisory work.",
    },
  ],

  socialLinks: [
    {
      label: "LinkedIn",
      href: "#",
    },
    {
      label: "Facebook",
      href: "#",
    },
    {
      label: "X",
      href: "#",
    },
  ],
} as const;