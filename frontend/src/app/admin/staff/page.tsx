"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type StaffMember = {
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
  created_at?: string;
  updated_at?: string;
};

type StaffListResponse = {
  items: StaffMember[];
};

type StaffForm = {
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

const EMPTY: StaffForm = {
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
  show_on_homepage: false,
  show_bio: true,
  show_education: true,
  show_work_experience: true,
  show_certifications: true,
  show_contact: false,
  display_order: 0,
  is_active: true,
};

function getStaffItems(data: StaffListResponse | StaffMember[]) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.items || [];
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toForm(staff: StaffMember): StaffForm {
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
    show_on_website: Boolean(staff.show_on_website),
    show_on_homepage: Boolean(staff.show_on_homepage),
    show_bio: Boolean(staff.show_bio),
    show_education: Boolean(staff.show_education),
    show_work_experience: Boolean(staff.show_work_experience),
    show_certifications: Boolean(staff.show_certifications),
    show_contact: Boolean(staff.show_contact),
    display_order: staff.display_order || 0,
    is_active: Boolean(staff.is_active),
  };
}

function buildPayload(form: StaffForm) {
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
    display_order: Number(form.display_order) || 0,
    is_active: form.is_active,
  };
}

async function deleteStaff(path: string) {
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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState<{
    open: boolean;
    editing?: StaffMember | null;
  }>({ open: false });

  const [form, setForm] = useState<StaffForm>(EMPTY);

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get<StaffListResponse | StaffMember[]>(
        "/admin/staff?page_size=100",
      );

      const items = getStaffItems(result.data).sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0),
      );

      setStaff(items);
    } catch {
      toast.error("Failed to load staff members.");
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

  const openEdit = (staffMember: StaffMember) => {
    setForm(toForm(staffMember));
    setModal({ open: true, editing: staffMember });
  };

  const closeModal = () => {
    setModal({ open: false });
    setForm(EMPTY);
  };

  const updateForm = <K extends keyof StaffForm>(
    key: K,
    value: StaffForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      full_name: value,
      slug: current.slug ? current.slug : createSlug(value),
    }));
  };

  const handleSave = async () => {
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

    setSaving(true);

    try {
      const payload = buildPayload(form);

      if (modal.editing) {
        await api.put(
          `/admin/staff/detail?id=${encodeURIComponent(modal.editing.id)}`,
          payload,
        );

        toast.success("Staff member updated.");
      } else {
        await api.post("/admin/staff", payload);
        toast.success("Staff member created.");
      }

      await load();
      closeModal();
    } catch {
      toast.error("Failed to save staff member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staffMember: StaffMember) => {
    if (!window.confirm(`Delete ${staffMember.full_name}?`)) return;

    try {
      await deleteStaff(
        `/admin/staff/detail?id=${encodeURIComponent(staffMember.id)}`,
      );

      toast.success("Staff member deleted.");
      await load();
    } catch {
      toast.error("Failed to delete staff member.");
    }
  };

  const handleToggleActive = async (staffMember: StaffMember) => {
    try {
      await api.patch(
        `/admin/staff/status?id=${encodeURIComponent(staffMember.id)}`,
        {
          is_active: !staffMember.is_active,
          show_on_website: staffMember.show_on_website,
          show_on_homepage: staffMember.show_on_homepage,
        },
      );

      toast.success(
        staffMember.is_active
          ? "Staff member deactivated."
          : "Staff member activated.",
      );

      await load();
    } catch {
      toast.error("Failed to update staff status.");
    }
  };

  const handleToggleWebsite = async (staffMember: StaffMember) => {
    try {
      await api.patch(
        `/admin/staff/status?id=${encodeURIComponent(staffMember.id)}`,
        {
          is_active: staffMember.is_active,
          show_on_website: !staffMember.show_on_website,
          show_on_homepage: staffMember.show_on_homepage,
        },
      );

      toast.success("Website visibility updated.");
      await load();
    } catch {
      toast.error("Failed to update website visibility.");
    }
  };

  const handleToggleHomepage = async (staffMember: StaffMember) => {
    try {
      await api.patch(
        `/admin/staff/status?id=${encodeURIComponent(staffMember.id)}`,
        {
          is_active: staffMember.is_active,
          show_on_website: staffMember.show_on_website,
          show_on_homepage: !staffMember.show_on_homepage,
        },
      );

      toast.success("Homepage visibility updated.");
      await load();
    } catch {
      toast.error("Failed to update homepage visibility.");
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Staff</h1>

          <p className="mt-1 text-sm text-gray-500">
            {staff.length} team member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No staff members yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-gray-100 bg-lightgray">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Staff
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Slug
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Order
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Active
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Website
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Homepage
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {staff.map((staffMember) => (
                  <tr key={staffMember.id} className="hover:bg-lightgray/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-full bg-navy-50">
                          {staffMember.photo_url ? (
                            <img
                              src={staffMember.photo_url}
                              alt={staffMember.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <UserRound size={20} className="text-navy" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-navy">
                            {staffMember.full_name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {staffMember.role_title}
                          </p>

                          {staffMember.short_description ? (
                            <p className="line-clamp-1 text-xs text-gray-400">
                              {staffMember.short_description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-gray-500">
                      {staffMember.slug}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {staffMember.display_order}
                    </td>

                    <td className="px-5 py-4">
                      <ToggleButton
                        active={staffMember.is_active}
                        activeLabel="Active"
                        inactiveLabel="Inactive"
                        onClick={() => handleToggleActive(staffMember)}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <VisibilityButton
                        visible={staffMember.show_on_website}
                        label={staffMember.show_on_website ? "Shown" : "Hidden"}
                        onClick={() => handleToggleWebsite(staffMember)}
                      />
                    </td>

                    <td className="px-5 py-4">
                      {staffMember.show_on_homepage ? (
                        <button
                          type="button"
                          onClick={() => handleToggleHomepage(staffMember)}
                          className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-1 text-xs font-bold text-gold-600"
                        >
                          <Star size={12} />
                          Featured
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleHomepage(staffMember)}
                          className="text-xs text-gray-400 hover:text-navy"
                        >
                          No
                        </button>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(staffMember)}
                          className="rounded p-1.5 text-gray-400 hover:text-navy"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(staffMember)}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-navy">
                {modal.editing ? "Edit Staff Member" : "Add Staff Member"}
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
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Full Name *"
                  value={form.full_name}
                  onChange={handleNameChange}
                />

                <TextInput
                  label="Slug *"
                  value={form.slug}
                  onChange={(value) => updateForm("slug", createSlug(value))}
                />

                <TextInput
                  label="Role Title *"
                  value={form.role_title}
                  onChange={(value) => updateForm("role_title", value)}
                />

                <TextInput
                  label="Display Order"
                  value={String(form.display_order)}
                  onChange={(value) =>
                    updateForm("display_order", Number(value) || 0)
                  }
                  type="number"
                />

                <TextInput
                  label="Email"
                  value={form.email}
                  onChange={(value) => updateForm("email", value)}
                />

                <TextInput
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => updateForm("phone", value)}
                />
              </div>

              <TextInput
                label="Photo URL"
                value={form.photo_url}
                onChange={(value) => updateForm("photo_url", value)}
              />

              <TextArea
                label="Short Description"
                value={form.short_description}
                onChange={(value) => updateForm("short_description", value)}
              />

              <TextArea
                label="Bio"
                value={form.bio}
                onChange={(value) => updateForm("bio", value)}
              />

              <TextArea
                label="Education Background"
                value={form.education_background}
                onChange={(value) =>
                  updateForm("education_background", value)
                }
              />

              <TextArea
                label="Work Experience"
                value={form.work_experience}
                onChange={(value) => updateForm("work_experience", value)}
              />

              <TextArea
                label="Professional Certifications"
                value={form.professional_certifications}
                onChange={(value) =>
                  updateForm("professional_certifications", value)
                }
              />

              <div className="grid gap-3 rounded-xl bg-lightgray p-4 md:grid-cols-2">
                <CheckboxField
                  label="Active"
                  checked={form.is_active}
                  onChange={(value) => updateForm("is_active", value)}
                />

                <CheckboxField
                  label="Show on website"
                  checked={form.show_on_website}
                  onChange={(value) => updateForm("show_on_website", value)}
                />

                <CheckboxField
                  label="Show on homepage"
                  checked={form.show_on_homepage}
                  onChange={(value) => updateForm("show_on_homepage", value)}
                />

                <CheckboxField
                  label="Show contact"
                  checked={form.show_contact}
                  onChange={(value) => updateForm("show_contact", value)}
                />

                <CheckboxField
                  label="Show bio"
                  checked={form.show_bio}
                  onChange={(value) => updateForm("show_bio", value)}
                />

                <CheckboxField
                  label="Show education"
                  checked={form.show_education}
                  onChange={(value) => updateForm("show_education", value)}
                />

                <CheckboxField
                  label="Show work experience"
                  checked={form.show_work_experience}
                  onChange={(value) =>
                    updateForm("show_work_experience", value)
                  }
                />

                <CheckboxField
                  label="Show certifications"
                  checked={form.show_certifications}
                  onChange={(value) =>
                    updateForm("show_certifications", value)
                  }
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
  type?: string;
};

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: TextInputProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
      </label>

      <input
        type={type}
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

type ToggleButtonProps = {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
};

function ToggleButton({
  active,
  activeLabel,
  inactiveLabel,
  onClick,
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium"
    >
      {active ? (
        <>
          <ToggleRight size={16} className="text-teal" />
          <span className="text-teal">{activeLabel}</span>
        </>
      ) : (
        <>
          <ToggleLeft size={16} className="text-gray-400" />
          <span className="text-gray-400">{inactiveLabel}</span>
        </>
      )}
    </button>
  );
}

type VisibilityButtonProps = {
  visible: boolean;
  label: string;
  onClick: () => void;
};

function VisibilityButton({ visible, label, onClick }: VisibilityButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium"
    >
      {visible ? (
        <>
          <Eye size={15} className="text-teal" />
          <span className="text-teal">{label}</span>
        </>
      ) : (
        <>
          <EyeOff size={15} className="text-gray-400" />
          <span className="text-gray-400">{label}</span>
        </>
      )}
    </button>
  );
}