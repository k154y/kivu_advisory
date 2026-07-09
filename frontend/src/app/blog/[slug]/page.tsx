import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";

const posts = [
  {
    slug: "preparing-records-before-tax-declaration",
    title: "Preparing Your Records Before Tax Declaration",
    category: "Tax",
    date: "Advisory Insight",
    excerpt:
      "Good preparation helps reduce errors, missing documents, and last-minute pressure during tax filing periods.",
    body: [
      "Tax declaration becomes easier when accounting records are organized before the filing period starts. Businesses should keep sales records, purchase invoices, payroll information, bank statements, tax receipts, and supporting documents in one clear system.",
      "A common problem is waiting until the deadline before checking whether documents are complete. This can create pressure, mistakes, and unnecessary penalties. Regular bookkeeping and monthly review reduce this risk.",
      "Kivu Advisory helps clients review records, identify missing documents, prepare declarations, and understand their tax obligations before deadlines become urgent.",
    ],
  },
  {
    slug: "why-businesses-need-organized-accounting-documents",
    title: "Why Businesses Need Organized Accounting Documents",
    category: "Accounting",
    date: "Client Guidance",
    excerpt:
      "Well-organized documents make reporting, review, audit preparation, and decision-making easier.",
    body: [
      "Accounting documents are the foundation of reliable financial reporting. Without organized documents, it becomes difficult to prepare accurate reports, justify tax declarations, review transactions, or respond to audit questions.",
      "Businesses should organize documents by month, document type, supplier, customer, and payment method. This helps accountants review transactions faster and reduces the risk of missing information.",
      "A structured document workflow also helps management understand income, expenses, cash flow, debts, and financial performance.",
    ],
  },
  {
    slug: "how-a-client-portal-improves-advisory-service",
    title: "How a Client Portal Improves Advisory Service Delivery",
    category: "Platform",
    date: "Service Update",
    excerpt:
      "A secure portal helps clients submit requests, upload files, exchange messages, and track progress.",
    body: [
      "A client portal improves communication between the client and advisory team. Instead of using scattered emails and messages, requests, documents, and service updates can be organized in one place.",
      "Clients can submit service requests, upload documents, receive questions from the team, and track progress. This helps reduce confusion and improves accountability.",
      "For professional services such as accounting, tax, payroll, audit, and advisory, clear documentation and secure communication are important.",
    ],
  },
  {
    slug: "payroll-compliance-for-growing-businesses",
    title: "Payroll Compliance for Growing Businesses",
    category: "Payroll",
    date: "Compliance Note",
    excerpt:
      "Payroll records, PAYE, RSSB, and staff documentation should be handled carefully as a business grows.",
    body: [
      "As a business grows, payroll becomes more sensitive. Salary calculations, PAYE, RSSB, staff advances, allowances, deductions, and payslips must be handled accurately.",
      "A clear payroll process helps avoid staff disputes, reporting errors, and compliance problems. Payroll records should be reviewed monthly and kept securely.",
      "Kivu Advisory supports businesses with payroll organization, reporting, and compliance follow-up.",
    ],
  },
  {
    slug: "internal-controls-small-businesses",
    title: "Simple Internal Controls for Small Businesses",
    category: "Audit",
    date: "Business Control",
    excerpt:
      "Strong internal controls help reduce errors, fraud risks, cash leakage, and poor financial reporting.",
    body: [
      "Internal controls are not only for large companies. Small businesses also need clear controls over cash, purchases, sales, stock, approvals, and reporting.",
      "Simple controls include separating duties, documenting approvals, reconciling cash and bank accounts, reviewing expenses, and keeping proper supporting documents.",
      "Better controls help business owners reduce risks and understand operations more clearly.",
    ],
  },
  {
    slug: "business-planning-financial-decisions",
    title: "Business Planning and Financial Decisions",
    category: "Advisory",
    date: "Planning Guide",
    excerpt:
      "Good decisions are easier when owners understand costs, cash flow, margins, and financial risks.",
    body: [
      "Business planning is stronger when decisions are based on financial information. Owners should understand sales trends, direct costs, fixed costs, margins, cash flow, and debt obligations.",
      "Financial reports are not only for tax purposes. They help management decide when to invest, reduce costs, hire staff, expand, or restructure operations.",
      "Kivu Advisory helps clients use financial information practically for better planning and decision-making.",
    ],
  },
];

type BlogDetailPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const resolvedParams = await params;
  const post = posts.find((item) => item.slug === resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to blog
          </Link>

          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            {post.category}
          </p>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
            <Calendar size={15} />
            {post.date}
          </div>

          <p className="mt-6 leading-relaxed text-white/75">{post.excerpt}</p>
        </div>
      </section>

      <section className="bg-softwhite py-20">
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-100 bg-lightgray p-6 sm:p-8">
            <div className="space-y-6">
              {post.body.map((paragraph) => (
                <p key={paragraph} className="leading-8 text-gray-700">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-10 rounded-xl bg-navy p-6 text-white">
              <h2 className="mb-3 text-xl font-bold">
                Need professional support?
              </h2>

              <p className="mb-5 text-sm leading-relaxed text-white/75">
                Submit a service request or book a consultation to discuss your
                accounting, tax, payroll, audit, or advisory needs.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/request-service"
                  className="inline-flex items-center justify-center rounded-lg bg-gold px-5 py-3 text-sm font-bold text-navy transition-colors hover:bg-gold-600"
                >
                  Request a Service
                </Link>

                <Link
                  href="/book-consultation"
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
                >
                  Book Consultation
                </Link>
              </div>
            </div>
          </div>
        </article>
      </section>
    </PublicLayout>
  );
}