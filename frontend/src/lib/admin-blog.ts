import { api } from "@/lib/api";

export type BlogStatus = "draft" | "published" | "archived";

export type AdminBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  featured_image_url: string;
  status: BlogStatus | string;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  author_user_id: string;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type BlogListResponse = {
  items: AdminBlogPost[];
  pagination?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

export type BlogFormState = {
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

type ApiWithDelete = typeof api & {
  del?: <T>(path: string) => Promise<T>;
  delete?: <T>(path: string) => Promise<T>;
};

export const adminBlogPaths = {
  list: "/admin/blog",
  create: "/admin/blog",
  detail: (id: string) => `/admin/blog/detail?id=${encodeURIComponent(id)}`,
  status: (id: string) => `/admin/blog/status?id=${encodeURIComponent(id)}`,
};

export const publicBlogPaths = {
  list: "/blog",
  detail: (slug: string) =>
    `/blog/detail?slug=${encodeURIComponent(slug)}`,
};

export const emptyBlogForm: BlogFormState = {
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

export const blogStatusOptions: BlogStatus[] = [
  "draft",
  "published",
  "archived",
];

export const blogCategoryOptions = [
  "Accounting",
  "Tax",
  "Audit",
  "Payroll",
  "Compliance",
  "Business",
  "Advisory",
  "Training",
];

export function getBlogItems(data: BlogListResponse | AdminBlogPost[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

export function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function blogToForm(post: AdminBlogPost): BlogFormState {
  return {
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    body: post.body || "",
    category: post.category || "",
    tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
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

export function buildBlogPayload(form: BlogFormState) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    excerpt: form.excerpt.trim(),
    body: form.body.trim(),
    category: form.category.trim(),
    tags: parseTags(form.tags),
    featured_image_url: form.featured_image_url.trim(),
    status: form.status,
    is_featured: form.is_featured,
    meta_title: form.meta_title.trim(),
    meta_description: form.meta_description.trim(),
  };
}

export async function deleteBlogRequest(path: string) {
  const apiClient = api as ApiWithDelete;

  if (apiClient.del) {
    return apiClient.del(path);
  }

  if (apiClient.delete) {
    return apiClient.delete(path);
  }

  throw new Error("API delete method is not available.");
}

export function formatBlogDate(value?: string | null) {
  if (!value) return "Not published";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}