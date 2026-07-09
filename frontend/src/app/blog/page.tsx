import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";

const posts = [
  {
    slug: "preparing-records-before-tax-declaration",
    title: "Preparing Your Records Before Tax Declaration",
    category: "Tax",
    date: "Advisory Insight",
    excerpt:
      "Good preparation helps reduce errors, missing documents, and last-minute pressure during tax filing periods.",
  },
  {
    slug: "why-businesses-need-organized-accounting-documents",
    title: "Why Businesses Need Organized Accounting Documents",
    category: "Accounting",
    date: "Client Guidance",
    excerpt:
      "Well-organized documents make reporting, review, audit preparation, and decision-making easier.",
  },
  {
    slug: "how-a-client-portal-improves-advisory-service",
    title: "How a Client Portal Improves Advisory Service Delivery",
    category: "Platform",
    date: "Service Update",
    excerpt:
      "A secure portal helps clients submit requests, upload files, exchange messages, and track progress.",
  },
  {
    slug: "payroll-compliance-for-growing-businesses",
    title: "Payroll Compliance for Growing Businesses",
    category: "Payroll",
    date: "Compliance Note",
    excerpt:
      "Payroll records, PAYE, RSSB, and staff documentation should be handled carefully as a business grows.",
  },
  {
    slug: "internal-controls-small-businesses",
    title: "Simple Internal Controls for Small Businesses",
    category: "Audit",
    date: "Business Control",
    excerpt:
      "Strong internal controls help reduce errors, fraud risks, cash leakage, and poor financial reporting.",
  },
  {
    slug: "business-planning-financial-decisions",
    title: "Business Planning and Financial Decisions",
    category: "Advisory",
    date: "Planning Guide",
    excerpt:
      "Good decisions are easier when owners understand costs, cash flow, margins, and financial risks.",
  },
];

export default function BlogPage() {
  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            Blog & Insights
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            Practical accounting, tax, payroll, audit, and advisory updates.
          </h1>

          <p className="mt-6 max-w-3xl leading-relaxed text-white/75">
            Read useful guidance prepared for businesses, institutions,
            entrepreneurs, and organizations that want better financial
            management and compliance.
          </p>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="rounded-xl border border-gray-100 bg-softwhite p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal">
                    {post.category}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={13} />
                    {post.date}
                  </span>
                </div>

                <h2 className="mb-3 text-lg font-bold leading-snug text-navy">
                  {post.title}
                </h2>

                <p className="mb-5 text-sm leading-relaxed text-gray-600">
                  {post.excerpt}
                </p>

                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all hover:gap-2"
                >
                  Read More
                  <ChevronRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}