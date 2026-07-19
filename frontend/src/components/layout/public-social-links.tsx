"use client";

import { useEffect, useState } from "react";
import { Link as LinkIcon } from "lucide-react";

import { api } from "@/lib/api";

type PublicSocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon_name?: string;
  display_order?: number;
  is_active?: boolean;
  show_in_footer?: boolean;
  show_in_contact_page?: boolean;
};

type PublicSocialLinksProps = {
  location?: "footer" | "contact";
};

function getSocialLinks(response: unknown): PublicSocialLink[] {
  if (Array.isArray(response)) {
    return response as PublicSocialLink[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const objectResponse = response as {
    items?: PublicSocialLink[];
    data?: {
      items?: PublicSocialLink[];
    } | PublicSocialLink[];
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

function BrandIcon({
  platform,
  iconName,
}: {
  platform: string;
  iconName?: string;
}) {
  const value = `${iconName || platform}`.toLowerCase();

  if (value.includes("linkedin")) return <LinkedInIcon />;
  if (value.includes("facebook")) return <FacebookIcon />;
  if (value.includes("instagram")) return <InstagramIcon />;
  if (value.includes("twitter") || value === "x") return <XIcon />;
  if (value.includes("youtube")) return <YouTubeIcon />;
  if (value.includes("tiktok")) return <TikTokIcon />;
  if (value.includes("whatsapp")) return <WhatsAppIcon />;
  if (value.includes("telegram")) return <TelegramIcon />;

  return <LinkIcon size={17} />;
}

export function PublicSocialLinks({ location = "footer" }: PublicSocialLinksProps) {
  const [links, setLinks] = useState<PublicSocialLink[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await api.get<unknown>("/social-links");

        const items = getSocialLinks(result.data)
          .filter((link) => link.is_active !== false)
          .filter((link) => {
            if (location === "contact") {
              return link.show_in_contact_page !== false;
            }

            return link.show_in_footer !== false;
          })
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        if (!cancelled) {
          setLinks(items);
        }
      } catch {
        if (!cancelled) {
          setLinks([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [location]);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label || link.platform}
          title={link.label || link.platform}
          className={
            location === "contact"
              ? "flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal transition-colors hover:bg-teal hover:text-white"
              : "flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-gold hover:text-navy"
          }
        >
          <BrandIcon platform={link.platform} iconName={link.icon_name} />
        </a>
      ))}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.37 8h4.25v14H.37V8ZM8.13 8h4.07v1.91h.06c.57-1.08 1.96-2.22 4.03-2.22 4.31 0 5.11 2.84 5.11 6.53V22h-4.25v-6.9c0-1.65-.03-3.77-2.3-3.77-2.3 0-2.65 1.8-2.65 3.65V22H8.13V8Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      <path d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.03 3.68 9.2 8.49 9.94v-7.03H7.96v-2.91h2.53V9.84c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.77l-.44 2.91H13.6V22c4.81-.74 8.4-4.91 8.4-9.94Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      <path d="M7.8 2h8.4A5.81 5.81 0 0 1 22 7.8v8.4a5.81 5.81 0 0 1-5.8 5.8H7.8A5.81 5.81 0 0 1 2 16.2V7.8A5.81 5.81 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      <path d="M18.9 2H22l-6.8 7.78L23.2 22h-6.27l-4.91-6.42L6.4 22H3.3l7.28-8.32L2.9 2h6.43l4.44 5.87L18.9 2Zm-1.1 17.85h1.72L8.38 4.04H6.54L17.8 19.85Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.5v-7l6.27 3.5L9.6 15.5Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
      <path d="M16.6 2c.28 2.39 1.62 3.82 4 3.98v3.37c-1.38.13-2.59-.32-3.9-1.15v6.3c0 8-8.72 10.5-12.23 4.76-2.25-3.68-.87-10.15 6.35-10.4v3.56c-.45.07-.93.18-1.37.33-1.32.45-2.07 1.29-1.86 2.78.4 2.85 5.63 3.7 5.2-1.88V2h3.81Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.79h-.01a9.88 9.88 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26C2.17 6.45 6.6 2.02 12.06 2.02a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M9.04 15.53 8.67 20.8c.53 0 .76-.23 1.04-.5l2.5-2.39 5.18 3.79c.95.52 1.62.25 1.88-.88l3.4-15.95c.3-1.41-.51-1.96-1.43-1.62L1.26 10.91c-1.36.53-1.34 1.3-.23 1.64l5.1 1.59L17.98 6.7c.56-.37 1.07-.17.65.2l-9.59 8.63Z" />
    </svg>
  );
}