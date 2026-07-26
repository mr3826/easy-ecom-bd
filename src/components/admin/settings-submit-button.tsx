"use client";

import { Save } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SettingsSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(139,0,0,0.16)] hover:bg-[color:var(--brand)]"
    >
      <Save className="h-4 w-4" aria-hidden="true" />
      {pending ? "Saving..." : "Save settings"}
    </button>
  );
}
