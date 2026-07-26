import { api } from "@/lib/api";

export type DocumentVisibility = "client" | "staff" | "admin";

export type DocumentType =
  | "client_upload"
  | "admin_upload"
  | "accountant_upload"
  | "final_deliverable"
  | "internal_file";

export type DocumentItem = {
  id: string;
  service_request_id?: string;
  service_request_reference_number?: string;
  reference_number?: string;
  service_request_title?: string;
  request_title?: string;
  file_name?: string;
  original_file_name?: string;
  description?: string;
  visibility?: DocumentVisibility | string;
  document_type?: DocumentType | string;
  status?: string;
  is_final?: boolean;
  created_at?: string;
  uploaded_at?: string;
  updated_at?: string;
  service_request?: {
    id?: string;
    reference_number?: string;
    title?: string;
  };
  request?: {
    id?: string;
    reference_number?: string;
    title?: string;
  };
};

export type UploadDocumentPayload = {
  file: File;
  service_request_id: string;
  visibility: DocumentVisibility;
  document_type: DocumentType;
  is_final?: boolean;
  description?: string;
};

export type ListDocumentsParams = {
  service_request_id?: string;
  uploaded_by_user_id?: string;
  visibility?: string;
  document_type?: string;
  status?: string;
  is_final?: boolean;
  page?: number;
  page_size?: number;
};

export type UpdateDocumentPayload = {
  visibility: DocumentVisibility;
  document_type: DocumentType;
  is_final: boolean;
  description?: string;
};

export function getItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (!response || typeof response !== "object") return [];

  const objectResponse = response as {
    items?: T[];
    data?: T[] | { items?: T[] };
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

export async function uploadDocument(payload: UploadDocumentPayload) {
  if (!payload.service_request_id) {
    throw new Error("Service request ID is required before uploading a document.");
  }

  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("service_request_id", payload.service_request_id);
  formData.append("visibility", payload.visibility);
  formData.append("document_type", payload.document_type);
  formData.append("is_final", String(payload.is_final ?? false));

  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }

  return api.uploadFile<DocumentItem>("/documents", formData);
}

export async function listDocuments(params: ListDocumentsParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.service_request_id) {
    searchParams.set("service_request_id", params.service_request_id);
  }

  if (params.uploaded_by_user_id) {
    searchParams.set("uploaded_by_user_id", params.uploaded_by_user_id);
  }

  if (params.visibility) {
    searchParams.set("visibility", params.visibility);
  }

  if (params.document_type) {
    searchParams.set("document_type", params.document_type);
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (typeof params.is_final === "boolean") {
    searchParams.set("is_final", String(params.is_final));
  }

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("page_size", String(params.page_size ?? 100));

  return api.get<{ items?: DocumentItem[] } | DocumentItem[]>(
    `/documents?${searchParams.toString()}`,
  );
}

export async function updateDocumentMetadata(
  id: string,
  payload: UpdateDocumentPayload,
) {
  return api.put<DocumentItem>(
    `/documents/detail?id=${encodeURIComponent(id)}`,
    payload,
  );
}

export async function deleteDocument(id: string) {
  return api.del(`/documents/detail?id=${encodeURIComponent(id)}`);
}

export async function downloadDocument(id: string) {
  const result = await api.downloadFile(
    `/documents/download?id=${encodeURIComponent(id)}`,
  );

  const url = window.URL.createObjectURL(result.blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = result.filename || "document";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export function getDocumentReference(document: DocumentItem) {
  return (
    document.service_request_reference_number ||
    document.reference_number ||
    document.service_request?.reference_number ||
    document.request?.reference_number ||
    "No linked request"
  );
}

export function getDocumentRequestTitle(document: DocumentItem) {
  return (
    document.service_request_title ||
    document.request_title ||
    document.service_request?.title ||
    document.request?.title ||
    ""
  );
}

export function groupDocumentsByReference(documents: DocumentItem[]) {
  return documents.reduce<Record<string, DocumentItem[]>>((groups, document) => {
    const referenceNumber = getDocumentReference(document);

    if (!groups[referenceNumber]) {
      groups[referenceNumber] = [];
    }

    groups[referenceNumber].push(document);
    return groups;
  }, {});
}