import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { ProductCard } from "@/components/product-card";
import { slidesFromCarouselSection } from "@/lib/homepage-carousel";
import { getLandingPage, getLandingPageSections, listCategories, listProducts } from "@/server/store";

export const dynamic = "force-dynamic";

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
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
            <div className="p-8 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{landingPage.slug}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{landingPage.heroTitle}</h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">{landingPage.heroSubtitle}</p>
            </div>
            <div className="relative min-h-80 bg-slate-100">
              <Image src={landingPage.bannerImageUrl ?? "/hero-products.png"} alt={landingPage.title} fill className="object-cover" />
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
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--brand)]">{section.subtitle}</p>
                  <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-[color:var(--foreground)] sm:text-4xl">{section.title}</h2>
                </div>
              );
            }

            if (section.type === "subtitle") {
              return (
                <div key={section.id} className="max-w-3xl py-2">
                  <p className="text-lg leading-8 text-[color:var(--muted)]">{section.body ?? section.subtitle}</p>
                </div>
              );
            }

            if (section.type === "product_section") {
              return (
                <div key={section.id} className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand)]">{section.subtitle}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{section.title}</h2>
                    </div>
                    {section.ctaHref ? (
                      <a href={section.ctaHref} className="rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white">
                        {section.ctaLabel ?? "Shop now"}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                <div key={section.id} className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">{section.title}</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                <div key={section.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-semibold text-slate-950">{section.title}</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {section.items.map((item, index) => (
                      <div key={`${item.title ?? "faq"}-${index}`} className="rounded-3xl bg-slate-50 p-5">
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.type === "cta") {
              return (
                <div key={section.id} className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
                  <h2 className="text-2xl font-semibold">{section.title}</h2>
                  <p className="mt-2 text-slate-300">{section.body}</p>
                  <a href={section.ctaHref ?? "/checkout"} className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                    {section.ctaLabel ?? "Buy now"}
                  </a>
                </div>
              );
            }

            if (section.type === "banner") {
              return (
                <div key={section.id} className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_280px]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{section.subtitle}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">{section.title}</h2>
                    <p className="mt-3 text-slate-600">{section.body}</p>
                  </div>
                  <Image src={section.imageUrl ?? "/hero-products.png"} alt={section.title ?? landingPage.title} width={600} height={400} className="rounded-3xl object-cover" />
                </div>
              );
            }

            return null;
          })}
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-slate-950">Attached products</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
