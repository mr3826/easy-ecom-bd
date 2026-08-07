import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { ProductCard } from "@/components/product-card";
import { slidesFromCarouselSection } from "@/lib/homepage-carousel";
import { getLandingPage, getLandingPageSections, listCategories, listProducts } from "@/server/store";
import { getSiteOrigin } from "@/lib/site-url";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const landingPage = await getLandingPage(slug);
  if (!landingPage) {
    return { title: "Page not found" };
  }

  return {
    title: landingPage.title,
    description: landingPage.metaDescription,
    alternates: {
      canonical: `${getSiteOrigin()}/l/${landingPage.slug}`,
    },
    openGraph: {
      title: landingPage.title,
      description: landingPage.metaDescription,
      type: "website",
      images: landingPage.bannerImageUrl ? [{ url: landingPage.bannerImageUrl, alt: landingPage.title }] : [],
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function LandingPagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landingPage = await getLandingPage(slug);
  if (!landingPage) notFound();

  const [sections, products, categories] = await Promise.all([
    getLandingPageSections(landingPage.id),
    listProducts(),
    listCategories(),
  ]);

  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
            <div className="p-6 sm:p-8 lg:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{landingPage.slug}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--foreground)] sm:text-4xl">{landingPage.heroTitle}</h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-[color:var(--muted)] sm:text-lg">{landingPage.heroSubtitle}</p>
            </div>
            <div className="relative min-h-64 bg-[color:var(--surface-soft)] sm:min-h-80">
              <Image src={landingPage.bannerImageUrl ?? "/hero-products.png"} alt={landingPage.title} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {sections.map((section) => {
            const sectionProducts = section.productIds
              .map((id) => products.find((entry) => entry.id === id))
              .filter((product): product is (typeof products)[number] => Boolean(product));

            if (section.type === "carousel") {
              return <HomeHeroSlider key={section.id} slides={slidesFromCarouselSection(section)} />;
            }

            if (section.type === "title") {
              return (
                <div key={section.id} className="py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{section.subtitle}</p>
                  <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-3xl">{section.title}</h2>
                </div>
              );
            }

            if (section.type === "subtitle") {
              return (
                <div key={section.id} className="max-w-3xl py-2">
                  <p className="text-base leading-8 text-[color:var(--muted)] sm:text-lg">{section.body ?? section.subtitle}</p>
                </div>
              );
            }

            if (section.type === "product_section") {
              return (
                <div key={section.id} className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{section.subtitle}</p>
                      <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-2xl">{section.title}</h2>
                    </div>
                    {section.ctaHref ? (
                      <a
                        href={section.ctaHref}
                        className="touch-target inline-flex items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--accent)]"
                      >
                        {section.ctaLabel ?? "Shop now"}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {sectionProducts.map((product) => {
                      const category = categories.find((entry) => entry.id === product.categoryId);
                      return <ProductCard key={product.id} product={product} categoryName={category?.name ?? "Category"} />;
                    })}
                  </div>
                </div>
              );
            }

            if (section.type === "testimonials") {
              return (
                <div key={section.id} className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                  <h2 className="text-xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-2xl">{section.title}</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {section.items.map((item, index) => (
                      <figure key={`${item.title ?? "testimonial"}-${index}`} className="rounded-3xl bg-white p-5">
                        <blockquote className="text-sm leading-6 text-[color:var(--muted)]">{item.body}</blockquote>
                        <figcaption className="mt-4 font-semibold text-[color:var(--foreground)]">{item.title}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.type === "faq") {
              return (
                <div key={section.id} className="rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                  <h2 className="text-xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-2xl">{section.title}</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {section.items.map((item, index) => (
                      <div key={`${item.title ?? "faq"}-${index}`} className="rounded-3xl bg-[color:var(--surface-soft)] p-5">
                        <p className="font-semibold text-[color:var(--foreground)]">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.type === "cta") {
              return (
                <div key={section.id} className="rounded-[2rem] bg-[color:var(--brand)] p-6 text-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <h2 className="text-xl font-black uppercase tracking-tight sm:text-2xl">{section.title}</h2>
                  <p className="mt-2 text-white/80">{section.body}</p>
                  <a
                    href={section.ctaHref ?? "/checkout"}
                    className="touch-target mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--brand)] transition hover:bg-[color:var(--accent)] hover:text-white"
                  >
                    {section.ctaLabel ?? "Buy now"}
                  </a>
                </div>
              );
            }

            if (section.type === "banner") {
              return (
                <div key={section.id} className="grid gap-5 rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6 sm:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand)]">{section.subtitle}</p>
                    <h2 className="mt-3 text-xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-2xl">{section.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{section.body}</p>
                  </div>
                  <Image src={section.imageUrl ?? "/hero-products.png"} alt={section.title ?? landingPage.title} width={600} height={400} className="h-auto w-full rounded-3xl object-cover" />
                </div>
              );
            }

            return null;
          })}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-2xl">Attached products</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {landingPage.attachedProductIds.map((id) => {
              const product = products.find((entry) => entry.id === id);
              if (!product) return null;
              const category = categories.find((entry) => entry.id === product.categoryId);
              return <ProductCard key={product.id} product={product} categoryName={category?.name ?? "Category"} />;
            })}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
