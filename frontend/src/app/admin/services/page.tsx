"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type AdminService = {
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
  created_at: string;
  updated_at: string;
};

type ServiceListResponse = {
  items: AdminService[];
};

type ServiceFormState = {
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

const emptyForm: ServiceFormState = {
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
  display_order: 1,
};

const categoryOptions = [
  "Accounting",
  "Tax",
  "Payroll",
  "Audit",
  "Reporting",
  "Advisory",
  "Registration",
  "Training",
  "Compliance",
];

function getServiceItems(data: ServiceListResponse | AdminService[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function getServiceTitle(service: AdminService) {
  return service.title || service.name || "Untitled Service";
}

function serviceToForm(service: AdminService): ServiceFormState {
  return {
    title: getServiceTitle(service),
    slug: service.slug || "",
    short_description: service.short_description || "",
    description: service.description || "",
    category: service.category || "",
    price_label: service.price_label || "",
    show_price_label: Boolean(service.show_price_label),
    estimated_duration: service.estimated_duration || "",
    is_featured: service.is_featured,
    is_active: service.is_active,
    display_order: service.display_order || 1,
  };
}

function buildPayload(form: ServiceFormState) {
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
    display_order: Number(form.display_order) || 1,
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

async function deleteServiceRequest(path: string) {
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
  const [services, setServices] = useState<AdminService[]>([]);
  const [selectedService, setSelectedService] = useState<AdminService | null>(
    null,
  );
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const filteredServices = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return [...services]
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }

        return getServiceTitle(a).localeCompare(getServiceTitle(b));
      })
      .filter((service) => {
        if (!searchValue) return true;

        return (
          getServiceTitle(service).toLowerCase().includes(searchValue) ||
          service.slug.toLowerCase().includes(searchValue) ||
          (service.category || "").toLowerCase().includes(searchValue)
        );
      });
  }, [search, services]);

  const loadServices = async () => {
    setIsLoading(true);

    try {
      const result = await api.get<ServiceListResponse | AdminService[]>(
        "/admin/services?page_size=100",
      );

      setServices(getServiceItems(result.data));
    } catch {
      toast.error("Failed to load services.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  const updateForm = <K extends keyof ServiceFormState>(
    field: K,
    value: ServiceFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const startCreate = () => {
    setSelectedService(null);
    setForm(emptyForm);
  };

  const startEdit = (service: AdminService) => {
    setSelectedService(service);
    setForm(serviceToForm(service));
  };

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug:
        current.slug && selectedService
          ? current.slug
          : current.slug
            ? current.slug
            : createSlug(value),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Service title is required.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Service slug is required.");
      return;
    }

    if (form.short_description.trim().length < 10) {
      toast.error("Short description must be at least 10 characters.");
      return;
    }

    if (form.show_price_label && !form.price_label.trim()) {
      toast.error("Price label is required when price display is enabled.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload(form);

      if (selectedService) {
        await api.put(
          `/admin/services/detail?id=${encodeURIComponent(selectedService.id)}`,
          payload,
        );

        toast.success("Service updated.");
      } else {
        await api.post("/admin/services", payload);
        toast.success("Service created.");
      }

      setSelectedService(null);
      setForm(emptyForm);
      await loadServices();
    } catch {
      toast.error(
        selectedService
          ? "Failed to update service."
          : "Failed to create service.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (service: AdminService) => {
    try {
      await api.patch(
        `/admin/services/status?id=${encodeURIComponent(service.id)}`,
        {
          is_active: !service.is_active,
        },
      );

      toast.success("Service status updated.");
      await loadServices();
    } catch {
      toast.error("Failed to update service status.");
    }
  };

  const handleDelete = async (service: AdminService) => {
    const confirmed = window.confirm(
      `Delete ${getServiceTitle(service)}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteServiceRequest(
        `/admin/services/detail?id=${encodeURIComponent(service.id)}`,
      );

      toast.success("Service deleted.");

      if (selectedService?.id === service.id) {
        setSelectedService(null);
        setForm(emptyForm);
      }

      await loadServices();
    } catch {
      toast.error("Failed to delete service.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Website Services
          </p>

          <h1 className="text-2xl font-bold">Manage Services</h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Add, edit, activate, deactivate, and feature services shown on the
            public website and service request form.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadServices()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-navy hover:bg-gold-600"
          >
            <Plus size={16} />
            New Service
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
              <BriefcaseBusiness size={18} />
              Services List
            </h2>

            <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy">
              {filteredServices.length}
            </span>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search services..."
            className="mb-5 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading services...</p>
          ) : filteredServices.length > 0 ? (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    selectedService?.id === service.id
                      ? "border-teal bg-teal-50"
                      : "border-gray-100 bg-white hover:border-navy/30"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">
                        {getServiceTitle(service)}
                      </p>

                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {service.slug}
                      </p>

                      {service.category ? (
                        <p className="mt-1 text-sm text-gray-500">
                          {service.category}
                        </p>
                      ) : null}
                    </div>

                    {service.is_featured ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-xs font-bold text-gold-600">
                        <Star size={12} />
                        Featured
                      </span>
                    ) : null}
                  </div>

                  {service.short_description ? (
                    <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-600">
                      {service.short_description}
                    </p>
                  ) : null}

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    <StatusPill
                      active={service.is_active}
                      label={service.is_active ? "Active" : "Inactive"}
                    />

                    <StatusPill
                      active={Boolean(service.show_price_label)}
                      label={
                        service.show_price_label ? "Price visible" : "No price"
                      }
                    />

                    {service.estimated_duration ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">
                        {service.estimated_duration}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(service)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(service)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {service.is_active ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                      {service.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(service)}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
              <BriefcaseBusiness
                className="mx-auto mb-3 text-gray-300"
                size={40}
              />

              <p className="font-semibold text-navy">No services found</p>

              <p className="mt-1 text-sm text-gray-500">
                Create your first service to show it on the public website.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Edit3 size={20} />
                {selectedService ? "Edit Service" : "Create Service"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                These details are used on the services page and service detail
                pages.
              </p>
            </div>

            {selectedService ? (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Service Title"
                value={form.title}
                onChange={handleTitleChange}
                placeholder="Accounting & Bookkeeping"
                required
              />

              <TextInput
                label="Slug"
                value={form.slug}
                onChange={(value) => updateForm("slug", createSlug(value))}
                placeholder="accounting-bookkeeping"
                required
              />

              <SelectInput
                label="Category"
                value={form.category}
                onChange={(value) => updateForm("category", value)}
                options={categoryOptions}
                placeholder="Select category"
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
                label="Estimated Duration"
                value={form.estimated_duration}
                onChange={(value) => updateForm("estimated_duration", value)}
                placeholder="Monthly / 3 working days / After review"
              />

              <TextInput
                label="Price Label"
                value={form.price_label}
                onChange={(value) => updateForm("price_label", value)}
                placeholder="Quotation after review"
              />
            </div>

            <TextArea
              label="Short Description"
              value={form.short_description}
              onChange={(value) => updateForm("short_description", value)}
              placeholder="Short text shown on service cards."
              rows={3}
              required
            />

            <TextArea
              label="Full Description"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
              placeholder="Detailed explanation shown on service detail page."
              rows={8}
            />

            <div className="rounded-xl border border-gray-100 bg-lightgray p-5">
              <h3 className="mb-4 text-sm font-bold text-navy">
                Website Visibility
              </h3>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <CheckboxField
                  label="Active"
                  description="Show this service publicly."
                  checked={form.is_active}
                  onChange={(value) => updateForm("is_active", value)}
                />

                <CheckboxField
                  label="Featured"
                  description="Show in homepage preview."
                  checked={form.is_featured}
                  onChange={(value) => updateForm("is_featured", value)}
                />

                <CheckboxField
                  label="Show Price"
                  description="Display price label publicly."
                  checked={form.show_price_label}
                  onChange={(value) => updateForm("show_price_label", value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-navy">
                Public Preview
              </h3>

              <div className="rounded-xl border border-gray-100 bg-lightgray p-5">
                {form.category ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">
                    {form.category}
                  </p>
                ) : null}

                <h4 className="mb-2 text-xl font-bold text-navy">
                  {form.title || "Service title"}
                </h4>

                <p className="text-sm leading-relaxed text-gray-600">
                  {form.short_description ||
                    "Short service description will appear here."}
                </p>

                {form.show_price_label && form.price_label ? (
                  <p className="mt-4 inline-flex rounded-lg bg-navy-50 px-3 py-2 text-sm font-semibold text-navy">
                    {form.price_label}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60 md:w-auto"
            >
              <Save size={16} />
              {isSaving
                ? "Saving..."
                : selectedService
                  ? "Update Service"
                  : "Create Service"}
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
    <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-100 bg-white p-4">
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

type StatusPillProps = {
  active: boolean;
  label: string;
};

function StatusPill({ active, label }: StatusPillProps) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[11px] font-bold ${
        active ? "bg-teal-50 text-teal" : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}
    </span>
  );
}