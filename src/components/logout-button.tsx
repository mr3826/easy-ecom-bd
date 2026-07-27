"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
}: {
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--brand)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-soft)] disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {pending ? "Logging out..." : "Log out"}
    </button>
  );
}
