import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function NotFound() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">404</p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-[color:var(--foreground)]">Page not found</h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">The page you asked for does not exist in this storefront yet.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Back home
          </Link>
          <Link href="/shop" className="inline-flex rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
            Browse shop
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

