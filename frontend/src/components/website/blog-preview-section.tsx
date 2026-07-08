import Link from "next/link";
import { ArrowRight, Calendar, ChevronRight } from "lucide-react";

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
];

export function BlogPreviewSection() {
  return (
    <section className="bg-lightgray py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Blog & Insights
            </p>

            <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
              Practical Financial Updates
            </h2>

            <p className="max-w-2xl text-gray-600">
              Read useful accounting, tax, payroll, audit, compliance, and
              advisory updates prepared for businesses and institutions.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-navy px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            View All Posts
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
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

              <h3 className="mb-3 text-lg font-bold leading-snug text-navy">
                {post.title}
              </h3>

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
  );
}