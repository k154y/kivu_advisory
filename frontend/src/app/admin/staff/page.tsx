"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  Home,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type AdminStaffMember = {
  id: string;
  full_name: string;
  slug: string;
  role_title: string;
  short_description?: string;
  bio?: string;
  education_background?: string;
  work_experience?: string;
  professional_certifications?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  show_on_website: boolean;
  show_on_homepage: boolean;
  show_bio: boolean;
  show_education: boolean;
  show_work_experience: boolean;
  show_certifications: boolean;
  show_contact: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type StaffListResponse = {
  items: AdminStaffMember[];
};

type StaffFormState = {
  full_name: string;
  slug: string;
  role_title: string;
  short_description: string;
  bio: string;
  education_background: string;
  work_experience: string;
  professional_certifications: string;
  email: string;
  phone: string;
  photo_url: string;
  show_on_website: boolean;
  show_on_homepage: boolean;
  show_bio: boolean;
  show_education: boolean;
  show_work_experience: boolean;
  show_certifications: boolean;
  show_contact: boolean;
  display_order: number;
  is_active: boolean;
};

type ApiWithDelete = typeof api & {
  del?: <T>(path: string) => Promise<T>;
  delete?: <T>(path: string) => Promise<T>;
};

const emptyForm: StaffFormState = {
  full_name: "",
  slug: "",
  role_title: "",
  short_description: "",
  bio: "",
  education_background: "",
  work_experience: "",
  professional_certifications: "",
  email: "",
  phone: "",
  photo_url: "",
  show_on_website: true,
  show_on_homepage: true,
  show_bio: true,
  show_education: true,
  show_work_experience: true,
  show_certifications: true,
  show_contact: true,
  display_order: 1,
  is_active: true,
};

function getStaffItems(data: StaffListResponse | AdminStaffMember[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function staffToForm(staff: AdminStaffMember): StaffFormState {
  return {
    full_name: staff.full_name || "",
    slug: staff.slug || "",
    role_title: staff.role_title || "",
    short_description: staff.short_description || "",
    bio: staff.bio || "",
    education_background: staff.education_background || "",
    work_experience: staff.work_experience || "",
    professional_certifications: staff.professional_certifications || "",
    email: staff.email || "",
    phone: staff.phone || "",
    photo_url: staff.photo_url || "",
    show_on_website: staff.show_on_website,
    show_on_homepage: staff.show_on_homepage,
    show_bio: staff.show_bio,
    show_education: staff.show_education,
    show_work_experience: staff.show_work_experience,
    show_certifications: staff.show_certifications,
    show_contact: staff.show_contact,
    display_order: staff.display_order || 1,
    is_active: staff.is_active,
  };
}

function buildPayload(form: StaffFormState) {
  return {
    full_name: form.full_name.trim(),
    slug: form.slug.trim(),
    role_title: form.role_title.trim(),
    short_description: form.short_description.trim(),
    bio: form.bio.trim(),
    education_background: form.education_background.trim(),
    work_experience: form.work_experience.trim(),
    professional_certifications: form.professional_certifications.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    photo_url: form.photo_url.trim(),
    show_on_website: form.show_on_website,
    show_on_homepage: form.show_on_homepage,
    show_bio: form.show_bio,
    show_education: form.show_education,
    show_work_experience: form.show_work_experience,
    show_certifications: form.show_certifications,
    show_contact: form.show_contact,
    display_order: Number(form.display_order) || 1,
    is_active: form.is_active,
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

async function deleteStaffRequest(path: string) {
  const apiClient = api as ApiWithDelete;

  if (apiClient.del) {
    return apiClient.del(path);
  }

  if (apiClient.delete) {
    return apiClient.delete(path);
  }

  throw new Error("API delete method is not available.");
}

export default function AdminStaffPage() {
  const [staffMembers, setStaffMembers] = useState<AdminStaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<AdminStaffMember | null>(
    null,
  );
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const filteredStaff = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return [...staffMembers]
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }

        return a.full_name.localeCompare(b.full_name);
      })
      .filter((staff) => {
        if (!searchValue) return true;

        return (
          staff.full_name.toLowerCase().includes(searchValue) ||
          staff.slug.toLowerCase().includes(searchValue) ||
          staff.role_title.toLowerCase().includes(searchValue) ||
          (staff.email || "").toLowerCase().includes(searchValue)
        );
      });
  }, [search, staffMembers]);

  const loadStaff = async () => {
    setIsLoading(true);

    try {
      const result = await api.get<StaffListResponse | AdminStaffMember[]>(
        "/admin/staff?page_size=100",
      );

      setStaffMembers(getStaffItems(result.data));
    } catch {
      toast.error("Failed to load staff members.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const updateForm = <K extends keyof StaffFormState>(
    field: K,
    value: StaffFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const startCreate = () => {
    setSelectedStaff(null);
    setForm(emptyForm);
  };

  const startEdit = (staff: AdminStaffMember) => {
    setSelectedStaff(staff);
    setForm(staffToForm(staff));
  };

  const handleFullNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      full_name: value,
      slug:
        current.slug && selectedStaff
          ? current.slug
          : current.slug
            ? current.slug
            : createSlug(value),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (!form.slug.trim()) {
      toast.error("Slug is required.");
      return;
    }

    if (!form.role_title.trim()) {
      toast.error("Role title is required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload(form);

      if (selectedStaff) {
        await api.put(
          `/admin/staff/detail?id=${encodeURIComponent(selectedStaff.id)}`,
          payload,
        );

        toast.success("Staff member updated.");
      } else {
        await api.post("/admin/staff", payload);
        toast.success("Staff member created.");
      }

      setSelectedStaff(null);
      setForm(emptyForm);
      await loadStaff();
    } catch {
      toast.error(
        selectedStaff
          ? "Failed to update staff member."
          : "Failed to create staff member.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (
    staff: AdminStaffMember,
    field: "is_active" | "show_on_website" | "show_on_homepage",
  ) => {
    try {
      await api.patch(
        `/admin/staff/status?id=${encodeURIComponent(staff.id)}`,
        {
          is_active:
            field === "is_active" ? !staff.is_active : staff.is_active,
          show_on_website:
            field === "show_on_website"
              ? !staff.show_on_website
              : staff.show_on_website,
          show_on_homepage:
            field === "show_on_homepage"
              ? !staff.show_on_homepage
              : staff.show_on_homepage,
        },
      );

      toast.success("Staff visibility updated.");
      await loadStaff();
    } catch {
      toast.error("Failed to update staff visibility.");
    }
  };

  const handleDelete = async (staff: AdminStaffMember) => {
    const confirmed = window.confirm(
      `Delete ${staff.full_name}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteStaffRequest(
        `/admin/staff/detail?id=${encodeURIComponent(staff.id)}`,
      );

      toast.success("Staff member deleted.");

      if (selectedStaff?.id === staff.id) {
        setSelectedStaff(null);
        setForm(emptyForm);
      }

      await loadStaff();
    } catch {
      toast.error("Failed to delete staff member.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">
            Website Staff
          </p>

          <h1 className="text-2xl font-bold">Manage Staff Members</h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
            Add staff profiles for the public website, choose who appears on the
            homepage, and control what profile sections visitors can see.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadStaff()}
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
            New Staff
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
              <UserRound size={18} />
              Staff List
            </h2>

            <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy">
              {filteredStaff.length}
            </span>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff..."
            className="mb-5 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
          />

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading staff members...</p>
          ) : filteredStaff.length > 0 ? (
            <div className="space-y-3">
              {filteredStaff.map((staff) => (
                <div
                  key={staff.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    selectedStaff?.id === staff.id
                      ? "border-teal bg-teal-50"
                      : "border-gray-100 bg-white hover:border-navy/30"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-navy-50">
                      {staff.photo_url ? (
                        <img
                          src={staff.photo_url}
                          alt={staff.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserRound size={24} className="text-navy/40" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-navy">
                        {staff.full_name}
                      </p>

                      <p className="truncate text-sm text-gray-500">
                        {staff.role_title}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusPill
                          active={staff.is_active}
                          label={staff.is_active ? "Active" : "Inactive"}
                        />

                        <StatusPill
                          active={staff.show_on_website}
                          label={
                            staff.show_on_website
                              ? "Website"
                              : "Hidden website"
                          }
                        />

                        <StatusPill
                          active={staff.show_on_homepage}
                          label={
                            staff.show_on_homepage
                              ? "Homepage"
                              : "Not homepage"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(staff)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff, "is_active")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {staff.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      {staff.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleStatus(staff, "show_on_website")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Globe2 size={14} />
                      Website
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleStatus(staff, "show_on_homepage")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Home size={14} />
                      Homepage
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(staff)}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete Staff
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
              <UserRound className="mx-auto mb-3 text-gray-300" size={40} />

              <p className="font-semibold text-navy">No staff found</p>

              <p className="mt-1 text-sm text-gray-500">
                Create your first staff profile to show it on the public
                website.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Edit3 size={20} />
                {selectedStaff ? "Edit Staff Member" : "Create Staff Member"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                These details appear on the public staff page and staff profile
                pages.
              </p>
            </div>

            {selectedStaff ? (
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
                label="Full Name"
                value={form.full_name}
                onChange={handleFullNameChange}
                placeholder="John Doe"
                required
              />

              <TextInput
                label="Slug"
                value={form.slug}
                onChange={(value) => updateForm("slug", createSlug(value))}
                placeholder="john-doe"
                required
              />

              <TextInput
                label="Role Title"
                value={form.role_title}
                onChange={(value) => updateForm("role_title", value)}
                placeholder="Senior Accounting Advisor"
                required
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
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => updateForm("email", value)}
                placeholder="staff@kivuadvisory.com"
              />

              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(value) => updateForm("phone", value)}
                placeholder="0786196355"
              />
            </div>

            <TextInput
              label="Photo URL"
              value={form.photo_url}
              onChange={(value) => updateForm("photo_url", value)}
              placeholder="https://..."
            />

            <TextArea
              label="Short Description"
              value={form.short_description}
              onChange={(value) => updateForm("short_description", value)}
              placeholder="Short text shown on staff cards."
              rows={3}
            />

            <TextArea
              label="Bio"
              value={form.bio}
              onChange={(value) => updateForm("bio", value)}
              placeholder="Professional biography."
              rows={5}
            />

            <div className="grid gap-5 lg:grid-cols-3">
              <TextArea
                label="Education Background"
                value={form.education_background}
                onChange={(value) =>
                  updateForm("education_background", value)
                }
                placeholder="Degrees, training, education background."
                rows={5}
              />

              <TextArea
                label="Work Experience"
                value={form.work_experience}
                onChange={(value) => updateForm("work_experience", value)}
                placeholder="Professional experience."
                rows={5}
              />

              <TextArea
                label="Professional Certifications"
                value={form.professional_certifications}
                onChange={(value) =>
                  updateForm("professional_certifications", value)
                }
                placeholder="Certifications and professional training."
                rows={5}
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-lightgray p-5">
              <h3 className="mb-4 text-sm font-bold text-navy">
                Website Visibility
              </h3>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <CheckboxField
                  label="Active"
                  description="Staff member is active in the system."
                  checked={form.is_active}
                  onChange={(value) => updateForm("is_active", value)}
                />

                <CheckboxField
                  label="Show on Website"
                  description="Visible on public staff pages."
                  checked={form.show_on_website}
                  onChange={(value) => updateForm("show_on_website", value)}
                />

                <CheckboxField
                  label="Show on Homepage"
                  description="Visible in homepage staff section."
                  checked={form.show_on_homepage}
                  onChange={(value) => updateForm("show_on_homepage", value)}
                />

                <CheckboxField
                  label="Show Bio"
                  description="Display bio on profile page."
                  checked={form.show_bio}
                  onChange={(value) => updateForm("show_bio", value)}
                />

                <CheckboxField
                  label="Show Education"
                  description="Display education section."
                  checked={form.show_education}
                  onChange={(value) => updateForm("show_education", value)}
                />

                <CheckboxField
                  label="Show Work Experience"
                  description="Display experience section."
                  checked={form.show_work_experience}
                  onChange={(value) =>
                    updateForm("show_work_experience", value)
                  }
                />

                <CheckboxField
                  label="Show Certifications"
                  description="Display certifications section."
                  checked={form.show_certifications}
                  onChange={(value) =>
                    updateForm("show_certifications", value)
                  }
                />

                <CheckboxField
                  label="Show Contact"
                  description="Display email and phone."
                  checked={form.show_contact}
                  onChange={(value) => updateForm("show_contact", value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-navy">
                Public Preview
              </h3>

              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-50">
                  {form.photo_url ? (
                    <img
                      src={form.photo_url}
                      alt={form.full_name || "Staff preview"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserRound size={32} className="text-navy/40" />
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-lg font-bold text-navy">
                    {form.full_name || "Staff full name"}
                  </p>

                  <p className="font-semibold text-teal">
                    {form.role_title || "Role title"}
                  </p>

                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
                    {form.short_description ||
                      "Short staff description will appear here."}
                  </p>
                </div>
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
                : selectedStaff
                  ? "Update Staff"
                  : "Create Staff"}
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