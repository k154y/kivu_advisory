"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  FileText,
  ImageIcon,
  Plus,
  RefreshCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type ContentBlock = {
  id: string;
  content_key: string;
  title?: string;
  slug?: string;
  content_type: string;
  body?: string;
  summary?: string;
  meta_title?: string;
  meta_description?: string;
  image_url?: string;
  button_label?: string;
  button_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type ContentListResponse = {
  items: ContentBlock[];
};

type ContentFormState = {
  content_key: string;
  title: string;
  slug: string;
  content_type: string;
  summary: string;
  body: string;
  image_url: string;
  button_label: string;
  button_url: string;
  meta_title: string;
  meta_description: string;
  is_active: boolean;
  display_order: number;
};

const emptyForm: ContentFormState = {
  content_key: "",
  title: "",
  slug: "",
  content_type: "section",
  summary: "",
  body: "",
  image_url: "",
  button_label: "",
  button_url: "",
  meta_title: "",
  meta_description: "",
  is_active: true,
  display_order: 1,
};

const recommendedBlocks = [
  {
    key: "home_hero",
    label: "Homepage Hero",
    description: "Controls main homepage title, description, image, and button.",
  },
  {
    key: "home_contact_cta",
    label: "Homepage Contact CTA",
    description: "Controls the final call-to-action section on homepage.",
  },
  {
    key: "about_page",
    label: "About Page",
    description: "Can be used later for editable about page content.",
  },
  {
    key: "contact_page",
    label: "Contact Page",
    description: "Can be used later for editable contact page content.",
  },
];

function getContentItems(data: ContentListResponse | ContentBlock[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function blockToForm(block: ContentBlock): ContentFormState {
  return {
    content_key: block.content_key || "",
    title: block.title || "",
    slug: block.slug || "",
    content_type: block.content_type || "section",
    summary: block.summary || "",
    body: block.body || "",
    image_url: block.image_url || "",
    button_label: block.button_label || "",
    button_url: block.button_url || "",
    meta_title: block.meta_title || "",
    meta_description: block.meta_description || "",
    is_active: block.is_active,
    display_order: block.display_order || 1,
  };
}

function buildPayload(form: ContentFormState) {
  return {
    content_key: form.content_key.trim(),
    title: form.title.trim(),
    slug: form.slug.trim(),
    content_type: form.content_type.trim() || "section",
    summary: form.summary.trim(),
    body: form.body.trim(),
    image_url: form.image_url.trim(),
    button_label: form.button_label.trim(),
    button_url: form.button_url.trim(),
    meta_title: form.meta_title.trim(),
    meta_description: form.meta_description.trim(),
    is_active: form.is_active,
    display_order: Number(form.display_order) || 1,
  };
}

export default function AdminContentPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null);
  const [form, setForm] = useState<ContentFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }

      return a.content_key.localeCompare(b.content_key);
    });
  }, [blocks]);

  const loadContentBlocks = async () => {
    setIsLoading(true);

    try {
      const result = await api.get<ContentListResponse | ContentBlock[]>(
        "/admin/content?page_size=100",
      );

      setBlocks(getContentItems(result.data));
    } catch (error) {
      toast.error("Failed to load content blocks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContentBlocks();
  }, []);

  const updateForm = <K extends keyof ContentFormState>(
    field: K,
    value: ContentFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const startCreate = (contentKey?: string) => {
    setSelectedBlock(null);
    setForm({
      ...emptyForm,
      content_key: contentKey || "",
      title:
        recommendedBlocks.find((block) => block.key === contentKey)?.label || "",
    });
  };

  const startEdit = (block: ContentBlock) => {
    setSelectedBlock(block);
    setForm(blockToForm(block));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.content_key.trim()) {
      toast.error("Content key is required.");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload(form);

      if (selectedBlock) {
        await api.put(
          `/admin/content/detail?id=${encodeURIComponent(selectedBlock.id)}`,
          payload,
        );

        toast.success("Content block updated.");
      } else {
        await api.post("/admin/content", payload);
        toast.success("Content block created.");
      }

      setSelectedBlock(null);
      setForm(emptyForm);
      await loadContentBlocks();
    } catch (error) {
      toast.error(
        selectedBlock
          ? "Failed to update content block."
          : "Failed to create content block.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Website Content
          </p>

          <h1 className="text-2xl font-bold">Manage Website Content</h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Create and edit content blocks used by the public website, such as
            homepage hero text, homepage CTA, page sections, images, and
            buttons.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadContentBlocks()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => startCreate()}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-navy hover:bg-gold-600"
          >
            <Plus size={16} />
            New Block
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-navy">
              <FileText size={18} />
              Existing Blocks
            </h2>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading content blocks...</p>
            ) : sortedBlocks.length > 0 ? (
              <div className="space-y-3">
                {sortedBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => startEdit(block)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      selectedBlock?.id === block.id
                        ? "border-teal bg-teal-50"
                        : "border-gray-100 hover:border-navy/30 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-semibold text-navy">
                        {block.title || block.content_key}
                      </p>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          block.is_active
                            ? "bg-teal-50 text-teal"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {block.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {block.content_key}
                    </p>

                    {block.summary ? (
                      <p className="line-clamp-2 text-sm text-gray-600">
                        {block.summary}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-gray-500">
                No content blocks yet. Create your first block using one of the
                recommended keys below.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-navy">
              Recommended Blocks
            </h2>

            <div className="space-y-3">
              {recommendedBlocks.map((block) => {
                const exists = blocks.some(
                  (item) => item.content_key === block.key,
                );

                return (
                  <button
                    key={block.key}
                    type="button"
                    onClick={() => startCreate(block.key)}
                    disabled={exists}
                    className="w-full rounded-xl border border-gray-100 p-4 text-left transition-colors hover:border-navy/30 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="font-semibold text-navy">{block.label}</p>

                      {exists ? (
                        <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal">
                          Created
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                          Add
                        </span>
                      )}
                    </div>

                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {block.key}
                    </p>

                    <p className="text-sm leading-relaxed text-gray-600">
                      {block.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Edit3 size={20} />
                {selectedBlock ? "Edit Content Block" : "Create Content Block"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Use clear keys such as{" "}
                <span className="font-semibold text-navy">home_hero</span> or{" "}
                <span className="font-semibold text-navy">
                  home_contact_cta
                </span>
                .
              </p>
            </div>

            {selectedBlock ? (
              <button
                type="button"
                onClick={() => startCreate()}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Content Key"
                value={form.content_key}
                onChange={(value) => updateForm("content_key", value)}
                placeholder="home_hero"
                required
              />

              <TextInput
                label="Content Type"
                value={form.content_type}
                onChange={(value) => updateForm("content_type", value)}
                placeholder="section"
                required
              />

              <TextInput
                label="Title"
                value={form.title}
                onChange={(value) => updateForm("title", value)}
                placeholder="Accounting, Tax and Business Advisory..."
                required
              />

              <TextInput
                label="Slug"
                value={form.slug}
                onChange={(value) => updateForm("slug", value)}
                placeholder="home-hero"
              />
            </div>

            <TextArea
              label="Summary / Short Description"
              value={form.summary}
              onChange={(value) => updateForm("summary", value)}
              placeholder="Short text displayed in the website section."
              rows={3}
            />

            <TextArea
              label="Body / Full Content"
              value={form.body}
              onChange={(value) => updateForm("body", value)}
              placeholder="Longer content for the website section."
              rows={6}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Image URL"
                value={form.image_url}
                onChange={(value) => updateForm("image_url", value)}
                placeholder="https://..."
                icon={<ImageIcon size={16} />}
              />

              <TextInput
                label="Display Order"
                type="number"
                value={String(form.display_order)}
                onChange={(value) =>
                  updateForm("display_order", Number(value) || 1)
                }
                placeholder="1"
              />

              <TextInput
                label="Button Label"
                value={form.button_label}
                onChange={(value) => updateForm("button_label", value)}
                placeholder="Request a Service"
              />

              <TextInput
                label="Button URL"
                value={form.button_url}
                onChange={(value) => updateForm("button_url", value)}
                placeholder="/request-service"
              />
            </div>

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

            <label className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateForm("is_active", event.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
              />

              <span>
                <span className="block text-sm font-semibold text-navy">
                  Active on website
                </span>
                <span className="block text-xs text-gray-500">
                  Inactive blocks will not be used by the public website.
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-gray-100 bg-lightgray p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
                <Eye size={16} />
                Quick Preview
              </h3>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">
                {form.content_key || "content_key"}
              </p>

              <h4 className="mb-2 text-xl font-bold text-navy">
                {form.title || "Content title preview"}
              </h4>

              <p className="text-sm leading-relaxed text-gray-600">
                {form.summary ||
                  form.body ||
                  "Summary or body preview will appear here."}
              </p>

              {form.button_label ? (
                <p className="mt-4 inline-flex rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
                  {form.button_label}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60 md:w-auto"
            >
              <Save size={16} />
              {isSaving
                ? "Saving..."
                : selectedBlock
                  ? "Update Content Block"
                  : "Create Content Block"}
            </button>
          </form>
        </section>
      </div>
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
  icon?: React.ReactNode;
};

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  icon,
}: TextInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <div className="relative">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        ) : null}

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20 ${
            icon ? "pl-10" : ""
          }`}
        />
      </div>
    </label>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: TextAreaProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
    </label>
  );
}