"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExistingImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

// Must stay under experimental.serverActions.bodySizeLimit in next.config.mjs —
// the images share one request body with the rest of the product form.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function ProductImageUploader({
  productName,
  existingImages,
}: {
  productName: string;
  existingImages: ExistingImage[];
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [retainedImages, setRetainedImages] = useState(existingImages);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<Array<{ name: string; url: string; size: number }>>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      previewImages.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewImages]);

  const clearSelectedFiles = () => {
    previewImages.forEach((item) => URL.revokeObjectURL(item.url));
    setSelectedFiles([]);
    setPreviewImages([]);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-4">
      <input type="hidden" name="productImagesTouched" value="1" />
      <div className="rounded-[1.5rem] border border-dashed border-[color:var(--brand)]/30 bg-[color:var(--surface-soft)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Upload product images</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              PNG, JPG, WEBP, or GIF. Files are stored locally and served from <span className="font-semibold text-[color:var(--foreground)]">/uploads</span>.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <label
              htmlFor={inputId}
              className="cursor-pointer"
            >
              <ImagePlus className="h-4 w-4" />
              Choose files
            </label>
          </Button>
        </div>
        <input
          ref={fileInputRef}
          id={inputId}
          name="productImages"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
            if (totalBytes > MAX_UPLOAD_BYTES) {
              // Rejecting here rather than on submit: past the server action's
              // body limit the request is refused before the action runs, so
              // the admin only ever sees the generic error page.
              setUploadError(
                `Those images total ${Math.round(totalBytes / (1024 * 1024))} MB. Keep the batch under ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
              );
              event.currentTarget.value = "";
              return;
            }
            setUploadError(null);
            previewImages.forEach((item) => URL.revokeObjectURL(item.url));
            setSelectedFiles(files);
            setPreviewImages(
              files.map((file) => ({
                name: file.name,
                url: URL.createObjectURL(file),
                size: file.size,
              })),
            );
          }}
        />
      </div>

      {uploadError ? (
        <p role="alert" className="text-xs font-medium text-[color:var(--brand)]">
          {uploadError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
        <span>
          {retainedImages.length} saved image{retainedImages.length === 1 ? "" : "s"} and {selectedFiles.length} new upload
          {selectedFiles.length === 1 ? "" : "s"}
        </span>
        {(retainedImages.length > 0 || selectedFiles.length > 0) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => {
              setRetainedImages([]);
              clearSelectedFiles();
            }}>
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {retainedImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {retainedImages.map((image) => (
            <figure key={image.id} className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-white">
              <div className="relative aspect-[9/16]">
                <Image src={image.url} alt={image.alt || productName} fill className="object-cover" />
              </div>
              <figcaption className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">{productName}</p>
                  <p className="truncate text-[11px] text-[color:var(--muted)]">{image.url}</p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setRetainedImages((current) => current.filter((item) => item.id !== image.id));
                  }}
                  aria-label={`Remove saved image ${image.alt || productName}`}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-5 text-sm text-[color:var(--muted)]">
          No saved product images yet.
        </div>
      )}

      {previewImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {previewImages.map((preview) => (
            <figure key={`${preview.name}-${preview.url}`} className="overflow-hidden rounded-3xl border border-[color:var(--brand)]/20 bg-white">
              <div className="relative aspect-[9/16] bg-[color:var(--surface-soft)]">
                <Image src={preview.url} alt={preview.name} fill unoptimized className="object-cover" />
              </div>
              <figcaption className="p-3">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand)]">{preview.name}</p>
                <p className="mt-1 text-[11px] text-[color:var(--muted)]">{Math.max(1, Math.round(preview.size / 1024))} KB</p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      <div className="sr-only">
        {retainedImages.map((image) => (
          <input key={image.id} type="hidden" name="retainedImageUrls" value={image.url} />
        ))}
      </div>
    </div>
  );
}
