import { PublicShell } from "@/components/public-shell";
import { HomeHeroSlider, type HomeHeroSlide } from "@/components/home-hero-slider";
import { ProductSection } from "@/components/product-section";
import { storefrontCollections } from "@/lib/bornohin-storefront";
import { siteBrand } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

const heroSlides: HomeHeroSlide[] = [
  {
    id: "hero-1",
    eyebrow: "New season arrivals",
    title: "Fresh, image-led fashion shelves built for quick browsing",
    description:
      "Move through stitched, unstitched, silk, and occasion collections with a full-width slider that keeps the homepage focused on the products.",
    primaryCta: { label: "Shop Now", href: "/shop" },
    secondaryCta: { label: "View Collections", href: "/shop" },
    chips: ["Free delivery", "Responsive slider", "Fast selection"],
    imageAlt: `${siteBrand.name} hero banner featuring a soft neutral product arrangement`,
    imageSrc: "/hero-fashion-1.svg",
    accentClass: "from-[#e9ded0] via-[#f4ebe0] to-[#cdb9a8]",
  },
  {
    id: "hero-2",
    eyebrow: "Limited drops",
    title: "High-contrast product storytelling with sale-led emphasis",
    description:
      "Designed for a fashion storefront with bold imagery, obvious pricing, and a simple path from banner to collection pages.",
    primaryCta: { label: "Explore Sale", href: "/shop?sort=price-low" },
    secondaryCta: { label: "Browse All", href: "/shop" },
    chips: ["Sale badges", "Cart-safe placeholders", "Desktop + mobile"],
    imageAlt: `${siteBrand.name} hero banner with a softer campaign style and wide empty space`,
    imageSrc: "/hero-fashion-2.svg",
    accentClass: "from-[#d9d1e7] via-[#efeaf8] to-[#c6b7ea]",
    reverse: true,
  },
  {
    id: "hero-3",
    eyebrow: "Kids and everyday wear",
    title: "A compact hero that keeps the grid and call to action in view",
    description:
      "The slider behaves like an ecommerce campaign banner, with smooth transitions, arrow controls, and a layout that stays readable on smaller screens.",
    primaryCta: { label: "Shop New", href: "/shop" },
    secondaryCta: { label: "Open Home", href: "/" },
    chips: ["Mobile friendly", "Smooth transitions", "Reusable components"],
    imageAlt: `${siteBrand.name} hero banner with minimal product staging and soft lighting`,
    imageSrc: "/hero-fashion-3.svg",
    accentClass: "from-[#ded9c7] via-[#f4f0e2] to-[#b9c7b4]",
  },
];

const homepageCollectionOrder = [
  "cotton-stitched",
  "cotton-unstitched",
  "party-wear-stitched",
  "silk-stitched",
  "pk-georgette-stitched",
  "2pcs-dresses",
  "premium-silk-saree",
  "1piece-dresses",
  "slub-cotton-1-piece",
  "kids-casual-outfits",
  "limited-drops",
] as const;

const sectionLimits: Partial<Record<(typeof homepageCollectionOrder)[number], number>> = {
  "silk-stitched": 6,
};

const homepageCollections = homepageCollectionOrder
  .map((slug) => storefrontCollections.find((collection) => collection.slug === slug))
  .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection));

export default function HomePage() {
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
