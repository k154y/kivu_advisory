"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  FileText,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  AdminBlogPost,
  BlogListResponse,
  BlogStatus,
  deleteBlogRequest,
  formatBlogDate,
  getBlogItems,
} from "@/lib/admin-blog";

function getStatusStyle(status: string) {
  if (status === "published") {
    return "bg-teal-50 text-teal";
  }

  if (status === "archived") {
    return "bg-gray-100 text-gray-500";
  }

  return "bg-gold-50 text-gold-600";
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogStatus>("all");
  const [isLoading, setIsLoading] = useState(true);

  const filteredPosts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return [...posts]
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();

        return dateB - dateA;
      })
      .filter((post) => {
        const matchesSearch =
          !searchValue ||
          post.title.toLowerCase().includes(searchValue) ||
          post.slug.toLowerCase().includes(searchValue) ||
          (post.category || "").toLowerCase().includes(searchValue);

        const matchesStatus =
          statusFilter === "all" || post.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
  }, [posts, search, statusFilter]);

  const loadPosts = async () => {
    setIsLoading(true);

    try {
      const result = await api.get<BlogListResponse | AdminBlogPost[]>(
        "/admin/blog?page_size=100",
      );

      setPosts(getBlogItems(result.data));
    } catch {
      toast.error("Failed to load blog posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const updateStatus = async (post: AdminBlogPost, status: BlogStatus) => {
    try {
      await api.patch(`/admin/blog/status?id=${encodeURIComponent(post.id)}`, {
        status,
      });

      toast.success("Blog status updated.");
      await loadPosts();
    } catch {
      toast.error("Failed to update blog status.");
    }
  };

  const handleDelete = async (post: AdminBlogPost) => {
    const confirmed = window.confirm(
      `Delete "${post.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteBlogRequest(
        `/admin/blog/detail?id=${encodeURIComponent(post.id)}`,
      );

      toast.success("Blog post deleted.");
      await loadPosts();
    } catch {
      toast.error("Failed to delete blog post.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Website Blog
          </p>

          <h1 className="text-2xl font-bold">Manage Blog Posts</h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Create, edit, publish, archive, and delete blog articles shown on
            the public website.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadPosts()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <Link
            href="/admin/blog/create"
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-navy hover:bg-gold-600"
          >
            <Plus size={16} />
            New Post
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search blog posts..."
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | BlogStatus)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading blog posts...</p>
        ) : filteredPosts.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-lightgray">
                    {post.featured_image_url ? (
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText size={28} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${getStatusStyle(
                          post.status,
                        )}`}
                      >
                        {post.status}
                      </span>

                      {post.is_featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-xs font-bold text-gold-600">
                          <Star size={12} />
                          Featured
                        </span>
                      ) : null}
                    </div>

                    <h2 className="line-clamp-2 font-bold text-navy">
                      {post.title}
                    </h2>

                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {post.slug}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Published: {formatBlogDate(post.published_at)}
                    </p>
                  </div>
                </div>

                {post.excerpt ? (
                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-gray-600">
                    {post.excerpt}
                  </p>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 size={14} />
                    Edit
                  </Link>

                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Eye size={14} />
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      updateStatus(
                        post,
                        post.status === "published" ? "draft" : "published",
                      )
                    }
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {post.status === "published" ? "Draft" : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <FileText className="mx-auto mb-3 text-gray-300" size={44} />

            <p className="font-semibold text-navy">No blog posts found</p>

            <p className="mt-1 text-sm text-gray-500">
              Create your first article for the public website blog.
            </p>

            <Link
              href="/admin/blog/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700"
            >
              <Plus size={16} />
              New Post
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}