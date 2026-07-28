"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[color:var(--background)] px-6 text-[color:var(--foreground)]">
      <div className="max-w-md space-y-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand)]">Something broke</p>
        <h1 className="text-3xl font-semibold text-[color:var(--foreground)]">We could not load this page.</h1>
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          Please try again. If the problem stays around, the app error log will have the details.
        </p>
        {error.digest ? <p className="text-xs text-[color:var(--muted)]">Error code: {error.digest}</p> : null}
      </div>
    </div>
  );
}
