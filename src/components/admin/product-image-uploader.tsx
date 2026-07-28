"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";

type ExistingImage = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

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

  useEffect(() => {
    return () => {
      previewImages.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previewImages]);

  const clearSelectedFiles = () => {
    previewImages.forEach((item) => URL.revokeObjectURL(item.url));
    setSelectedFiles([]);
    setPreviewImages([]);
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
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--brand)]/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand)] transition hover:border-[color:var(--brand)]/40 hover:bg-[color:var(--brand-soft)]"
          >
            <ImagePlus className="h-4 w-4" />
            Choose files
          </label>
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

      <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
        <span>
          {retainedImages.length} saved image{retainedImages.length === 1 ? "" : "s"} and {selectedFiles.length} new upload
          {selectedFiles.length === 1 ? "" : "s"}
        </span>
        {(retainedImages.length > 0 || selectedFiles.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setRetainedImages([]);
              clearSelectedFiles();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--brand)]/40 hover:text-[color:var(--brand)]"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
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
                <button
                  type="button"
                  onClick={() => {
                    setRetainedImages((current) => current.filter((item) => item.id !== image.id));
                  }}
                  className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] transition hover:border-rose-400/60 hover:text-rose-500"
                  aria-label={`Remove saved image ${image.alt || productName}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
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
