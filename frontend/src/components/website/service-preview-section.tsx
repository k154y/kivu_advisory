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

const services = [
  {
    slug: "accounting-bookkeeping",
    icon: BookOpen,
    title: "Accounting & Bookkeeping",
    desc: "Accurate records, organized financials, and clear reporting for better business decisions.",
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
    desc: "Balance sheets, income statements, and cash flow reports prepared to professional standards.",
  },
  {
    slug: "internal-audit",
    icon: Shield,
    title: "Internal Audit",
    desc: "Risk identification, internal controls review, and compliance support for stronger governance.",
  },
  {
    slug: "business-advisory",
    icon: TrendingUp,
    title: "Business Advisory",
    desc: "Practical advisory to help companies improve performance, reduce costs, and grow sustainably.",
  },
];

export function ServicePreviewSection() {
  return (
    <section className="bg-lightgray py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
            What We Offer
          </p>

          <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
            Our Services
          </h2>

          <p className="mx-auto max-w-2xl text-gray-600">
            From bookkeeping to tax advisory, payroll, audit, and business
            planning — we provide the full range of accounting and advisory
            services your business needs.
          </p>
        </div>

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

                <h3 className="mb-2 text-base font-bold text-navy">
                  {service.title}
                </h3>

                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                  {service.desc}
                </p>

                <Link
                  href={`/request-service?service=${service.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all hover:gap-2"
                >
                  Request Service
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-navy px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            View All Services
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}