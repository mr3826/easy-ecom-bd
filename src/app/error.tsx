"use client";

import { Button } from "@/components/ui/button";

/**
 * Route-level boundary. Without it every client-side failure — including a
 * server action whose request never completes — escalates to global-error,
 * which replaces the entire document and offers no way back.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[color:var(--background)] px-6 py-16">
      <div className="w-full max-w-md space-y-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand)]">
          Something broke
        </p>
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
          That did not go through.
        </h1>
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          This is usually a dropped connection. Try again — nothing was submitted twice.
        </p>
        {error.digest ? (
          <p className="text-xs text-[color:var(--muted)]">Error code: {error.digest}</p>
        ) : null}
        <Button type="button" onClick={reset} fullWidth>
          Try again
        </Button>
      </div>
    </div>
  );
}
