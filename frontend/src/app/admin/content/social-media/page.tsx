"use client";

import { useEffect, useState } from "react";
import {
  Link as LinkIcon,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon_name?: string;
  show_in_footer?: boolean;
  show_in_contact_page?: boolean;
  display_order?: number;
  order_index?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type SocialLinksResponse = {
  items?: SocialLink[];
  data?: {
    items?: SocialLink[];
  };
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type SocialLinkForm = {
  platform: string;
  label: string;
  url: string;
  icon_name: string;
  show_in_footer: boolean;
  show_in_contact_page: boolean;
  display_order: number;
};

type SocialLinkPayload = {
  platform: string;
  label: string;
  url: string;
  icon_name: string;
  is_active: boolean;
  show_in_footer: boolean;
  show_in_contact_page: boolean;
  display_order: number;
};

type ApiWithDelete = typeof api & {
  del?: <T>(path: string) => Promise<T>;
  delete?: <T>(path: string) => Promise<T>;
};

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { value: "facebook", label: "Facebook", icon: "facebook" },
  { value: "instagram", label: "Instagram", icon: "instagram" },
  { value: "twitter", label: "Twitter", icon: "twitter" },
  { value: "youtube", label: "YouTube", icon: "youtube" },
  { value: "tiktok", label: "TikTok", icon: "tiktok" },
  { value: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { value: "telegram", label: "Telegram", icon: "telegram" },
];

const EMPTY_FORM: SocialLinkForm = {
  platform: "",
  label: "",
  url: "",
  icon_name: "",
  show_in_footer: true,
  show_in_contact_page: true,
  display_order: 0,
};

function getSocialLinks(response: unknown): SocialLink[] {
  if (Array.isArray(response)) {
    return response as SocialLink[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: SocialLink[];
    data?: {
      items?: SocialLink[];
    } | SocialLink[];
  };

  if (Array.isArray(objectResponse.items)) {
    return objectResponse.items;
  }

  if (Array.isArray(objectResponse.data)) {
    return objectResponse.data;
  }

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function getDisplayOrder(link: SocialLink) {
  return link.display_order ?? link.order_index ?? 0;
}

function getPlatformLabel(value: string) {
  return PLATFORMS.find((platform) => platform.value === value)?.label || value;
}

function buildPayload(
  form: SocialLinkForm,
  isActive: boolean,
): SocialLinkPayload {
  return {
    platform: form.platform.trim().toLowerCase(),
    label: form.label.trim(),
    url: form.url.trim(),
    icon_name: form.icon_name.trim(),
    is_active: isActive,
    show_in_footer: form.show_in_footer,
    show_in_contact_page: form.show_in_contact_page,
    display_order: Number(form.display_order) || 0,
  };
}

async function deleteSocialLink(path: string) {
  const apiClient = api as ApiWithDelete;

  if (apiClient.del) {
    return apiClient.del(path);
  }

  if (apiClient.delete) {
    return apiClient.delete(path);
  }

  throw new Error("API delete method is not available.");
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function AdminSocialLinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SocialLinkForm>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get<
        SocialLinksResponse | SocialLink[] | ApiEnvelope<SocialLinksResponse | SocialLink[]>
      >("/admin/social-links");

      const items = getSocialLinks(result.data).sort(
        (a, b) => getDisplayOrder(a) - getDisplayOrder(b),
      );

      setLinks(items);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to load social links."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);

    setForm({
      ...EMPTY_FORM,
      display_order: links.length,
    });

    setModalOpen(true);
  };

  const openEdit = (link: SocialLink) => {
    setEditing(link);

    setForm({
      platform: link.platform,
      label: link.label || getPlatformLabel(link.platform),
      url: link.url,
      icon_name: link.icon_name || link.platform,
      show_in_footer: link.show_in_footer ?? true,
      show_in_contact_page: link.show_in_contact_page ?? true,
      display_order: getDisplayOrder(link),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handlePlatformChange = (value: string) => {
    const selected = PLATFORMS.find((platform) => platform.value === value);

    setForm((current) => ({
      ...current,
      platform: value,
      label: current.label || selected?.label || value,
      icon_name: current.icon_name || selected?.icon || value,
    }));
  };

  const handleSave = async () => {
    if (!form.platform.trim()) {
      toast.error("Platform is required.");
      return;
    }

    if (!form.label.trim()) {
      toast.error("Label is required.");
      return;
    }

    if (!form.url.trim()) {
      toast.error("URL is required.");
      return;
    }

    const duplicatePlatform = links.some((link) => {
      const samePlatform =
        link.platform.trim().toLowerCase() === form.platform.trim().toLowerCase();

      if (!samePlatform) return false;

      if (editing && link.id === editing.id) return false;

      return true;
    });

    if (duplicatePlatform) {
      toast.error(
        "This platform already exists. Please edit the existing link instead.",
      );
      return;
    }

    setSaving(true);

    try {
      const payload = buildPayload(form, editing ? editing.is_active : true);

      if (editing) {
        await api.put(
          `/admin/social-links/detail?id=${encodeURIComponent(editing.id)}`,
          payload,
        );

        toast.success("Social link updated.");
      } else {
        await api.post("/admin/social-links", payload);
        toast.success("Social link added.");
      }

      await load();
      closeModal();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to save social link."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (link: SocialLink) => {
    if (!window.confirm(`Delete ${link.label || link.platform} link?`)) return;

    try {
      await deleteSocialLink(
        `/admin/social-links/detail?id=${encodeURIComponent(link.id)}`,
      );

      toast.success("Social link deleted.");
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to delete social link."));
    }
  };

  const handleToggle = async (link: SocialLink) => {
    try {
      await api.patch(
        `/admin/social-links/status?id=${encodeURIComponent(link.id)}`,
        {
          is_active: !link.is_active,
          show_in_footer: link.show_in_footer ?? true,
          show_in_contact_page: link.show_in_contact_page ?? true,
        },
      );

      toast.success(link.is_active ? "Link deactivated." : "Link activated.");
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Failed to update link status."));
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Social Links</h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your social media presence.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        ) : links.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5">
              <LinkIcon size={18} className="text-navy" />
            </div>

            <p className="text-sm font-semibold text-navy">
              No social links yet
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Add LinkedIn, Facebook, WhatsApp, or other website footer links.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {links.map((link) => (
              <div
                key={link.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  !link.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/5">
                  <LinkIcon size={15} className="text-navy" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy">
                    {link.label || getPlatformLabel(link.platform)}
                  </p>

                  <p className="truncate text-xs text-gray-400">{link.url}</p>

                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Platform: {link.platform} · Order: {getDisplayOrder(link)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        link.is_active
                          ? "bg-teal-50 text-teal"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {link.is_active ? "Active" : "Inactive"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        link.show_in_footer
                          ? "bg-gold-50 text-gold-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {link.show_in_footer ? "Footer" : "Hidden footer"}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        link.show_in_contact_page
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {link.show_in_contact_page
                        ? "Contact page"
                        : "Hidden contact"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(link)}
                    className="rounded p-1.5 text-gray-400 hover:text-navy"
                    title={link.is_active ? "Deactivate" : "Activate"}
                  >
                    {link.is_active ? (
                      <ToggleRight size={18} className="text-teal" />
                    ) : (
                      <ToggleLeft size={18} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(link)}
                    className="rounded p-1.5 text-gray-400 hover:text-navy"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(link)}
                    className="rounded p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Active links appear in the website footer when “Show in website footer”
        is checked.
      </p>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-navy">
                {editing ? "Edit Social Link" : "Add Social Link"}
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Platform *
                </label>

                <select
                  value={form.platform}
                  onChange={(event) => handlePlatformChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="">Select platform...</option>

                  {PLATFORMS.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Label *
                </label>

                <input
                  type="text"
                  value={form.label}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="LinkedIn"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  URL *
                </label>

                <input
                  type="url"
                  value={form.url}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                  placeholder="https://linkedin.com/company/kivu-advisory"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Icon Name
                </label>

                <input
                  type="text"
                  value={form.icon_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      icon_name: event.target.value,
                    }))
                  }
                  placeholder="linkedin"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-charcoal">
                  Display Order
                </label>

                <input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      display_order: Number(event.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div className="space-y-3 rounded-xl bg-lightgray p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.show_in_footer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        show_in_footer: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
                  />
                  Show in website footer
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
                  <input
                    type="checkbox"
                    checked={form.show_in_contact_page}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        show_in_contact_page: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
                  />
                  Show on contact page
                </label>
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