"use client";

import { Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SettingsSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} pendingWhileSubmitting pendingLabel="Saving...">
      <Save className="h-4 w-4" aria-hidden="true" />
      Save settings
    </Button>
  );
}
