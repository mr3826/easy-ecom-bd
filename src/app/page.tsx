import { PublicShell } from "@/components/public-shell";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { ProductSection } from "@/components/product-section";
import { slidesFromCarouselSection } from "@/lib/homepage-carousel";
import { getLandingPage, getLandingPageSections } from "@/server/store";
import { getStorefrontCollections } from "@/server/storefront-catalog";

export const dynamic = "force-dynamic";

const sectionLimits: Partial<Record<string, number>> = {
  "silk-stitched": 6,
};

export default async function HomePage() {
  const [homepageCollections, homeLandingPage] = await Promise.all([
    getStorefrontCollections(),
    getLandingPage("home"),
  ]);
  const homeSections = homeLandingPage ? await getLandingPageSections(homeLandingPage.id) : [];
  const heroSlides = slidesFromCarouselSection(homeSections.find((section) => section.type === "carousel"));

  return (
    <PublicShell>
      <div className="pb-12">
        <HomeHeroSlider slides={heroSlides} />

        <div className="space-y-2 pt-2">
          {homepageCollections.map((collection) => (
            <ProductSection key={collection.slug} collection={collection} limit={sectionLimits[collection.slug as keyof typeof sectionLimits] ?? 4} />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
