"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  Home,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

type FieldType = "text" | "textarea";

type ContentField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

type ContentSection = {
  key: string;
  contentKey: string;
  label: string;
  description: string;
  icon: "home" | "about" | "file";
  displayOrder: number;
  fields: ContentField[];
};

type ContentItem = {
  id: string;
  content_key: string;
  slug?: string;
  title?: string;
  summary?: string;
  body?: string;
  image_url?: string;
  button_label?: string;
  button_url?: string;
  content_type?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
};

type ContentFormData = Record<string, string>;
type ContentMap = Record<string, ContentFormData>;
type ItemMap = Record<string, ContentItem>;

const SECTIONS: ContentSection[] = [
  {
    key: "homeHero",
    contentKey: "home_hero",
    label: "Homepage Hero",
    description: "Main homepage headline, subtitle, image, and button.",
    icon: "home",
    displayOrder: 1,
    fields: [
      {
        key: "title",
        label: "Hero Title",
        type: "text",
        placeholder: "Accounting, Tax and Business Advisory Services You Can Trust",
      },
      {
        key: "summary",
        label: "Hero Subtitle",
        type: "textarea",
        placeholder:
          "We help businesses stay compliant, organized, and financially informed.",
      },
      {
        key: "image_url",
        label: "Hero Image URL",
        type: "text",
        placeholder: "https://example.com/hero-image.jpg",
      },
      {
        key: "button_label",
        label: "Primary Button Text",
        type: "text",
        placeholder: "Request a Service",
      },
      {
        key: "button_url",
        label: "Primary Button URL",
        type: "text",
        placeholder: "/request-service",
      },
    ],
  },
  {
    key: "aboutIntro",
    contentKey: "about_intro",
    label: "About Intro",
    description: "Main title and introduction shown on the About page.",
    icon: "about",
    displayOrder: 2,
    fields: [
      {
        key: "title",
        label: "About Page Title",
        type: "text",
        placeholder:
          "Professional accounting, tax, audit, and business advisory support.",
      },
      {
        key: "summary",
        label: "Intro Summary",
        type: "textarea",
        placeholder:
          "Kivu Advisory supports businesses, institutions, entrepreneurs, and organizations...",
      },
      {
        key: "body",
        label: "Intro Body",
        type: "textarea",
        placeholder: "Write more about who Kivu Advisory is...",
      },
    ],
  },
  {
    key: "aboutMission",
    contentKey: "about_mission",
    label: "About Mission",
    description: "Mission statement shown on the About page.",
    icon: "file",
    displayOrder: 3,
    fields: [
      {
        key: "title",
        label: "Mission Title",
        type: "text",
        placeholder: "Our Mission",
      },
      {
        key: "body",
        label: "Mission Text",
        type: "textarea",
        placeholder: "Write the mission statement...",
      },
    ],
  },
  {
    key: "aboutValues",
    contentKey: "about_values",
    label: "About Values",
    description: "Comma-separated or line-separated values shown on About page.",
    icon: "file",
    displayOrder: 4,
    fields: [
      {
        key: "title",
        label: "Values Title",
        type: "text",
        placeholder: "What Clients Can Expect",
      },
      {
        key: "body",
        label: "Values",
        type: "textarea",
        placeholder:
          "Confidential handling of client information, Clear accounting and tax support, Professional reporting and documentation",
      },
    ],
  },
  {
    key: "contactIntro",
    contentKey: "contact_intro",
    label: "Contact Intro",
    description: "Main title and introduction shown on the Contact page.",
    icon: "file",
    displayOrder: 20,
    fields: [
      {
        key: "title",
        label: "Contact Page Title",
        type: "text",
        placeholder: "Contact Us",
      },
      {
        key: "summary",
        label: "Hero Subtitle",
        type: "textarea",
        placeholder:
          "We are ready to answer your questions and help you find the right service.",
      },
      {
        key: "body",
        label: "Contact Info Intro",
        type: "textarea",
        placeholder:
          "You can reach us by phone, WhatsApp, or email. You can also visit our office during working hours.",
      },
    ],
  },
  {
    key: "contactPhone",
    contentKey: "contact_phone",
    label: "Contact Phone",
    description: "Phone number shown on the Contact page.",
    icon: "file",
    displayOrder: 21,
    fields: [
      {
        key: "title",
        label: "Label",
        type: "text",
        placeholder: "Phone",
      },
      {
        key: "body",
        label: "Phone Number",
        type: "text",
        placeholder: "0786196355",
      },
      {
        key: "button_url",
        label: "Phone Link",
        type: "text",
        placeholder: "tel:0786196355",
      },
    ],
  },
  {
    key: "contactWhatsapp",
    contentKey: "contact_whatsapp",
    label: "Contact WhatsApp",
    description: "WhatsApp contact shown on the Contact page.",
    icon: "file",
    displayOrder: 22,
    fields: [
      {
        key: "title",
        label: "Label",
        type: "text",
        placeholder: "WhatsApp",
      },
      {
        key: "body",
        label: "Display Text",
        type: "text",
        placeholder: "0786196355 — Click to message",
      },
      {
        key: "button_url",
        label: "WhatsApp Link",
        type: "text",
        placeholder: "https://wa.me/250786196355",
      },
    ],
  },
  {
    key: "contactEmail",
    contentKey: "contact_email",
    label: "Contact Email",
    description: "Email address shown on the Contact page.",
    icon: "file",
    displayOrder: 23,
    fields: [
      {
        key: "title",
        label: "Label",
        type: "text",
        placeholder: "Email",
      },
      {
        key: "body",
        label: "Email Address",
        type: "text",
        placeholder: "info@kivuadvisory.com",
      },
      {
        key: "button_url",
        label: "Email Link",
        type: "text",
        placeholder: "mailto:info@kivuadvisory.com",
      },
    ],
  },
  {
    key: "contactLocation",
    contentKey: "contact_location",
    label: "Contact Location",
    description: "Office location shown on the Contact page.",
    icon: "file",
    displayOrder: 24,
    fields: [
      {
        key: "title",
        label: "Label",
        type: "text",
        placeholder: "Office Location",
      },
      {
        key: "body",
        label: "Location",
        type: "textarea",
        placeholder: "Kigali, Rwanda",
      },
    ],
  },
  {
    key: "contactHours",
    contentKey: "contact_hours",
    label: "Contact Hours",
    description: "Working hours shown on the Contact page.",
    icon: "file",
    displayOrder: 25,
    fields: [
      {
        key: "title",
        label: "Label",
        type: "text",
        placeholder: "Working Hours",
      },
      {
        key: "body",
        label: "Working Hours",
        type: "textarea",
        placeholder:
          "Monday – Friday: 8:00 AM – 6:00 PM\nSaturday: 9:00 AM – 1:00 PM\nClosed on Sundays and public holidays",
      },
    ],
  },
  {
    key: "contactWhatsappBox",
    contentKey: "contact_whatsapp_box",
    label: "Contact WhatsApp Box",
    description: "Highlighted WhatsApp call-to-action box on Contact page.",
    icon: "file",
    displayOrder: 26,
    fields: [
      {
        key: "title",
        label: "Box Title",
        type: "text",
        placeholder: "Prefer WhatsApp?",
      },
      {
        key: "summary",
        label: "Box Text",
        type: "textarea",
        placeholder:
          "For quick responses, message us directly on WhatsApp. We usually respond within a few hours during working hours.",
      },
      {
        key: "button_label",
        label: "Button Text",
        type: "text",
        placeholder: "Message on WhatsApp",
      },
      {
        key: "button_url",
        label: "Button URL",
        type: "text",
        placeholder: "https://wa.me/250786196355",
      },
    ],
  },
];

function getSectionIcon(icon: ContentSection["icon"]) {
  if (icon === "home") return Home;
  if (icon === "about") return Building2;
  return FileText;
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getContentItems(response: unknown): ContentItem[] {
  if (Array.isArray(response)) return response as ContentItem[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: ContentItem[];
    data?: ContentItem[] | { items?: ContentItem[] };
  };

  if (Array.isArray(objectResponse.items)) return objectResponse.items;
  if (Array.isArray(objectResponse.data)) return objectResponse.data;

  if (
    objectResponse.data &&
    !Array.isArray(objectResponse.data) &&
    Array.isArray(objectResponse.data.items)
  ) {
    return objectResponse.data.items;
  }

  return [];
}

function itemToFormData(item: ContentItem): ContentFormData {
  return {
    title: item.title || "",
    summary: item.summary || "",
    body: item.body || "",
    image_url: item.image_url || "",
    button_label: item.button_label || "",
    button_url: item.button_url || "",
  };
}

function buildSlug(contentKey: string) {
  return contentKey.replaceAll("_", "-");
}

function buildPayload(
  section: ContentSection,
  data: ContentFormData,
): Record<string, unknown> {
  return {
    content_key: section.contentKey,
    slug: buildSlug(section.contentKey),
    title: data.title || "",
    summary: data.summary || "",
    body: data.body || "",
    image_url: data.image_url || "",
    button_label: data.button_label || "",
    button_url: data.button_url || "",
    content_type: "section",
    is_active: true,
    display_order: section.displayOrder,
  };
}

export default function AdminContentPage() {
  const [activeSectionKey, setActiveSectionKey] = useState(SECTIONS[0].key);
  const [contentMap, setContentMap] = useState<ContentMap>({});
  const [itemMap, setItemMap] = useState<ItemMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const section = useMemo(() => {
    return (
      SECTIONS.find((item) => item.key === activeSectionKey) || SECTIONS[0]
    );
  }, [activeSectionKey]);

  const sectionData = contentMap[section.key] || {};

  const load = async () => {
    setLoading(true);

    try {
      const result = await api.get<unknown>(
        "/admin/content?content_type=section&page_size=200",
      );

      const items = getContentItems(result.data);

      const nextContentMap: ContentMap = {};
      const nextItemMap: ItemMap = {};

      SECTIONS.forEach((contentSection) => {
        const item = items.find(
          (contentItem) =>
            contentItem.content_key === contentSection.contentKey,
        );

        if (item) {
          nextContentMap[contentSection.key] = itemToFormData(item);
          nextItemMap[contentSection.key] = item;
        }
      });

      setContentMap(nextContentMap);
      setItemMap(nextItemMap);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to load website content."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = (key: string, value: string) => {
    setContentMap((current) => ({
      ...current,
      [section.key]: {
        ...(current[section.key] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const existingItem = itemMap[section.key];
      const payload = buildPayload(section, sectionData);

      if (existingItem?.id) {
        await api.put(
          `/admin/content/detail?id=${encodeURIComponent(existingItem.id)}`,
          payload,
        );
      } else {
        await api.post("/admin/content", payload);
      }

      toast.success(`${section.label} updated successfully.`);
      await load();
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Failed to save website content."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Website Content</h1>
        <p className="mt-1 text-sm text-gray-500">
          Edit public website content without touching code.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="h-fit rounded-xl border border-gray-100 bg-white p-2">
          {SECTIONS.map((item) => {
            const Icon = getSectionIcon(item.icon);
            const active = activeSectionKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSectionKey(item.key)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? "bg-navy text-white"
                    : "text-gray-600 hover:bg-lightgray hover:text-navy"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-navy">{section.label}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {section.description}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Content key: {section.contentKey}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-lightgray hover:text-navy"
              title="Refresh content"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-5">
              {section.fields.map((field) => (
                <div key={field.key} className="animate-pulse">
                  <div className="mb-2 h-4 w-40 rounded bg-gray-200" />
                  <div className="h-11 rounded-lg bg-gray-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal">
                    {field.label}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      rows={5}
                      value={sectionData[field.key] || ""}
                      onChange={(event) =>
                        updateField(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/30"
                    />
                  ) : (
                    <input
                      type="text"
                      value={sectionData[field.key] || ""}
                      onChange={(event) =>
                        updateField(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/30"
                    />
                  )}
                </div>
              ))}

              <div className="border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}