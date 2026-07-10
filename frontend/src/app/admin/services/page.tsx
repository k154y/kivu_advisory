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

type Service = {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  short_description?: string;
  description?: string;
  category?: string;
  price_label?: string;
  show_price_label?: boolean;
  estimated_duration?: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
};

type ServiceListResponse = {
  items: Service[];
};

type ServiceForm = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  price_label: string;
  show_price_label: boolean;
  estimated_duration: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
};

type ApiWithDelete = typeof api & {
  del?: <T>(path: string) => Promise<T>;
  delete?: <T>(path: string) => Promise<T>;
};

const EMPTY: ServiceForm = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  category: "",
  price_label: "",
  show_price_label: false,
  estimated_duration: "",
  is_featured: false,
  is_active: true,
  display_order: 0,
};

function getServiceItems(data: ServiceListResponse | Service[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function getTitle(service: Service) {
  return service.title || service.name || "Untitled service";
}

function toForm(service: Service): ServiceForm {
  return {
    title: getTitle(service),
    slug: service.slug || "",
    short_description: service.short_description || "",
    description: service.description || "",
    category: service.category || "",
    price_label: service.price_label || "",
    show_price_label: Boolean(service.show_price_label),
    estimated_duration: service.estimated_duration || "",
    is_featured: Boolean(service.is_featured),
    is_active: Boolean(service.is_active),
    display_order: service.display_order || 0,
  };
}

function buildPayload(form: ServiceForm) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    short_description: form.short_description.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    price_label: form.price_label.trim(),
    show_price_label: form.show_price_label,
    estimated_duration: form.estimated_duration.trim(),
    is_featured: form.is_featured,
    is_active: form.is_active,
    display_order: Number(form.display_order) || 0,
  };
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function deleteService(path: string) {
  const apiClient = api as ApiWithDelete;

  if (apiClient.del) {
    return apiClient.del(path);
  }

  if (apiClient.delete) {
    return apiClient.delete(path);
  }

  throw new Error("API delete method is not available.");
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    editing?: Service | null;
  }>({ open: false });
  const [form, setForm] = useState<ServiceForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get<ServiceListResponse | Service[]>(
        "/admin/services?page_size=100",
      );

      setServices(
        getServiceItems(result.data).sort(
          (a, b) => (a.display_order || 0) - (b.display_order || 0),
        ),
      );
    } catch {
      toast.error("Failed to load services.");
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

  const openEdit = (service: Service) => {
    setForm(toForm(service));
    setModal({ open: true, editing: service });
  };

  const closeModal = () => {
    setModal({ open: false });
    setForm(EMPTY);
  };

  const updateForm = <K extends keyof ServiceForm>(
    key: K,
    value: ServiceForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: current.slug ? current.slug : createSlug(value),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(form);

      if (modal.editing) {
        await api.put(
          `/admin/services/detail?id=${encodeURIComponent(modal.editing.id)}`,
          payload,
        );

        toast.success("Service updated.");
      } else {
        await api.post("/admin/services", payload);
        toast.success("Service created.");
      }

      await load();
      closeModal();
    } catch {
      toast.error("Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this service?")) return;

    try {
      await deleteService(`/admin/services/detail?id=${encodeURIComponent(id)}`);
      toast.success("Service deleted.");
      await load();
    } catch {
      toast.error("Failed to delete service.");
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await api.patch(
        `/admin/services/status?id=${encodeURIComponent(service.id)}`,
        {
          is_active: !service.is_active,
        },
      );

      toast.success(
        service.is_active ? "Service deactivated." : "Service activated.",
      );

      await load();
    } catch {
      toast.error("Failed to toggle service.");
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            {services.length} services
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : services.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No services yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-gray-100 bg-lightgray">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Service
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Slug
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
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-lightgray/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">
                        {getTitle(service)}
                      </p>

                      <p className="line-clamp-1 text-xs text-gray-400">
                        {service.short_description || "No short description"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-gray-500">
                      {service.slug}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {service.display_order}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggle(service)}
                        className="flex items-center gap-1.5 text-xs font-medium"
                      >
                        {service.is_active ? (
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
                      {service.is_featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-xs font-bold text-gold-600">
                          <Star size={12} />
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(service)}
                          className="rounded p-1.5 text-gray-400 hover:text-navy"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(service.id)}
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
                {modal.editing ? "Edit Service" : "Add Service"}
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
                label="Title *"
                value={form.title}
                onChange={handleTitleChange}
              />

              <TextInput
                label="Slug *"
                value={form.slug}
                onChange={(value) => updateForm("slug", createSlug(value))}
              />

              <TextArea
                label="Short Description"
                value={form.short_description}
                onChange={(value) => updateForm("short_description", value)}
              />

              <TextArea
                label="Full Description"
                value={form.description}
                onChange={(value) => updateForm("description", value)}
              />

              <TextInput
                label="Category"
                value={form.category}
                onChange={(value) => updateForm("category", value)}
              />

              <TextInput
                label="Estimated Duration"
                value={form.estimated_duration}
                onChange={(value) => updateForm("estimated_duration", value)}
              />

              <TextInput
                label="Price Label"
                value={form.price_label}
                onChange={(value) => updateForm("price_label", value)}
              />

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

                <CheckboxField
                  label="Show price label"
                  checked={form.show_price_label}
                  onChange={(value) => updateForm("show_price_label", value)}
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
        rows={3}
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