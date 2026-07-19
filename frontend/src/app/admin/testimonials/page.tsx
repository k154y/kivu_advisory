"use client";

import { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";

type Testimonial = {
  id: string;
  client_name: string;
  client_role?: string;
  company_name?: string;
  content: string;
  rating: number;
  photo_url?: string;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
};

type TestimonialListResponse = {
  items: Testimonial[];
};

type TestimonialForm = {
  client_name: string;
  client_role: string;
  company_name: string;
  content: string;
  rating: number;
  photo_url: string;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
};

type ApiWithDelete = typeof api & {
  del?: <T>(path: string) => Promise<T>;
  delete?: <T>(path: string) => Promise<T>;
};

const EMPTY: TestimonialForm = {
  client_name: "",
  client_role: "",
  company_name: "",
  content: "",
  rating: 5,
  photo_url: "",
  is_featured: false,
  display_order: 0,
  is_active: true,
};

function getTestimonialItems(
  data: TestimonialListResponse | Testimonial[],
) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function toForm(testimonial: Testimonial): TestimonialForm {
  return {
    client_name: testimonial.client_name || "",
    client_role: testimonial.client_role || "",
    company_name: testimonial.company_name || "",
    content: testimonial.content || "",
    rating: testimonial.rating || 5,
    photo_url: testimonial.photo_url || "",
    is_featured: Boolean(testimonial.is_featured),
    display_order: testimonial.display_order || 0,
    is_active: Boolean(testimonial.is_active),
  };
}

function buildPayload(form: TestimonialForm) {
  return {
    client_name: form.client_name.trim(),
    client_role: form.client_role.trim(),
    company_name: form.company_name.trim(),
    content: form.content.trim(),
    rating: Number(form.rating) || 5,
    photo_url: form.photo_url.trim(),
    is_featured: form.is_featured,
    display_order: Number(form.display_order) || 0,
    is_active: form.is_active,
  };
}

async function deleteTestimonial(path: string) {
  const apiClient = api as ApiWithDelete;

  if (apiClient.del) {
    return apiClient.del(path);
  }

  if (apiClient.delete) {
    return apiClient.delete(path);
  }

  throw new Error("API delete method is not available.");
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    editing?: Testimonial | null;
  }>({ open: false });
  const [form, setForm] = useState<TestimonialForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get<TestimonialListResponse | Testimonial[]>(
        endpoints.admin.testimonials({ page_size: 100 }),
      );

      setTestimonials(
        getTestimonialItems(result.data).sort(
          (a, b) => (a.display_order || 0) - (b.display_order || 0),
        ),
      );
    } catch {
      toast.error("Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setModal({ open: true, editing: null });
  };

  const openEdit = (testimonial: Testimonial) => {
    setForm(toForm(testimonial));
    setModal({ open: true, editing: testimonial });
  };

  const closeModal = () => {
    setModal({ open: false });
    setForm(EMPTY);
  };

  const updateForm = <K extends keyof TestimonialForm>(
    key: K,
    value: TestimonialForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.content.trim()) {
      toast.error("Client name and testimonial content are required.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(form);

      if (modal.editing) {
        await api.put(
          endpoints.admin.testimonialDetail(modal.editing.id),
          payload,
        );

        toast.success("Testimonial updated.");
      } else {
        await api.post(endpoints.admin.testimonials(), payload);
        toast.success("Testimonial created.");
      }

      await load();
      closeModal();
    } catch {
      toast.error("Failed to save testimonial.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this testimonial?")) return;

    try {
      await deleteTestimonial(endpoints.admin.testimonialDetail(id));
      toast.success("Testimonial deleted.");
      await load();
    } catch {
      toast.error("Failed to delete testimonial.");
    }
  };

  const handleToggleActive = async (testimonial: Testimonial) => {
    try {
      await api.patch(endpoints.admin.testimonialStatus(testimonial.id), {
        is_active: !testimonial.is_active,
        is_featured: testimonial.is_featured,
      });

      toast.success(
        testimonial.is_active
          ? "Testimonial deactivated."
          : "Testimonial activated.",
      );

      await load();
    } catch {
      toast.error("Failed to update testimonial status.");
    }
  };

  const handleToggleFeatured = async (testimonial: Testimonial) => {
    try {
      await api.patch(endpoints.admin.testimonialStatus(testimonial.id), {
        is_active: testimonial.is_active,
        is_featured: !testimonial.is_featured,
      });

      toast.success(
        testimonial.is_featured
          ? "Removed from featured."
          : "Marked as featured.",
      );

      await load();
    } catch {
      toast.error("Failed to update testimonial status.");
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Testimonials</h1>
          <p className="mt-1 text-sm text-gray-500">
            {testimonials.length} testimonial
            {testimonials.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          <Plus size={16} />
          Add Testimonial
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : testimonials.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No testimonials yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-gray-100 bg-lightgray">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Rating
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Order
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Featured
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {testimonials.map((testimonial) => (
                  <tr key={testimonial.id} className="hover:bg-lightgray/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">
                        {testimonial.client_name}
                      </p>

                      <p className="line-clamp-1 text-xs text-gray-400">
                        {[testimonial.client_role, testimonial.company_name]
                          .filter(Boolean)
                          .join(" — ") || "No role or company"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} className="fill-gold text-gold" />
                        {testimonial.rating}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {testimonial.display_order}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(testimonial)}
                        className="flex items-center gap-1.5 text-xs font-medium"
                      >
                        {testimonial.is_active ? (
                          <>
                            <ToggleRight size={16} className="text-teal" />
                            <span className="text-teal">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={16} className="text-gray-400" />
                            <span className="text-gray-400">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => void handleToggleFeatured(testimonial)}
                      >
                        {testimonial.is_featured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-xs font-bold text-gold-600">
                            <Star size={12} />
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(testimonial)}
                          className="rounded p-1.5 text-gray-400 hover:text-navy"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(testimonial.id)}
                          className="rounded p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-navy">
                {modal.editing ? "Edit Testimonial" : "Add Testimonial"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-navy"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <TextInput
                label="Client Name *"
                value={form.client_name}
                onChange={(value) => updateForm("client_name", value)}
              />

              <TextInput
                label="Role / Title"
                value={form.client_role}
                onChange={(value) => updateForm("client_role", value)}
              />

              <TextInput
                label="Company Name"
                value={form.company_name}
                onChange={(value) => updateForm("company_name", value)}
              />

              <TextArea
                label="Testimonial *"
                value={form.content}
                onChange={(value) => updateForm("content", value)}
              />

              <TextInput
                label="Photo URL"
                value={form.photo_url}
                onChange={(value) => updateForm("photo_url", value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Rating (1-5)
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={form.rating}
                    onChange={(event) =>
                      updateForm(
                        "rating",
                        Math.min(5, Math.max(1, Number(event.target.value) || 5)),
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    Order
                  </label>

                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(event) =>
                      updateForm(
                        "display_order",
                        Number(event.target.value) || 0,
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-xl bg-lightgray p-4">
                <CheckboxField
                  label="Active"
                  checked={form.is_active}
                  onChange={(value) => updateForm("is_active", value)}
                />

                <CheckboxField
                  label="Featured on homepage"
                  checked={form.is_featured}
                  onChange={(value) => updateForm("is_featured", value)}
                />
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
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextInput({ label, value, onChange }: TextInputProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextArea({ label, value, onChange }: TextAreaProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
      />
    </div>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
      />

      {label}
    </label>
  );
}
