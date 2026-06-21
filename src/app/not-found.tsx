import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function NotFound() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-4 text-slate-600">The page you asked for does not exist in this storefront yet.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          Back home
        </Link>
      </section>
    </PublicShell>
  );
}

