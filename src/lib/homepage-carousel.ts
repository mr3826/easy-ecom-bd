import type { LandingPageSection } from "@/lib/domain";
import { siteBrand } from "@/lib/site-brand";

export type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  chips?: string[];
  imageAlt: string;
  imageSrc: string;
  accentClass: string;
  reverse?: boolean;
};

export const fallbackHomeHeroSlides: HomeHeroSlide[] = [
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

export const homepageCarouselItemsTemplate = JSON.stringify(
  fallbackHomeHeroSlides.map((slide) => ({
    eyebrow: slide.eyebrow,
    title: slide.title,
    body: slide.description,
    imageUrl: slide.imageSrc,
    imageAlt: slide.imageAlt,
    primaryCtaLabel: slide.primaryCta.label,
    primaryCtaHref: slide.primaryCta.href,
    secondaryCtaLabel: slide.secondaryCta?.label,
    secondaryCtaHref: slide.secondaryCta?.href,
    chips: slide.chips,
    accentClass: slide.accentClass,
    reverse: Boolean(slide.reverse),
  })),
  null,
  2,
);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === "1";
}

function stringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => stringValue(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function slidesFromCarouselSection(section?: LandingPageSection | null) {
  if (!section || !Array.isArray(section.items)) {
    return fallbackHomeHeroSlides;
  }

  const slides = section.items
    .map((item, index): HomeHeroSlide | null => {
      const title = stringValue(item.title);
      if (!title) return null;

      return {
        id: stringValue(item.id, `${section.id}-${index}`),
        eyebrow: stringValue(item.eyebrow, section.subtitle ?? "Featured"),
        title,
        description: stringValue(item.body, section.body ?? ""),
        primaryCta: {
          label: stringValue(item.primaryCtaLabel, section.ctaLabel ?? "Shop now"),
          href: stringValue(item.primaryCtaHref, section.ctaHref ?? "/shop"),
        },
        secondaryCta: stringValue(item.secondaryCtaLabel)
          ? {
              label: stringValue(item.secondaryCtaLabel),
              href: stringValue(item.secondaryCtaHref, "/shop"),
            }
          : undefined,
        chips: stringList(item.chips),
        imageAlt: stringValue(item.imageAlt, title),
        imageSrc: stringValue(item.imageUrl, section.imageUrl ?? "/hero-products.png"),
        accentClass: stringValue(item.accentClass, "from-[#e9ded0] via-[#f4ebe0] to-[#cdb9a8]"),
        reverse: booleanValue(item.reverse),
      };
    })
    .filter((slide): slide is HomeHeroSlide => Boolean(slide));

  return slides.length ? slides : fallbackHomeHeroSlides;
}
