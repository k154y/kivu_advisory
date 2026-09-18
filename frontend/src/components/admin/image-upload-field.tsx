"use client";

import { ChangeEvent, useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  API_BASE_URL,
  api,
  getApiErrorMessage,
} from "@/lib/api";

export type MediaCategory = "hero" | "staff" | "blog";

type UploadedMedia = {
  file_name: string;
  original_name?: string;
  original_file_name?: string;
  mime_type: string;
  file_size_bytes: number;
  storage_driver: string;
  storage_key: string;
  url: string;
  category: MediaCategory;
};

type ImageUploadFieldProps = {
  category: MediaCategory;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  urlLabel?: string;
  uploadLabel?: string;
  previewAlt?: string;
  disabled?: boolean;
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
}

// export function resolveMediaUrl(value: string) {
//   const trimmedValue = value.trim();

//   if (!trimmedValue) {
//     return "";
//   }

//   if (
//     trimmedValue.startsWith("http://") ||
//     trimmedValue.startsWith("https://") ||
//     trimmedValue.startsWith("data:") ||
//     trimmedValue.startsWith("blob:")
//   ) {
//     return trimmedValue;
//   }

//   if (trimmedValue.startsWith("/media/")) {
//     const apiOrigin = getApiOrigin();

//     if (apiOrigin) {
//       return `${apiOrigin}${trimmedValue}`;
//     }
//   }

//   return trimmedValue;
// }

export function ImageUploadField({
  category,
  value,
  onChange,
  label = "Image",
  urlLabel = "Image URL",
  uploadLabel = "Upload from computer",
  previewAlt = "Image preview",
  disabled = false,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);

  const previewUrl = resolveMediaUrl(value);

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again after an error.
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size <= 0) {
      toast.error("The selected image is empty.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("The image must be 10 MB or smaller.");
      return;
    }

    const formData = new FormData();

    formData.append("category", category);
    formData.append("file", file);

    setUploading(true);

    try {
      const result = await api.uploadFile<UploadedMedia>(
        "/admin/media/images",
        formData,
      );

      if (!result.data?.url) {
        throw new Error(
          "The image was uploaded but the server did not return its URL.",
        );
      }

      onChange(result.data.url);

      toast.success("Image uploaded successfully.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) || "Failed to upload image.",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onChange("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-semibold text-navy">
          {label}
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-lightgray px-4 py-5 text-sm font-semibold text-navy transition-colors hover:border-teal hover:bg-teal/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={18} />
              {uploadLabel}
            </>
          )}
        </button>

        <p className="mt-2 text-xs text-gray-500">
          JPEG, PNG or WebP. Maximum 10 MB.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />

        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          or
        </span>

        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-navy">
          {urlLabel}
        </span>

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || uploading}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-gray-50 disabled:opacity-60"
        />
      </label>

      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-gray-100 bg-lightgray">
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={previewAlt}
              className="h-full w-full object-cover"
            />

            <button
              type="button"
              onClick={removeImage}
              disabled={disabled || uploading}
              aria-label="Remove image"
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow hover:text-red-600 disabled:opacity-60"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon size={28} />

            <span className="text-sm font-semibold">
              Image preview
            </span>
          </div>
        )}
      </div>
    </div>
  );
}