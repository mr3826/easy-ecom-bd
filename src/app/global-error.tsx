"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-md space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Something broke</p>
        <h1 className="text-3xl font-semibold">We could not load this page.</h1>
        <p className="text-sm leading-6 text-slate-300">
          Please try again. If the problem stays around, the app error log will have the details.
        </p>
        {error.digest ? <p className="text-xs text-slate-500">Error code: {error.digest}</p> : null}
      </div>
    </div>
  );
}
