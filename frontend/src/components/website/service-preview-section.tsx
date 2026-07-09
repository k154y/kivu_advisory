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
    return <ReceiptText size={26} />;
  }

  if (name.includes("briefcase") || name.includes("payroll")) {
    return <BriefcaseBusiness size={26} />;
  }

  if (name.includes("chart") || name.includes("statement")) {
    return <BarChart3 size={26} />;
  }

  if (name.includes("check") || name.includes("audit")) {
    return <FileCheck2 size={26} />;
  }

  if (name.includes("landmark") || name.includes("business")) {
    return <Landmark size={26} />;
  }

  return <Calculator size={26} />;
}

export function ServicePreviewSection() {
  const [services, setServices] = useState<PublicService[]>(fallbackServices);

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      try {
        const result = await api.get<ServiceListResponse | PublicService[]>(
          "/services?page_size=6&is_featured=true",
        );

        const items = getServiceItems(result.data).filter(Boolean);

        if (!cancelled && items.length > 0) {
          setServices(items.slice(0, 6));
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
    <section className="bg-lightgray py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Our Services
            </p>

            <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
              Professional Services for Your Business
            </h2>

            <p className="max-w-2xl text-gray-600">
              We support businesses with accounting, tax, payroll, audit,
              compliance, and advisory services designed to improve control and
              decision-making.
            </p>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-navy px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            View All Services
            <ArrowRight size={16} />
          </Link>
        </div>

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

              <h3 className="mb-3 text-xl font-bold text-navy">
                {getServiceTitle(service)}
              </h3>

              <p className="mb-5 text-sm leading-relaxed text-gray-600">
                {getServiceDescription(service)}
              </p>

              <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all group-hover:gap-2">
                Learn More
                <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}