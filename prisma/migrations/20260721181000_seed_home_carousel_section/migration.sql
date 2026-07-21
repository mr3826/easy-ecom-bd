INSERT INTO "landing_pages" (
  "id",
  "slug",
  "title",
  "metaDescription",
  "heroTitle",
  "heroSubtitle",
  "bannerImageUrl",
  "published",
  "publishedAt",
  "attachedProductIds",
  "createdAt",
  "updatedAt"
)
VALUES (
  'lp-home',
  'home',
  'Home',
  'Homepage carousel and storefront campaign content.',
  'Fresh, image-led fashion shelves built for quick browsing',
  'Move through featured collections with admin-managed slides.',
  '/hero-fashion-1.svg',
  true,
  now(),
  ARRAY[]::TEXT[],
  now(),
  now()
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "landing_page_sections" (
  "id",
  "landingPageId",
  "type",
  "title",
  "subtitle",
  "body",
  "imageUrl",
  "productIds",
  "items",
  "ctaLabel",
  "ctaHref",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'lp-section-home-carousel',
  "id",
  'carousel',
  'Homepage carousel',
  'Featured',
  'Admin-managed homepage slider.',
  '/hero-fashion-1.svg',
  ARRAY[]::TEXT[],
  '[
    {
      "eyebrow": "New season arrivals",
      "title": "Fresh, image-led fashion shelves built for quick browsing",
      "body": "Move through stitched, unstitched, silk, and occasion collections with a full-width slider that keeps the homepage focused on the products.",
      "imageUrl": "/hero-fashion-1.svg",
      "imageAlt": "Bornohin hero banner featuring a soft neutral product arrangement",
      "primaryCtaLabel": "Shop Now",
      "primaryCtaHref": "/shop",
      "secondaryCtaLabel": "View Collections",
      "secondaryCtaHref": "/shop",
      "chips": ["Free delivery", "Responsive slider", "Fast selection"],
      "accentClass": "from-[#e9ded0] via-[#f4ebe0] to-[#cdb9a8]",
      "reverse": false
    },
    {
      "eyebrow": "Limited drops",
      "title": "High-contrast product storytelling with sale-led emphasis",
      "body": "Designed for a fashion storefront with bold imagery, obvious pricing, and a simple path from banner to collection pages.",
      "imageUrl": "/hero-fashion-2.svg",
      "imageAlt": "Bornohin hero banner with a softer campaign style and wide empty space",
      "primaryCtaLabel": "Explore Sale",
      "primaryCtaHref": "/shop?sort=price-low",
      "secondaryCtaLabel": "Browse All",
      "secondaryCtaHref": "/shop",
      "chips": ["Sale badges", "Cart-safe placeholders", "Desktop + mobile"],
      "accentClass": "from-[#d9d1e7] via-[#efeaf8] to-[#c6b7ea]",
      "reverse": true
    },
    {
      "eyebrow": "Kids and everyday wear",
      "title": "A compact hero that keeps the grid and call to action in view",
      "body": "The slider behaves like an ecommerce campaign banner, with smooth transitions, arrow controls, and a layout that stays readable on smaller screens.",
      "imageUrl": "/hero-fashion-3.svg",
      "imageAlt": "Bornohin hero banner with minimal product staging and soft lighting",
      "primaryCtaLabel": "Shop New",
      "primaryCtaHref": "/shop",
      "secondaryCtaLabel": "Open Home",
      "secondaryCtaHref": "/",
      "chips": ["Mobile friendly", "Smooth transitions", "Reusable components"],
      "accentClass": "from-[#ded9c7] via-[#f4f0e2] to-[#b9c7b4]",
      "reverse": false
    }
  ]'::JSONB,
  'Shop now',
  '/shop',
  1,
  now(),
  now()
FROM "landing_pages"
WHERE "slug" = 'home'
ON CONFLICT ("id") DO NOTHING;
