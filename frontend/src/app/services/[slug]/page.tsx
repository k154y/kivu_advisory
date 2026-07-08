import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  BookOpen,
  CheckCircle,
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
    category: "Accounting",
    desc: "Accurate records, organized financials, reconciliations, and clear reporting for better business decisions.",
    includes: [
      "Bookkeeping support",
      "Account reconciliation",
      "Monthly reporting assistance",
      "Financial record organization",
      "Document classification",
      "Management reporting support",
    ],
  },
  {
    slug: "tax-declaration-advisory",
    icon: FileText,
    title: "Tax Declaration & Advisory",
    category: "Tax",
    desc: "RRA compliance, tax declarations, VAT, PAYE, and practical tax advisory to avoid penalties.",
    includes: [
      "Tax declaration preparation",
      "VAT support",
      "PAYE support",
      "RRA compliance guidance",
      "Tax document review",
      "Tax advisory consultation",
    ],
  },
  {
    slug: "payroll-management",
    icon: Users,
    title: "Payroll Management",
    category: "Payroll",
    desc: "Salaries, RSSB, PAYE, payslips, and payroll records managed accurately and confidentially.",
    includes: [
      "Salary calculation",
      "PAYE calculation",
      "RSSB support",
      "Payslip preparation",
      "Payroll record management",
      "Payroll reporting support",
    ],
  },
  {
    slug: "financial-statements",
    icon: BarChart2,
    title: "Financial Statements",
    category: "Reporting",
    desc: "Balance sheets, income statements, cash flow reports, and management reports prepared professionally.",
    includes: [
      "Income statement preparation",
      "Balance sheet preparation",
      "Cash flow reporting",
      "Financial analysis support",
      "Management reporting",
      "Year-end file support",
    ],
  },
  {
    slug: "internal-audit",
    icon: Shield,
    title: "Internal Audit",
    category: "Audit",
    desc: "Risk identification, internal controls review, compliance checks, and governance support.",
    includes: [
      "Internal control review",
      "Audit file preparation",
      "Risk identification",
      "Compliance review",
      "Process improvement advice",
      "Documentation support",
    ],
  },
  {
    slug: "business-advisory",
    icon: TrendingUp,
    title: "Business Advisory",
    category: "Advisory",
    desc: "Practical advisory to help companies improve performance, reduce costs, and grow sustainably.",
    includes: [
      "Business planning",
      "Budgeting support",
      "Financial decision support",
      "Cost control guidance",
      "Performance analysis",
      "Growth advisory",
    ],
  },
];

type ServiceDetailPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const resolvedParams = await params;
  const service = services.find((item) => item.slug === resolvedParams.slug);

  if (!service) {
    notFound();
  }

  const Icon = service.icon;

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

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
                {service.category}
              </p>

              <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
                {service.title}
              </h1>

              <p className="mt-6 max-w-3xl leading-relaxed text-white/75">
                {service.desc}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={`/request-service?service=${service.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3.5 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
                >
                  Request This Service
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/book-consultation"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
                >
                  Book Consultation
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-8">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal">
                <Icon size={30} className="text-white" />
              </div>

              <h2 className="mb-3 text-xl font-bold">Professional Support</h2>

              <p className="text-sm leading-relaxed text-white/70">
                Submit your request and our team will review your needs, request
                supporting documents, and guide you through the service process.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              What This Service Includes
            </p>

            <h2 className="text-3xl font-bold text-navy sm:text-4xl">
              Clear support from request to delivery.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {service.includes.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-xl border border-gray-100 bg-softwhite p-5"
              >
                <CheckCircle size={20} className="mt-0.5 shrink-0 text-teal" />

                <p className="text-sm font-medium leading-relaxed text-gray-700">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}