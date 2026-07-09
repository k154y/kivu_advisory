"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImageIcon, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  adminBlogPaths,
  AdminBlogPost,
  BlogFormState,
  blogCategoryOptions,
  blogStatusOptions,
  blogToForm,
  buildBlogPayload,
  createSlug,
  emptyBlogForm,
} from "@/lib/admin-blog";

type BlogPostFormProps = {
  mode: "create" | "edit";
  initialPost?: AdminBlogPost | null;
};

export function BlogPostForm({ mode, initialPost }: BlogPostFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<BlogFormState>(
    initialPost ? blogToForm(initialPost) : emptyBlogForm,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(initialPost ? blogToForm(initialPost) : emptyBlogForm);
  }, [initialPost]);

  const updateForm = <K extends keyof BlogFormState>(
    field: K,
    value: BlogFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: current.slug ? current.slug : createSlug(value),
      meta_title: current.meta_title ? current.meta_title : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Blog title is required.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Blog slug is required.");
      return;
    }

    if (form.excerpt.trim().length < 5) {
      toast.error("Excerpt must be at least 5 characters.");
      return;
    }

    if (form.body.trim().length < 10) {
      toast.error("Blog body must be at least 10 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildBlogPayload(form);

      if (mode === "edit" && initialPost) {
        await api.put(adminBlogPaths.detail(initialPost.id), payload);
        toast.success("Blog post updated.");
      } else {
        await api.post(adminBlogPaths.create, payload);
        toast.success("Blog post created.");
      }

      router.replace("/admin/blog");
    } catch {
      toast.error(
        mode === "edit"
          ? "Failed to update blog post."
          : "Failed to create blog post.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/admin/blog"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>

          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Admin Blog
          </p>

          <h1 className="text-2xl font-bold">
            {mode === "edit" ? "Edit Blog Post" : "Create Blog Post"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Create articles for the public website. Only published posts appear
            on the public blog.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              label="Title"
              value={form.title}
              onChange={handleTitleChange}
              placeholder="How Proper Bookkeeping Helps Your Business Grow"
              required
            />

            <TextInput
              label="Slug"
              value={form.slug}
              onChange={(value) => updateForm("slug", createSlug(value))}
              placeholder="proper-bookkeeping-business-growth"
              required
            />

            <SelectInput
              label="Category"
              value={form.category}
              onChange={(value) => updateForm("category", value)}
              options={blogCategoryOptions}
              placeholder="Select category"
            />

            <SelectInput
              label="Status"
              value={form.status}
              onChange={(value) =>
                updateForm("status", value as BlogFormState["status"])
              }
              options={blogStatusOptions}
              placeholder="Select status"
            />
          </div>

          <TextArea
            label="Excerpt"
            value={form.excerpt}
            onChange={(value) => updateForm("excerpt", value)}
            placeholder="Short summary shown on blog cards."
            rows={3}
            required
          />

          <TextArea
            label="Body"
            value={form.body}
            onChange={(value) => updateForm("body", value)}
            placeholder="Write the full article here."
            rows={14}
            required
          />

          <TextInput
            label="Tags"
            value={form.tags}
            onChange={(value) => updateForm("tags", value)}
            placeholder="accounting, bookkeeping, business"
          />

          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              label="Meta Title"
              value={form.meta_title}
              onChange={(value) => updateForm("meta_title", value)}
              placeholder="SEO title"
            />

            <TextInput
              label="Meta Description"
              value={form.meta_description}
              onChange={(value) => updateForm("meta_description", value)}
              placeholder="SEO description"
            />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-navy">
              Publishing Options
            </h2>

            <CheckboxField
              label="Featured Post"
              description="Mark this post as important or highlighted."
              checked={form.is_featured}
              onChange={(value) => updateForm("is_featured", value)}
            />

            <div className="mt-5 rounded-xl border border-gray-100 bg-lightgray p-4">
              <p className="text-sm font-semibold text-navy">Current status</p>

              <p className="mt-1 text-sm capitalize text-gray-600">
                {form.status}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-navy">
              <ImageIcon size={18} />
              Featured Image
            </h2>

            <TextInput
              label="Image URL"
              value={form.featured_image_url}
              onChange={(value) => updateForm("featured_image_url", value)}
              placeholder="https://..."
            />

            <div className="mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-lightgray">
              {form.featured_image_url ? (
                <img
                  src={form.featured_image_url}
                  alt={form.title || "Blog image preview"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                  Image preview
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-navy">Quick Preview</h2>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">
              {form.category || "Category"}
            </p>

            <h3 className="mb-3 text-xl font-bold text-navy">
              {form.title || "Blog title preview"}
            </h3>

            <p className="text-sm leading-relaxed text-gray-600">
              {form.excerpt || "Blog excerpt preview will appear here."}
            </p>
          </section>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving
              ? "Saving..."
              : mode === "edit"
                ? "Update Blog Post"
                : "Create Blog Post"}
          </button>
        </aside>
      </form>
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: TextInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
    </label>
  );
}

type SelectInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
};

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: SelectInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
      >
        <option value="">{placeholder || "Select option"}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
};

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
}: TextAreaProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
    </label>
  );
}

type CheckboxFieldProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-100 bg-lightgray p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
      />

      <span>
        <span className="block text-sm font-semibold text-navy">{label}</span>
        <span className="block text-xs leading-relaxed text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}