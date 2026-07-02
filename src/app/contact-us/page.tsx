import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { ContentPage } from "@/components/content-page";
import { storefrontPolicyPages } from "@/lib/mokkah-storefront";
import { siteBrand } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const page = storefrontPolicyPages["contact-us"];

  return (
    <PublicShell>
      <ContentPage eyebrow={page.eyebrow} title={page.title} intro={page.intro} body={page.body} actions={[{ href: "/track-order", label: "Track order" }, { href: "/shop", label: "Browse catalog", variant: "outline" }]} />
      <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {["Store address", "Phone support", "Email support"].map((title) => (
            <div key={title} className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--brand)]">{title}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">The contact data is surfaced in the shell, footer, and order pages for fast access.</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="tel:09639279024" className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Call support
          </a>
          <a href={siteBrand.messengerUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]">
            Messenger
          </a>
          <Link href="/shop" className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Continue shopping
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
