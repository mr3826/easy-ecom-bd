import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { ProductCard } from "@/components/product-card";
import { MetricCard } from "@/components/metric-card";
import { getSettings, listCategories, listProducts, listLandingPages } from "@/server/store";
import { ArrowRight, BadgeCheck, LayoutTemplate, ShieldCheck, Truck } from "lucide-react";

export default function HomePage() {
  const settings = getSettings();
  const products = listProducts().filter((product) => product.featured);
  const categories = listCategories();
  const landingPages = listLandingPages().filter((page) => page.published);

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Built for Bangladesh ecommerce
          </p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Launch storefronts, landing pages, and direct bKash or Nagad checkout from one codebase.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            {settings.storeName} ships with a customer site, protected admin, product and order workflows,
            campaign landing pages, and courier abstractions for Pathao and Steadfast.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Browse products
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50"
            >
              Open admin
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Wallets" value="bKash + Nagad" delta="Direct merchant flow" tone="emerald" />
            <MetricCard label="Couriers" value="2 integrations" delta="Pathao + Steadfast" tone="sky" />
            <MetricCard label="Landing pages" value={`${landingPages.length}`} delta="Custom slugs" tone="amber" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <Image
            src="/hero-products.png"
            alt="Ecommerce products"
            width={1200}
            height={900}
            priority
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-5 bottom-5 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Payment & delivery</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="font-medium">Wallet checkout</p>
                <p className="mt-1 text-slate-300">Verify server-side before marking paid.</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-slate-800">
                <p className="font-medium">Courier sync</p>
                <p className="mt-1 text-slate-600">Tracking IDs and status updates.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <BadgeCheck className="h-5 w-5 text-emerald-300" />
            <h2 className="mt-4 text-lg font-semibold">Checkout with confidence</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Orders stay pending until backend verification confirms the provider response.
            </p>
          </div>
          <div className="rounded-3xl bg-emerald-50 p-5">
            <LayoutTemplate className="h-5 w-5 text-emerald-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Landing page builder</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Attach products, FAQs, testimonials, and CTA blocks to a custom slug.
            </p>
          </div>
          <div className="rounded-3xl bg-sky-50 p-5">
            <Truck className="h-5 w-5 text-sky-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Courier abstraction</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Switch between Pathao and Steadfast without changing order logic.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Featured products</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">Ready for landing pages and ads</h2>
          </div>
          <Link href="/products" className="text-sm font-medium text-slate-700 hover:text-slate-950">
            View all products
          </Link>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const category = categories.find((entry) => entry.id === product.categoryId);
            const image = product.id === "prod-1" ? "/hero-products.png" : "/hero-products.png";
            return <ProductCard key={product.id} product={product} categoryName={category?.name ?? "Category"} imageUrl={image} />;
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Campaign pages</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Publishable landing pages with custom slugs</h2>
            </div>
            <Link href="/admin/landing-pages" className="text-sm font-medium text-slate-700 hover:text-slate-950">
              Manage builder
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {landingPages.map((page) => (
              <Link
                key={page.id}
                href={`/l/${page.slug}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 hover:border-slate-300 hover:bg-white"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{page.slug}</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{page.heroTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{page.heroSubtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

