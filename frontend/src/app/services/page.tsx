"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calculator,
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
};

type ServiceListResponse = {
  items: PublicService[];
};

const fallbackServices: PublicService[] = [
  {
    id: "fallback-service-1",
    name: "Accounting & Bookkeeping",
    slug: "accounting-bookkeeping",
    short_description:
      "Keep your financial records clean, accurate, and ready for decision-making.",
    category: "Accounting",
    icon_name: "calculator",
    is_featured: true,
  },
  {
    id: "fallback-service-2",
    name: "Tax Declaration & Advisory",
    slug: "tax-declaration-advisory",
    short_description:
      "Prepare, review, and submit tax declarations while staying compliant.",
    category: "Tax",
    icon_name: "receipt",
    is_featured: true,
  },
  {
    id: "fallback-service-3",
    name: "Payroll Management",
    slug: "payroll-management",
    short_description:
      "Manage staff payroll, deductions, declarations, and monthly reports.",
    category: "Payroll",
    icon_name: "briefcase",
    is_featured: true,
  },
  {
    id: "fallback-service-4",
    name: "Financial Statements",
    slug: "financial-statements",
    short_description:
      "Prepare professional financial statements for management, banks, and audits.",
    category: "Reporting",
    icon_name: "chart",
    is_featured: true,
  },
  {
    id: "fallback-service-5",
    name: "Internal Audit",
    slug: "internal-audit",
    short_description:
      "Review controls, documents, risks, and compliance before external audits.",
    category: "Audit",
    icon_name: "check",
    is_featured: true,
  },
  {
    id: "fallback-service-6",
    name: "Business Advisory",
    slug: "business-advisory",
    short_description:
      "Get practical support for planning, growth, compliance, and business decisions.",
    category: "Advisory",
    icon_name: "landmark",
    is_featured: true,
  },
  {
    id: "fallback-service-7",
    name: "Business Plan Preparation",
    slug: "business-plan",
    short_description:
      "Prepare clear business plans for financing, investment, expansion, and management.",
    category: "Advisory",
    icon_name: "briefcase",
    is_featured: false,
  },
  {
    id: "fallback-service-8",
    name: "RRA Advisory & Compliance",
    slug: "rra-advisory",
    short_description:
      "Receive support with RRA obligations, tax files, declarations, and compliance follow-up.",
    category: "Tax",
    icon_name: "receipt",
    is_featured: false,
  },
  {
    id: "fallback-service-9",
    name: "RDB Services & Registration",
    slug: "rdb-services",
    short_description:
      "Get support with company registration, updates, documentation, and business formalities.",
    category: "Registration",
    icon_name: "landmark",
    is_featured: false,
  },
];

function getServiceItems(data: ServiceListResponse | PublicService[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function getServiceTitle(service: PublicService) {
  return service.name || service.title || "Professional Service";
}

function getServiceDescription(service: PublicService) {
  return (
    service.short_description ||
    service.description ||
    "Professional accounting, tax, audit, compliance, and business advisory support."
  );
}

function ServiceIcon({ iconName }: { iconName?: string }) {
  const name = iconName?.toLowerCase() || "";

  if (name.includes("receipt") || name.includes("tax")) {
    return <ReceiptText size={28} />;
  }

  if (name.includes("briefcase") || name.includes("payroll")) {
    return <BriefcaseBusiness size={28} />;
  }

  if (name.includes("chart") || name.includes("statement")) {
    return <BarChart3 size={28} />;
  }

  if (name.includes("check") || name.includes("audit")) {
    return <FileCheck2 size={28} />;
  }

  if (name.includes("landmark") || name.includes("business")) {
    return <Landmark size={28} />;
  }

  return <Calculator size={28} />;
}

export default function ServicesPage() {
  const [services, setServices] = useState<PublicService[]>(fallbackServices);

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      try {
        const result = await api.get<ServiceListResponse | PublicService[]>(
          "/services?page_size=100",
        );

        const items = getServiceItems(result.data).filter(Boolean);

        if (!cancelled && items.length > 0) {
          setServices(items);
        }
      } catch {
        if (!cancelled) {
          setServices(fallbackServices);
        }
      }
    };

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            Services
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Accounting, Tax, Audit and Business Advisory Services
          </h1>

          <p className="mt-6 max-w-2xl leading-relaxed text-white/75">
            Choose the service you need and submit a request. Our team will
            review your case and contact you with the next steps.
          </p>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id || service.slug}
                href={`/services/${service.slug}`}
                className="group rounded-xl border border-gray-100 bg-softwhite p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 text-teal transition-colors group-hover:bg-teal group-hover:text-white">
                  <ServiceIcon iconName={service.icon_name || service.category} />
                </div>

                {service.category ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">
                    {service.category}
                  </p>
                ) : null}

                <h2 className="mb-3 text-xl font-bold text-navy">
                  {getServiceTitle(service)}
                </h2>

                <p className="mb-5 text-sm leading-relaxed text-gray-600">
                  {getServiceDescription(service)}
                </p>

                {service.price_label ? (
                  <p className="mb-5 rounded-lg bg-navy-50 px-3 py-2 text-sm font-semibold text-navy">
                    {service.price_label}
                  </p>
                ) : null}

                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all group-hover:gap-2">
                  View Details
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}