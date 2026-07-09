"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  Clock,
  FileCheck2,
  Landmark,
  ReceiptText,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";
import { api } from "@/lib/api";

type PublicService = {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  short_description?: string;
  description?: string;
  category?: string;
  price_label?: string;
  icon_name?: string;
  display_order?: number;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
  included_items?: string[];
  required_documents?: string[];
  target_clients?: string[];
  benefits?: string[];
  delivery_time?: string;
};

type ServiceDetail = PublicService & {
  what_is_included?: string[];
  who_needs_this?: string[];
  key_benefits?: string[];
};

const fallbackServices: ServiceDetail[] = [
  {
    id: "fallback-service-1",
    name: "Accounting & Bookkeeping",
    slug: "accounting-bookkeeping",
    short_description:
      "Keep your financial records clean, accurate, and ready for decision-making.",
    description:
      "We help businesses organize their accounting records, classify transactions, prepare reconciliations, and maintain books that are ready for tax, reporting, and audit needs.",
    category: "Accounting",
    icon_name: "calculator",
    delivery_time: "Monthly or according to business needs",
    price_label: "Quotation after review",
    what_is_included: [
      "Recording income and expenses",
      "Bank and cash reconciliation",
      "Supplier and customer account review",
      "Monthly bookkeeping reports",
      "Document organization and filing support",
    ],
    who_needs_this: [
      "Small and medium businesses",
      "Hotels, shops, schools, NGOs, and service companies",
      "Businesses with disorganized accounting records",
      "Business owners who need reliable financial information",
    ],
    key_benefits: [
      "Cleaner financial records",
      "Better tax preparation",
      "Improved cash-flow visibility",
      "Reduced accounting errors",
    ],
    required_documents: [
      "Sales invoices",
      "Purchase invoices",
      "Bank statements",
      "Cash records",
      "Payroll records where applicable",
    ],
  },
  {
    id: "fallback-service-2",
    name: "Tax Declaration & Advisory",
    slug: "tax-declaration-advisory",
    short_description:
      "Prepare, review, and submit tax declarations while staying compliant.",
    description:
      "We support businesses with tax preparation, declaration review, tax file organization, RRA follow-up, and advisory on compliance obligations.",
    category: "Tax",
    icon_name: "receipt",
    delivery_time: "According to tax deadline",
    price_label: "Quotation after review",
    what_is_included: [
      "Tax file review",
      "VAT and income tax support",
      "Withholding tax support",
      "Declaration preparation guidance",
      "Tax compliance advisory",
    ],
    who_needs_this: [
      "Registered businesses",
      "Companies with monthly tax obligations",
      "Businesses facing tax penalties or unclear tax records",
      "Business owners preparing for tax review",
    ],
    key_benefits: [
      "Reduced tax penalties",
      "Better compliance",
      "Organized tax records",
      "Clear understanding of tax obligations",
    ],
    required_documents: [
      "Tax identification information",
      "EBM reports",
      "Purchase and sales invoices",
      "Previous declarations",
      "Bank statements",
    ],
  },
  {
    id: "fallback-service-3",
    name: "Payroll Management",
    slug: "payroll-management",
    short_description:
      "Manage staff payroll, deductions, declarations, and monthly reports.",
    description:
      "We help businesses calculate salaries, deductions, payroll reports, and related compliance documents.",
    category: "Payroll",
    icon_name: "briefcase",
    delivery_time: "Monthly",
    price_label: "Quotation after review",
    what_is_included: [
      "Payroll calculation",
      "Employee salary schedules",
      "Statutory deduction support",
      "Payroll report preparation",
      "Payslip support",
    ],
    who_needs_this: [
      "Businesses with employees",
      "Hotels and service companies",
      "Organizations needing monthly payroll control",
      "Employers who need payroll compliance support",
    ],
    key_benefits: [
      "Accurate salary calculation",
      "Better employee payment records",
      "Reduced payroll errors",
      "Improved compliance",
    ],
    required_documents: [
      "Employee list",
      "Employment contracts",
      "Salary details",
      "Attendance or time records",
      "Previous payroll reports",
    ],
  },
  {
    id: "fallback-service-4",
    name: "Financial Statements",
    slug: "financial-statements",
    short_description:
      "Prepare professional financial statements for management, banks, and audits.",
    description:
      "We prepare structured financial statements that help business owners, banks, auditors, investors, and management understand business performance.",
    category: "Reporting",
    icon_name: "chart",
    delivery_time: "After document review",
    price_label: "Quotation after review",
    what_is_included: [
      "Statement of profit or loss",
      "Statement of financial position",
      "Cash-flow information",
      "Notes and supporting schedules",
      "Management review support",
    ],
    who_needs_this: [
      "Businesses applying for finance",
      "Companies preparing for audit",
      "Business owners needing annual reports",
      "Organizations with reporting requirements",
    ],
    key_benefits: [
      "Professional reporting",
      "Improved credibility",
      "Better decision-making",
      "Clear business performance picture",
    ],
    required_documents: [
      "Accounting records",
      "Bank statements",
      "Sales and purchase records",
      "Payroll records",
      "Asset and liability information",
    ],
  },
  {
    id: "fallback-service-5",
    name: "Internal Audit",
    slug: "internal-audit",
    short_description:
      "Review controls, documents, risks, and compliance before external audits.",
    description:
      "We review internal controls, supporting documents, risks, accounting records, and compliance gaps to help businesses improve before external audits or management reviews.",
    category: "Audit",
    icon_name: "check",
    delivery_time: "Depending on scope",
    price_label: "Quotation after scope review",
    what_is_included: [
      "Document review",
      "Internal control assessment",
      "Risk and compliance review",
      "Audit preparation checklist",
      "Management recommendations",
    ],
    who_needs_this: [
      "Organizations preparing for audit",
      "Businesses with control weaknesses",
      "NGOs, schools, hotels, and companies",
      "Management teams needing independent review",
    ],
    key_benefits: [
      "Stronger internal controls",
      "Better audit readiness",
      "Reduced fraud and error risk",
      "Improved documentation",
    ],
    required_documents: [
      "Accounting records",
      "Policies and procedures",
      "Bank statements",
      "Invoices and receipts",
      "Contracts and payroll files",
    ],
  },
  {
    id: "fallback-service-6",
    name: "Business Advisory",
    slug: "business-advisory",
    short_description:
      "Get practical support for planning, growth, compliance, and business decisions.",
    description:
      "We advise business owners on financial organization, compliance, planning, growth, budgeting, documentation, and performance improvement.",
    category: "Advisory",
    icon_name: "landmark",
    delivery_time: "According to advisory need",
    price_label: "Quotation after consultation",
    what_is_included: [
      "Business review",
      "Financial and operational guidance",
      "Budgeting and planning support",
      "Compliance improvement advice",
      "Action plan preparation",
    ],
    who_needs_this: [
      "Business owners planning growth",
      "Startups and SMEs",
      "Companies needing financial structure",
      "Businesses preparing for finance or investment",
    ],
    key_benefits: [
      "Clearer business direction",
      "Better financial planning",
      "Improved compliance",
      "Practical management guidance",
    ],
    required_documents: [
      "Business registration documents",
      "Financial records if available",
      "Business plan or idea description",
      "Current challenges or objectives",
    ],
  },
];

function getServiceTitle(service: ServiceDetail) {
  return service.name || service.title || "Professional Service";
}

function getServiceDescription(service: ServiceDetail) {
  return (
    service.description ||
    service.short_description ||
    "Professional accounting, tax, audit, compliance, and business advisory support."
  );
}

function mergeServiceWithFallback(
  backendService: PublicService,
  fallbackService: ServiceDetail | null,
): ServiceDetail {
  return {
    ...fallbackService,
    ...backendService,
    what_is_included:
      backendService.included_items ||
      fallbackService?.what_is_included ||
      fallbackService?.included_items ||
      [],
    who_needs_this:
      backendService.target_clients ||
      fallbackService?.who_needs_this ||
      fallbackService?.target_clients ||
      [],
    key_benefits:
      backendService.benefits ||
      fallbackService?.key_benefits ||
      fallbackService?.benefits ||
      [],
    required_documents:
      backendService.required_documents ||
      fallbackService?.required_documents ||
      [],
    delivery_time:
      backendService.delivery_time || fallbackService?.delivery_time || "",
  };
}

function ServiceIcon({ iconName }: { iconName?: string }) {
  const name = iconName?.toLowerCase() || "";

  if (name.includes("receipt") || name.includes("tax")) {
    return <ReceiptText size={34} />;
  }

  if (name.includes("briefcase") || name.includes("payroll")) {
    return <BriefcaseBusiness size={34} />;
  }

  if (name.includes("chart") || name.includes("statement")) {
    return <BarChart3 size={34} />;
  }

  if (name.includes("check") || name.includes("audit")) {
    return <FileCheck2 size={34} />;
  }

  if (name.includes("landmark") || name.includes("business")) {
    return <Landmark size={34} />;
  }

  return <Calculator size={34} />;
}

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const fallbackService = useMemo(
    () => fallbackServices.find((service) => service.slug === slug) || null,
    [slug],
  );

  const [service, setService] = useState<ServiceDetail | null>(fallbackService);
  const [isLoading, setIsLoading] = useState(!fallbackService);

  useEffect(() => {
    let cancelled = false;

    const loadService = async () => {
      setIsLoading(true);

      try {
        const result = await api.get<PublicService>(
          `/services/detail?slug=${encodeURIComponent(slug)}`,
        );

        if (!cancelled) {
          setService(mergeServiceWithFallback(result.data, fallbackService));
        }
      } catch {
        if (!cancelled) {
          setService(fallbackService);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (slug) {
      void loadService();
    }

    return () => {
      cancelled = true;
    };
  }, [fallbackService, slug]);

  if (isLoading) {
    return (
      <PublicLayout>
        <section className="flex min-h-[70vh] items-center justify-center bg-lightgray">
          <p className="text-sm font-medium text-gray-600">
            Loading service...
          </p>
        </section>
      </PublicLayout>
    );
  }

  if (!service) {
    return (
      <PublicLayout>
        <section className="flex min-h-[70vh] items-center justify-center bg-lightgray px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-navy">
              Service not found
            </h1>

            <p className="mb-6 text-gray-600">
              The service you are looking for is not available.
            </p>

            <Link
              href="/services"
              className="inline-flex rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-700"
            >
              Back to services
            </Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const title = getServiceTitle(service);
  const description = getServiceDescription(service);
  const includedItems = service.what_is_included || [];
  const whoNeedsThis = service.who_needs_this || [];
  const keyBenefits = service.key_benefits || [];
  const requiredDocuments = service.required_documents || [];

  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/services"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to services
          </Link>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-gold">
                <ServiceIcon iconName={service.icon_name || service.category} />
              </div>

              {service.category ? (
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
                  {service.category}
                </p>
              ) : null}

              <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                {title}
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/75">
                {description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/request-service?service=${service.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
                >
                  Request This Service
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/book-consultation"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
                >
                  Book Consultation
                </Link>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-white/10 p-6">
              <h2 className="mb-5 text-lg font-bold text-white">
                Service Summary
              </h2>

              <div className="space-y-4">
                {service.price_label ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      Price
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {service.price_label}
                    </p>
                  </div>
                ) : null}

                {service.delivery_time ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      Delivery Time
                    </p>
                    <p className="mt-1 inline-flex items-center gap-2 font-semibold text-white">
                      <Clock size={16} />
                      {service.delivery_time}
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Request Method
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    Online request, phone, WhatsApp, or consultation
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="space-y-8">
            <DetailCard title="What Is Included" items={includedItems} />

            <DetailCard title="Who Needs This Service" items={whoNeedsThis} />

            <DetailCard title="Key Benefits" items={keyBenefits} />
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-softwhite p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-navy">
                Required Documents
              </h2>

              {requiredDocuments.length > 0 ? (
                <ul className="space-y-3">
                  {requiredDocuments.map((document) => (
                    <li
                      key={document}
                      className="flex gap-3 text-sm leading-relaxed text-gray-600"
                    >
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0 text-teal"
                      />
                      <span>{document}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-gray-600">
                  Required documents will depend on your case. Our team will
                  guide you after reviewing your request.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-navy p-6 text-white">
              <h2 className="mb-3 text-xl font-bold">
                Ready to request this service?
              </h2>

              <p className="mb-5 text-sm leading-relaxed text-white/70">
                Submit your request and our team will contact you with the next
                steps.
              </p>

              <Link
                href={`/request-service?service=${service.slug}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
              >
                Request Service
                <ArrowRight size={16} />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}

type DetailCardProps = {
  title: string;
  items: string[];
};

function DetailCard({ title, items }: DetailCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-softwhite p-6 shadow-sm">
      <h2 className="mb-5 text-2xl font-bold text-navy">{title}</h2>

      {items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-3 text-sm leading-relaxed text-gray-600"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-gray-600">
          Details for this section will be provided after reviewing your
          request.
        </p>
      )}
    </div>
  );
}