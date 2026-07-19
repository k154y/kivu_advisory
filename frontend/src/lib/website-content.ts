export type WebsiteContentBlock = {
  id: string;
  content_key: string;
  title?: string;
  content_type?: string;
  summary?: string;
  body?: string;
  image_url?: string;
  button_label?: string;
  button_url?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
};

type ContentResponse = {
  success?: boolean;
  data?: {
    items?: WebsiteContentBlock[];
  };
  items?: WebsiteContentBlock[];
};

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/$/, "");

function getItems(response: ContentResponse): WebsiteContentBlock[] {
  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.data?.items)) {
    return response.data.items;
  }

  return [];
}

export function getContentText(block?: WebsiteContentBlock | null) {
  return block?.body || block?.summary || block?.title || "";
}

export async function getSectionContentBlocks(): Promise<WebsiteContentBlock[]> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/content?content_type=section&page_size=200`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [];
    }

    const result = (await response.json()) as ContentResponse;

    return getItems(result).filter((item) => item.is_active !== false);
  } catch {
    return [];
  }
}

export async function getWebsiteContentBlock(
  contentKey: string,
): Promise<WebsiteContentBlock | null> {
  const items = await getSectionContentBlocks();

  return items.find((item) => item.content_key === contentKey) || null;
}