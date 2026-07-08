import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  ChevronRight,
  FileText,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";

const services = [
  {
    slug: "accounting-bookkeeping",
    icon: BookOpen,
    title: "Accounting & Bookkeeping",
    desc: "Accurate records, organized financials, reconciliations, and clear reporting for better business decisions.",
  },
  {
    slug: "tax-declaration-advisory",
    icon: FileText,
    title: "Tax Declaration & Advisory",
    desc: "RRA compliance, tax declarations, VAT, PAYE, and practical tax advisory to avoid penalties.",
  },
  {
    slug: "payroll-management",
    icon: Users,
    title: "Payroll Management",
    desc: "Salaries, RSSB, PAYE, payslips, and payroll records managed accurately and confidentially.",
  },
  {
    slug: "financial-statements",
    icon: BarChart2,
    title: "Financial Statements",
    desc: "Balance sheets, income statements, cash flow reports, and management reports prepared professionally.",
  },
  {
    slug: "internal-audit",
    icon: Shield,
    title: "Internal Audit",
    desc: "Risk identification, internal controls review, compliance checks, and governance support.",
  },
  {
    slug: "business-advisory",
    icon: TrendingUp,
    title: "Business Advisory",
    desc: "Practical advisory to help companies improve performance, reduce costs, and grow sustainably.",
  },
];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            Our Services
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Accounting, tax, payroll, audit, and advisory services.
          </h1>

          <p className="mt-6 max-w-3xl leading-relaxed text-white/75">
            Choose the service you need and submit a request. Our team can
            review your request, ask for documents, assign work, and follow
            progress through the platform.
          </p>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.slug}
                  className="group rounded-xl border border-gray-100 bg-softwhite p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 transition-colors group-hover:bg-teal">
                    <Icon
                      size={20}
                      className="text-teal transition-colors group-hover:text-white"
                    />
                  </div>

                  <h2 className="mb-2 text-base font-bold text-navy">
                    {service.title}
                  </h2>

                  <p className="mb-5 text-sm leading-relaxed text-gray-600">
                    {service.desc}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/services/${service.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all hover:gap-2"
                    >
                      View Details
                      <ChevronRight size={14} />
                    </Link>

                    <Link
                      href={`/request-service?service=${service.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-navy transition-all hover:text-teal"
                    >
                      Request Service
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Link
              href="/request-service"
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              Request a Service
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}