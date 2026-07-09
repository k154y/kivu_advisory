import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Users,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";

type ServiceDetail = {
  title: string;
  desc: string;
  icon: string;
  whatIncluded: string[];
  whoNeeds: string[];
  requiredDocs: string[];
  deliveryTime: string;
  benefits: string[];
};

const SERVICES: Record<string, ServiceDetail> = {
  "accounting-bookkeeping": {
    title: "Accounting and Bookkeeping",
    desc:
      "We help businesses record, organize, and maintain accurate financial transactions. Our bookkeeping service ensures your accounts are always up to date, your records are organized, and your financial reports are ready when you need them.",
    icon: "📒",
    whatIncluded: [
      "Daily transaction recording",
      "Bank and cash reconciliation",
      "Accounts payable and receivable",
      "Monthly financial summaries",
      "Chart of accounts setup",
      "General ledger maintenance",
    ],
    whoNeeds: [
      "Small and medium enterprises",
      "NGOs and projects",
      "Schools and institutions",
      "Startups needing a proper system",
      "Companies without in-house accountant",
    ],
    requiredDocs: [
      "Business registration certificate",
      "Bank statements",
      "Sales invoices and receipts",
      "Purchase invoices",
      "Previous accounting records if any",
    ],
    deliveryTime: "Monthly ongoing service or one-time cleanup (2–5 business days)",
    benefits: [
      "Accurate financial records always available",
      "Easier tax declaration and compliance",
      "Better decision-making with real numbers",
      "Avoid RRA penalties for poor records",
      "Audit-ready financial documentation",
    ],
  },

  "tax-declaration-advisory": {
    title: "Tax Declaration and Advisory",
    desc:
      "We support clients with all aspects of tax compliance in Rwanda. From VAT to PAYE to corporate income tax, we prepare, review, and submit your declarations accurately and on time.",
    icon: "📋",
    whatIncluded: [
      "VAT declaration preparation and submission",
      "PAYE declaration and filing",
      "Corporate income tax declaration",
      "Turnover tax for eligible businesses",
      "Withholding tax computation",
      "RRA advisory and correspondence",
    ],
    whoNeeds: [
      "Registered VAT taxpayers",
      "Businesses with employees",
      "Companies filing annual income tax",
      "Individuals with business income",
      "NGOs with taxable activities",
    ],
    requiredDocs: [
      "RRA TIN certificate",
      "Monthly sales and purchase records",
      "Payroll data for PAYE",
      "Bank statements",
      "Invoices and receipts",
    ],
    deliveryTime: "Monthly declarations submitted before RRA deadlines",
    benefits: [
      "Zero late filing penalties",
      "Accurate tax computation",
      "Full RRA compliance",
      "Tax planning and cost optimization",
      "Professional handling of RRA communications",
    ],
  },

  "payroll-management": {
    title: "Payroll Management",
    desc:
      "We manage your entire payroll process including salary computation, PAYE deductions, RSSB contributions, and payslip generation. Your employees are paid correctly and your obligations are met on time.",
    icon: "💼",
    whatIncluded: [
      "Monthly salary computation",
      "PAYE calculation and filing",
      "RSSB employee and employer contributions",
      "Professional payslip generation",
      "Payroll register maintenance",
      "Staff payroll records",
    ],
    whoNeeds: [
      "Businesses with full-time or part-time employees",
      "NGOs with local staff",
      "Schools and institutions with teaching staff",
      "Companies growing their team",
    ],
    requiredDocs: [
      "Staff list with salary details",
      "Employment contracts",
      "RRA TIN for employees",
      "RSSB numbers",
      "Previous payroll data if available",
    ],
    deliveryTime: "Monthly payroll delivered 2–3 days before payment date",
    benefits: [
      "Accurate salary and deductions",
      "On-time RSSB and PAYE filings",
      "No payroll calculation errors",
      "Confidential staff salary records",
      "Professional payslips for every employee",
    ],
  },

  "financial-statements": {
    title: "Financial Statements",
    desc:
      "We prepare professional financial statements that help businesses understand their financial position, meet reporting obligations, and make better management decisions.",
    icon: "📊",
    whatIncluded: [
      "Income statement preparation",
      "Balance sheet preparation",
      "Cash flow statement preparation",
      "Notes to financial statements",
      "Management reports",
      "Year-end financial file review",
    ],
    whoNeeds: [
      "Companies preparing annual reports",
      "Businesses applying for loans",
      "Organizations preparing for audit",
      "Owners who need clear financial performance",
      "Institutions with reporting obligations",
    ],
    requiredDocs: [
      "Accounting records",
      "Bank statements",
      "Sales and purchase records",
      "Payroll records",
      "Asset and liability details",
      "Previous financial statements if available",
    ],
    deliveryTime: "Usually 3–7 business days depending on document readiness",
    benefits: [
      "Clear view of business performance",
      "Professional reports for banks or partners",
      "Better management decisions",
      "Audit-ready reporting",
      "Improved financial transparency",
    ],
  },

  "internal-audit": {
    title: "Internal Audit",
    desc:
      "We help organizations review internal controls, identify risks, improve documentation, and strengthen financial governance before problems become serious.",
    icon: "🛡️",
    whatIncluded: [
      "Internal control review",
      "Cash and bank control review",
      "Procurement and payment process review",
      "Risk identification",
      "Compliance review",
      "Audit recommendations report",
    ],
    whoNeeds: [
      "NGOs and projects",
      "Schools and institutions",
      "Businesses with growing operations",
      "Organizations preparing for external audit",
      "Companies concerned about fraud or weak controls",
    ],
    requiredDocs: [
      "Accounting records",
      "Policies and procedures",
      "Bank statements",
      "Payment vouchers",
      "Procurement files",
      "Previous audit reports if available",
    ],
    deliveryTime: "Usually 5–15 business days depending on scope",
    benefits: [
      "Stronger internal controls",
      "Reduced fraud and error risk",
      "Better compliance and documentation",
      "Improved accountability",
      "Clear recommendations for management",
    ],
  },

  "business-advisory": {
    title: "Business Advisory",
    desc:
      "We provide practical advisory support to help businesses improve performance, control costs, prepare plans, and make informed financial decisions.",
    icon: "📈",
    whatIncluded: [
      "Business planning support",
      "Budget preparation",
      "Cash flow analysis",
      "Cost control advisory",
      "Financial performance review",
      "Growth and investment guidance",
    ],
    whoNeeds: [
      "Startups and entrepreneurs",
      "Growing small and medium businesses",
      "Companies preparing business plans",
      "Businesses seeking financing",
      "Owners needing financial decision support",
    ],
    requiredDocs: [
      "Business registration documents",
      "Sales and expense records",
      "Bank statements",
      "Existing business plan if any",
      "Loan or investment information if applicable",
      "Management information available",
    ],
    deliveryTime: "Depends on assignment scope, usually 3–10 business days",
    benefits: [
      "Better business decisions",
      "Clearer financial planning",
      "Improved cost control",
      "Stronger loan or investor preparation",
      "Practical growth recommendations",
    ],
  },
};

type ServiceDetailPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function ServiceDetailPage({
  params,
}: ServiceDetailPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const service = SERVICES[slug];

  if (!service) {
    notFound();
  }

  return (
    <PublicLayout>
      <>
        {/* Hero */}
        <section className="bg-navy py-16 text-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal">
              <Link
                href="/services"
                className="transition-colors hover:text-white"
              >
                Services
              </Link>
              {" / "}
              {service.title}
            </p>

            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                {service.icon}
              </div>

              <h1 className="text-4xl font-bold sm:text-5xl">
                {service.title}
              </h1>
            </div>

            <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
              {service.desc}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={`/request-service?service=${slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
              >
                Request This Service <ArrowRight size={16} />
              </Link>

              <Link
                href="/book-consultation"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/5"
              >
                Book Consultation
              </Link>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Main content */}
              <div className="space-y-10 lg:col-span-2">
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-navy">
                    <CheckCircle size={20} className="text-teal" />
                    What Is Included
                  </h2>

                  <ul className="space-y-2">
                    {service.whatIncluded.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-navy">
                    <Users size={20} className="text-teal" />
                    Who Needs This Service
                  </h2>

                  <ul className="space-y-2">
                    {service.whoNeeds.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-navy">
                    <CheckCircle size={20} className="text-teal" />
                    Key Benefits
                  </h2>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {service.benefits.map((benefit) => (
                      <div
                        key={benefit}
                        className="flex items-start gap-2 rounded-lg bg-teal-50 p-3"
                      >
                        <CheckCircle
                          size={15}
                          className="mt-0.5 shrink-0 text-teal"
                        />
                        <span className="text-sm text-charcoal">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-100 bg-lightgray p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-navy">
                    <FileText size={16} className="text-teal" />
                    Required Documents
                  </h3>

                  <ul className="space-y-2">
                    {service.requiredDocs.map((document) => (
                      <li
                        key={document}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                        {document}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-gray-100 bg-lightgray p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-navy">
                    <Clock size={16} className="text-teal" />
                    Delivery Time
                  </h3>

                  <p className="text-sm text-gray-700">
                    {service.deliveryTime}
                  </p>
                </div>

                <div className="rounded-xl bg-navy p-6 text-white">
                  <h3 className="mb-3 font-bold">Ready to Get Started?</h3>

                  <p className="mb-4 text-sm text-gray-400">
                    Submit your service request and we will contact you within
                    24 hours.
                  </p>

                  <Link
                    href={`/request-service?service=${slug}`}
                    className="block w-full rounded-lg bg-gold py-3 text-center text-sm font-bold text-navy transition-colors hover:bg-gold-600"
                  >
                    Request This Service
                  </Link>

                  <Link
                    href="/book-consultation"
                    className="mt-2 block w-full rounded-lg border border-white/20 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-white/5"
                  >
                    Book Consultation First
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    </PublicLayout>
  );
}