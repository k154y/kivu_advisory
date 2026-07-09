"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar } from "lucide-react";

import { api } from "@/lib/api";
import type { BlogPost } from "@/types/api";

type BlogListResponse = {
  items: BlogPost[];
};

const fallbackPosts: BlogPost[] = [
  {
    id: "fallback-blog-1",
    title: "How Proper Bookkeeping Helps Your Business Grow",
    slug: "proper-bookkeeping-business-growth",
    excerpt:
      "Good bookkeeping gives business owners clear financial information, better control, and stronger decision-making.",
    body:
      "Proper bookkeeping helps a business understand its income, expenses, debts, assets, and cash flow. It also helps management prepare tax declarations, financial statements, and business decisions with confidence.",
    category: "Accounting",
    tags: ["accounting", "bookkeeping", "business"],
    featured_image_url:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    status: "published",
    is_featured: true,
    view_count: 0,
    published_at: "",
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-blog-2",
    title: "Why Tax Compliance Matters for Rwandan Businesses",
    slug: "tax-compliance-rwandan-businesses",
    excerpt:
      "Tax compliance protects businesses from penalties and builds trust with financial institutions and partners.",
    body:
      "A business that respects tax deadlines and keeps clear records can avoid unnecessary penalties. It also becomes more credible when applying for loans, tenders, partnerships, or investment opportunities.",
    category: "Tax",
    tags: ["tax", "rra", "compliance"],
    featured_image_url:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    status: "published",
    is_featured: false,
    view_count: 0,
    published_at: "",
    created_at: "",
    updated_at: "",
  },
  {
    id: "fallback-blog-3",
    title: "Preparing Your Business for an External Audit",
    slug: "preparing-business-external-audit",
    excerpt:
      "Organized documents, reconciliations, and internal controls make audit preparation easier and more professional.",
    body:
      "Audit preparation should not begin only when auditors arrive. Businesses should organize invoices, bank statements, payroll files, tax declarations, contracts, and supporting documents throughout the year.",
    category: "Audit",
    tags: ["audit", "compliance", "documents"],
    featured_image_url:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
    status: "published",
    is_featured: false,
    view_count: 0,
    published_at: "",
    created_at: "",
    updated_at: "",
  },
];

function getBlogItems(data: BlogListResponse | BlogPost[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function formatDate(value?: string | null) {
  if (!value) return "Kivu Advisory";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kivu Advisory";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function BlogPreviewSection() {
  const [posts, setPosts] = useState<BlogPost[]>(fallbackPosts);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const result = await api.get<BlogListResponse | BlogPost[]>(
          "/blog?page_size=3",
        );

        const items = getBlogItems(result.data).filter(Boolean);

        if (!cancelled && items.length > 0) {
          setPosts(items.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setPosts(fallbackPosts);
        }
      }
    };

    void loadPosts();

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
              Insights
            </p>

            <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
              Latest Accounting &amp; Business Articles
            </h2>

            <p className="max-w-2xl text-gray-600">
              Practical guidance on accounting, tax, audit, payroll,
              compliance, and business management.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-navy px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            View All Articles
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id || post.slug}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-xl border border-gray-100 bg-softwhite shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                {post.featured_image_url ? (
                  <img
                    src={post.featured_image_url}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-navy-50 text-sm font-semibold text-navy/50">
                    Kivu Advisory
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={14} />
                  <span>{formatDate(post.published_at || post.created_at)}</span>
                </div>

                {post.category ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">
                    {post.category}
                  </p>
                ) : null}

                <h3 className="mb-3 line-clamp-2 text-lg font-bold text-navy">
                  {post.title}
                </h3>

                {post.excerpt ? (
                  <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-gray-600">
                    {post.excerpt}
                  </p>
                ) : null}

                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-all group-hover:gap-2">
                  Read Article
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}