"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Upload } from "lucide-react";

export function ProductBulkUploadButton({
  templateHref,
}: {
  templateHref: string;
}) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end gap-2">
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(79,70,229,0.24)] transition hover:bg-indigo-500"
      >
        <Upload className="h-4 w-4" />
        Upload Product File
      </label>
      <input
        id={inputId}
        name="productFile"
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          if (file) {
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <p className="text-xs text-slate-400">{fileName ? `Selected: ${fileName}` : "CSV import uses the fixed template structure."}</p>
      <Link href={templateHref} className="text-xs font-medium text-sky-300 transition hover:text-sky-200">
        Download Upload Template
      </Link>
    </div>
  );
}

