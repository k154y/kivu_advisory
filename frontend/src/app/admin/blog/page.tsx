"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type BlogStatus = "draft" | "published" | "archived";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  category?: string;
  tags?: string[];
  featured_image_url?: string;
  status: BlogStatus | string;
  is_featured?: boolean;
  meta_title?: string;
  meta_description?: string;
  author_user_id?: string;
  published_at?: string | null;
  view_count?: number;
  created_at: string;
  updated_at?: string;
};

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string;
  featured_image_url: string;
  status: BlogStatus;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
};

const EMPTY_FORM: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: "",
  tags: "",
  featured_image_url: "",
  status: "draft",
  is_featured: false,
  meta_title: "",
  meta_description: "",
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateShort(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function tagsToText(tags?: string[]) {
  if (!Array.isArray(tags)) return "";
  return tags.join(", ");
}

function textToTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function fromPost(post: BlogPost): BlogForm {
  return {
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    body: post.body || "",
    category: post.category || "",
    tags: tagsToText(post.tags),
    featured_image_url: post.featured_image_url || "",
    status:
      post.status === "published" || post.status === "archived"
        ? post.status
        : "draft",
    is_featured: Boolean(post.is_featured),
    meta_title: post.meta_title || "",
    meta_description: post.meta_description || "",
  };
}

function getResponseData(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as { data?: unknown }).data;
  }

  return response;
}

function getBlogItems(response: unknown): BlogPost[] {
  const data = getResponseData(response);

  if (Array.isArray(data)) return data as BlogPost[];

  if (!data || typeof data !== "object") return [];

  const objectData = data as {
    items?: BlogPost[];
    posts?: BlogPost[];
    data?: BlogPost[] | { items?: BlogPost[]; posts?: BlogPost[] };
  };

  if (Array.isArray(objectData.items)) return objectData.items;
  if (Array.isArray(objectData.posts)) return objectData.posts;
  if (Array.isArray(objectData.data)) return objectData.data;

  if (
    objectData.data &&
    !Array.isArray(objectData.data) &&
    Array.isArray(objectData.data.items)
  ) {
    return objectData.data.items;
  }

  if (
    objectData.data &&
    !Array.isArray(objectData.data) &&
    Array.isArray(objectData.data.posts)
  ) {
    return objectData.data.posts;
  }

  return [];
}

function buildPayload(form: BlogForm) {
  return {
    title: form.title.trim(),
    slug: slugify(form.slug || form.title),
    excerpt: form.excerpt.trim(),
    body: form.body.trim(),
    category: form.category.trim(),
    tags: textToTags(form.tags),
    featured_image_url: form.featured_image_url.trim(),
    status: form.status,
    is_featured: form.is_featured,
    meta_title: form.meta_title.trim(),
    meta_description: form.meta_description.trim(),
  };
}

function getStatusStyle(status: string) {
  if (status === "published") {
    return "bg-teal-50 text-teal";
  }

  if (status === "archived") {
    return "bg-red-50 text-red-600";
  }

  return "bg-gray-100 text-gray-500";
}

function getStatusLabel(status: string) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api.get<unknown>("/admin/blog?page_size=100");
      setPosts(getBlogItems(result));
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load blog posts."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = <K extends keyof BlogForm>(key: K, value: BlogForm[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openModal = (post?: BlogPost) => {
    setEditing(post || null);
    setForm(post ? fromPost(post) : EMPTY_FORM);
    setPreviewImage(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreviewImage(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Slug is required.");
      return;
    }

    if (!form.body.trim()) {
      toast.error("Content is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(form);

      if (editing?.id) {
        await api.put(
          `/admin/blog/detail?id=${encodeURIComponent(editing.id)}`,
          payload,
        );
      } else {
        await api.post("/admin/blog", payload);
      }

      toast.success(editing ? "Blog post updated." : "Blog post created.");
      closeModal();
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to save blog post."));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    setUpdatingStatus(post.id);

    try {
      const nextStatus: BlogStatus =
        post.status === "published" ? "draft" : "published";

      await api.patch(
        `/admin/blog/status?id=${encodeURIComponent(post.id)}`,
        {
          status: nextStatus,
        },
      );

      toast.success(
        nextStatus === "published"
          ? "Blog post published."
          : "Blog post moved to draft.",
      );

      await load();
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to update blog status."),
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (post: BlogPost) => {
  const confirmed = window.confirm(
    `Delete "${post.title}"? This action cannot be undone.`,
  );

  if (!confirmed) return;

  try {
    await api.request(
      `/admin/blog/detail?id=${encodeURIComponent(post.id)}`,
      {
        method: "DELETE",
      },
    );

    toast.success("Blog post deleted successfully.");
    await load();
  } catch (error) {
    toast.error(getSafeErrorMessage(error, "Failed to delete blog post."));
  }
};
  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Blog Posts</h1>
          <p className="mt-1 text-sm text-gray-500">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading blog posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No posts yet. Create your first blog post.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-lightgray">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Post
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Photo
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Date
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-lightgray/50">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      {post.is_featured ? (
                        <Star
                          size={14}
                          className="mt-0.5 shrink-0 fill-gold text-gold"
                        />
                      ) : null}

                      <div className="min-w-0">
                        <p className="line-clamp-1 font-medium text-navy">
                          {post.title}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">
                          {post.slug}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-xs text-gray-600">
                    {post.category || "—"}
                  </td>

                  <td className="px-5 py-4">
                    {post.featured_image_url ? (
                      <a
                        href={post.featured_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-teal hover:underline"
                      >
                        <ExternalLink size={11} />
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(post)}
                      disabled={
                        updatingStatus === post.id || post.status === "archived"
                      }
                      className="flex items-center gap-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {post.status === "published" ? (
                        <>
                          <Eye size={13} className="text-teal" />
                          <span className="text-teal">Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={13} className="text-gray-400" />
                          <span className="text-gray-400">
                            {getStatusLabel(post.status)}
                          </span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-4 text-xs text-gray-400">
                    {formatDateShort(post.created_at)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="rounded p-1.5 text-gray-400 hover:text-teal"
                        title="Open public post"
                      >
                        <ExternalLink size={13} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => openModal(post)}
                        className="rounded p-1.5 text-gray-400 hover:text-navy"
                        title="Edit post"
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        disabled={deleting === post.id}
                        className="rounded p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                        title="Delete post"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <h2 className="mb-5 text-lg font-bold text-navy">
              {editing ? "Edit Post" : "New Blog Post"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateField("title", value);

                    if (!editing && !form.slug) {
                      updateField("slug", slugify(value));
                    }
                  }}
                  placeholder="e.g. VAT Compliance in Rwanda"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Slug *{" "}
                  <span className="font-normal text-gray-400">
                    URL path, no spaces
                  </span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) =>
                    updateField("slug", slugify(event.target.value))
                  }
                  placeholder="vat-compliance-rwanda"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
                {form.slug ? (
                  <p className="mt-1 text-xs text-gray-400">
                    URL: /blog/{form.slug}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    placeholder="e.g. Tax, Accounting, Payroll"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value as BlogStatus)
                    }
                    className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 ${getStatusStyle(
                      form.status,
                    )}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Tags{" "}
                  <span className="font-normal text-gray-400">
                    separated by commas
                  </span>
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(event) => updateField("tags", event.target.value)}
                  placeholder="VAT, Rwanda, Tax"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-charcoal">
                  <ImageIcon size={14} className="text-teal" />
                  Cover Photo URL
                </label>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.featured_image_url}
                    onChange={(event) => {
                      updateField("featured_image_url", event.target.value);
                      setPreviewImage(false);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />

                  {form.featured_image_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage((current) => !current)}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-lightgray"
                    >
                      {previewImage ? "Hide" : "Preview"}
                    </button>
                  ) : null}
                </div>

                <p className="mt-1.5 text-xs text-gray-400">
                  Paste a direct image URL from Unsplash, Pexels, or another
                  hosted image source.
                </p>

                {previewImage && form.featured_image_url ? (
                  <div className="mt-2 h-40 overflow-hidden rounded-lg border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.featured_image_url}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                      onError={() => {
                        setPreviewImage(false);
                        toast.error("Could not load image. Check the URL.");
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-lightgray px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    Featured Post
                  </p>
                  <p className="text-xs text-gray-500">
                    Mark this post as important for homepage or blog highlights.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) =>
                    updateField("is_featured", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Excerpt{" "}
                  <span className="font-normal text-gray-400">
                    short summary shown on blog list
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(event) =>
                    updateField("excerpt", event.target.value)
                  }
                  placeholder="A 1-2 sentence summary of the post..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Content *
                </label>
                <p className="mb-2 text-xs text-gray-400">
                  Use **bold text** for headings. Start lines with - for bullet
                  points.
                </p>
                <textarea
                  rows={12}
                  value={form.body}
                  onChange={(event) => updateField("body", event.target.value)}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  placeholder={`**Introduction**

Write your introduction here...

**Main Points**

- Point one
- Point two
- Point three`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={form.meta_title}
                    onChange={(event) =>
                      updateField("meta_title", event.target.value)
                    }
                    placeholder="Optional SEO title"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    SEO Description
                  </label>
                  <input
                    type="text"
                    value={form.meta_description}
                    onChange={(event) =>
                      updateField("meta_description", event.target.value)
                    }
                    placeholder="Optional SEO description"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Post"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}