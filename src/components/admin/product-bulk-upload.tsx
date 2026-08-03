"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductBulkUploadButton({
  templateHref,
}: {
  templateHref: string;
}) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end gap-2">
      <Button asChild>
        <label
          htmlFor={inputId}
          className="cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Upload Product File
        </label>
      </Button>
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
      <p className="text-xs text-[color:var(--muted)]">{fileName ? `Selected: ${fileName}` : "CSV import uses the fixed template structure."}</p>
      <Link href={templateHref} className="text-xs font-medium text-[color:var(--brand)] transition hover:text-[color:var(--accent)]">
        Download Upload Template
      </Link>
    </div>
  );
}
