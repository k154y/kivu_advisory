import { api } from "@/lib/api";

export type WebsiteContentBlock = {
  id?: string;
  content_key?: string;
  title?: string;
  slug?: string;
  content_type?: string;
  body?: string;
  summary?: string;
  meta_title?: string;
  meta_description?: string;
  image_url?: string;
  button_label?: string;
  button_url?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
};

type ContentListResponse = {
  items?: WebsiteContentBlock[];
};

function isWebsiteContentBlock(value: unknown): value is WebsiteContentBlock {
  if (!value || typeof value !== "object") {
    return false;
  }

  return true;
}

function isContentListResponse(value: unknown): value is ContentListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "items" in value;
}

function getContentFromResponse(
  data: WebsiteContentBlock | WebsiteContentBlock[] | ContentListResponse,
  contentKey: string,
): WebsiteContentBlock | null {
  if (Array.isArray(data)) {
    return (
      data.find(
        (item) =>
          item.content_key === contentKey && item.is_active !== false,
      ) ||
      data.find((item) => item.content_key === contentKey) ||
      null
    );
  }

  if (isContentListResponse(data)) {
    const items = data.items || [];

    return (
      items.find(
        (item) =>
          item.content_key === contentKey && item.is_active !== false,
      ) ||
      items.find((item) => item.content_key === contentKey) ||
      null
    );
  }

  if (isWebsiteContentBlock(data)) {
    return data;
  }

  return null;
}

export async function getWebsiteContentBlock(
  contentKey: string,
): Promise<WebsiteContentBlock | null> {
  const encodedKey = encodeURIComponent(contentKey);

  const possiblePaths = [
    `/content/detail?content_key=${encodedKey}`,
    `/content/detail?key=${encodedKey}`,
    `/content?content_key=${encodedKey}`,
    `/content?key=${encodedKey}`,
  ];

  for (const path of possiblePaths) {
    try {
      const result = await api.get<
        WebsiteContentBlock | WebsiteContentBlock[] | ContentListResponse
      >(path);

      const block = getContentFromResponse(result.data, contentKey);

      if (block) {
        return block;
      }
    } catch {
      // Try the next possible backend route.
    }
  }

  return null;
}