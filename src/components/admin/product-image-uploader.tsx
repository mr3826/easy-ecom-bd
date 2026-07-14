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
      <div className="rounded-[1.5rem] border border-dashed border-sky-400/40 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Upload product images</p>
            <p className="mt-1 text-xs text-slate-400">
              PNG, JPG, WEBP, or GIF. Files are stored locally and served from <span className="font-semibold text-slate-200">/uploads</span>.
            </p>
          </div>
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 transition hover:border-sky-400/60 hover:bg-sky-500/20"
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

      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
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
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {retainedImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {retainedImages.map((image) => (
            <figure key={image.id} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80">
              <div className="relative aspect-[9/16]">
                <Image src={image.url} alt={image.alt || productName} fill className="object-cover" />
              </div>
              <figcaption className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{productName}</p>
                  <p className="truncate text-[11px] text-slate-500">{image.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRetainedImages((current) => current.filter((item) => item.id !== image.id))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-rose-400/60 hover:text-rose-300"
                  aria-label={`Remove saved image ${image.alt || productName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
          No saved product images yet.
        </div>
      )}

      {previewImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {previewImages.map((preview) => (
            <figure key={`${preview.name}-${preview.url}`} className="overflow-hidden rounded-3xl border border-sky-400/20 bg-slate-950/80">
              <div className="relative aspect-[9/16] bg-slate-900">
                <Image src={preview.url} alt={preview.name} fill unoptimized className="object-cover" />
              </div>
              <figcaption className="p-3">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">{preview.name}</p>
                <p className="mt-1 text-[11px] text-slate-500">{Math.max(1, Math.round(preview.size / 1024))} KB</p>
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
