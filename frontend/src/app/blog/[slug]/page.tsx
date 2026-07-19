"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";
import { api } from "@/lib/api";
import type { BlogPost } from "@/types/api";

const fallbackPosts: BlogPost[] = [
  {
    id: "fallback-blog-1",
    title: "How Proper Bookkeeping Helps Your Business Grow",
    slug: "proper-bookkeeping-business-growth",
    excerpt:
      "Good bookkeeping gives business owners clear financial information, better control, and stronger decision-making.",
    body:
      "Proper bookkeeping helps a business understand its income, expenses, debts, assets, and cash flow.\n\nIt also helps management prepare tax declarations, financial statements, and business decisions with confidence.\n\nWhen records are updated regularly, business owners can know what they owe, what clients owe them, and whether the business is making profit.",
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
      "A business that respects tax deadlines and keeps clear records can avoid unnecessary penalties.\n\nIt also becomes more credible when applying for loans, tenders, partnerships, or investment opportunities.\n\nGood tax compliance starts with proper bookkeeping, organized invoices, accurate declarations, and timely follow-up with tax obligations.",
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
      "Audit preparation should not begin only when auditors arrive.\n\nBusinesses should organize invoices, bank statements, payroll files, tax declarations, contracts, and supporting documents throughout the year.\n\nA well-prepared audit file saves time, reduces stress, and improves the credibility of financial reports.",
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

function formatDate(value?: string | null) {
  if (!value) return "Kivu Advisory";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kivu Advisory";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getParagraphs(body: string) {
  return body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const fallbackPost = useMemo(
    () => fallbackPosts.find((post) => post.slug === slug) || null,
    [slug],
  );

  const [post, setPost] = useState<BlogPost | null>(fallbackPost);
  const [isLoading, setIsLoading] = useState(!fallbackPost);

  useEffect(() => {
    let cancelled = false;

    const loadPost = async () => {
      setIsLoading(true);

      try {
        const result = await api.get<BlogPost>(
          `/blog/detail?slug=${encodeURIComponent(slug)}`,
        );

        if (!cancelled) {
          setPost(result.data);
        }
      } catch {
        if (!cancelled) {
          setPost(fallbackPost);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (slug) {
      void loadPost();
    }

    return () => {
      cancelled = true;
    };
  }, [fallbackPost, slug]);

  if (isLoading) {
    return (
      <PublicLayout>
        <section className="flex min-h-[70vh] items-center justify-center bg-lightgray">
          <p className="text-sm font-medium text-gray-600">
            Loading article...
          </p>
        </section>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout>
        <section className="flex min-h-[70vh] items-center justify-center bg-lightgray px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-navy">
              Article not found
            </h1>

            <p className="mb-6 text-gray-600">
              The article you are looking for is not available.
            </p>

            <Link
              href="/blog"
              className="inline-flex rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-700"
            >
              Back to blog
            </Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const paragraphs = getParagraphs(post.body || "");

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

          {post.category ? (
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
              {post.category}
            </p>
          ) : null}

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="inline-flex items-center gap-2">
              <Calendar size={16} />
              {formatDate(post.published_at || post.created_at)}
            </span>

            {post.tags?.length ? (
              <span className="inline-flex items-center gap-2">
                <Tag size={16} />
                {post.tags.slice(0, 3).join(", ")}
              </span>
            ) : null}
          </div>

          {post.excerpt ? (
            <p className="mt-6 text-lg leading-relaxed text-white/75">
              {post.excerpt}
            </p>
          ) : null}
        </div>
      </section>

      {post.featured_image_url ? (
        <section className="bg-lightgray pt-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="max-h-[520px] w-full object-cover"
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-lightgray py-16">
        <article className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-softwhite p-6 shadow-sm sm:p-10">
          <div className="space-y-6">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p
                  key={`${paragraph.slice(0, 20)}-${index}`}
                  className="text-base leading-8 text-gray-700"
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-base leading-8 text-gray-700">
                This article content will be available soon.
              </p>
            )}
          </div>

          {post.tags?.length ? (
            <div className="mt-10 border-t border-gray-100 pt-6">
              <p className="mb-3 text-sm font-semibold text-navy">Tags</p>

              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </PublicLayout>
  );
}