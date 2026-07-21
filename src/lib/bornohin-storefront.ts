import { siteBrand } from "@/lib/site-brand";

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  collectionSlug: string;
  collectionTitle?: string;
  brandSlug?: string;
  brandTitle?: string;
  price: number;
  compareAtPrice?: number;
  badge?: string;
  description: string;
  tone: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  featured?: boolean;
  soldOut?: boolean;
};

export type StorefrontCollection = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  banner: string;
  summary: string;
  products: StorefrontProduct[];
};

type StaticPage = {
  title: string;
  eyebrow: string;
  intro: string;
  body: string[];
};

const palette = [
  "from-[#f7d7a2] via-[#d89a47] to-[#8d5524]",
  "from-[#e6c7be] via-[#b76e79] to-[#6d3841]",
  "from-[#cfe2dc] via-[#6a9f90] to-[#2f5f52]",
  "from-[#dae0f5] via-[#8d96d8] to-[#4a4f92]",
  "from-[#f2d0bf] via-[#ea8d6b] to-[#ab4d3f]",
  "from-[#f6e3a7] via-[#d0aa45] to-[#6d531a]",
  "from-[#e3d7f6] via-[#b393dd] to-[#644b92]",
  "from-[#d4ece8] via-[#72b5aa] to-[#1f5e56]",
  "from-[#f7d9cd] via-[#d97f62] to-[#8f3c2e]",
  "from-[#d9e2cf] via-[#93a866] to-[#4f5f30]",
  "from-[#d8dde2] via-[#919aa4] to-[#454e58]",
  "from-[#f6e8d4] via-[#c9a06a] to-[#7d5932]",
];

const createProduct = (
  collectionSlug: string,
  name: string,
  price: number,
  description: string,
  index: number,
  extra?: Partial<StorefrontProduct>,
): StorefrontProduct => ({
    id: `${collectionSlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}`,
    slug: `${collectionSlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}`,
    name,
    collectionSlug,
  price,
  compareAtPrice: extra?.compareAtPrice,
  badge: extra?.badge,
  description,
  tone: palette[index % palette.length],
  featured: extra?.featured ?? false,
  soldOut: extra?.soldOut ?? false,
});

const collectionSeeds: Array<Omit<StorefrontCollection, "products"> & { products: StorefrontProduct[] }> = [
  {
    slug: "cotton-stitched",
    title: "Cotton Stitched",
    subtitle: "Everyday best-sellers",
    description: "Crisp stitched cotton sets with a polished shop-floor presentation and easy browse flow.",
    accent: "bg-[#d98f2e]",
    banner: "Shop lightweight stitched cotton",
    summary: "A compact edit of stitched cotton staples ready for mobile shoppers.",
    products: [
      createProduct("cotton-stitched", "Fariya TF White", 1550, "A clean hero style with a premium look.", 0, { featured: true }),
      createProduct("cotton-stitched", "Parul SadaBahar", 1550, "High-contrast floral energy with a classic silhouette.", 1),
      createProduct("cotton-stitched", "Charcoal Floral", 1350, "A darker, more dramatic daywear option.", 2, { badge: "Hot" }),
      createProduct("cotton-stitched", "Floral Muse", 950, "Soft floral tone for budget-friendly campaigns.", 3),
    ],
  },
  {
    slug: "cotton-unstitched",
    title: "Cotton Unstitched",
    subtitle: "Fabric-first edits",
    description: "Unstitched cotton bundles with the sort of clean layout that converts quickly on mobile.",
    accent: "bg-[#b97a56]",
    banner: "Shop unstitched cotton fabric",
    summary: "Flexible fabric picks with low-friction add-to-cart behavior.",
    products: [
      createProduct("cotton-unstitched", "Tawakkal D-95", 1750, "A premium unstitched option with a rich finish.", 4, { featured: true }),
      createProduct("cotton-unstitched", "Honeycomb Harmony", 500, "Entry-level fabric choice for impulse traffic.", 5),
      createProduct("cotton-unstitched", "Cloud Canvas", 500, "Soft and airy with a bright campaign feel.", 6, { badge: "Sold Out", soldOut: true }),
      createProduct("cotton-unstitched", "Lahori D-1067", 1150, "A balanced daily-wear fabric listing.", 7),
    ],
  },
  {
    slug: "party-wear-stitched",
    title: "Party Wear Stitched",
    subtitle: "Event-ready silhouettes",
    description: "Themed stitched pieces with stronger typography, bigger callouts, and premium spacing.",
    accent: "bg-[#7f3b4d]",
    banner: "Occasion wear made to stand out",
    summary: "Higher-ticket occasion looks for launch campaigns.",
    products: [
      createProduct("party-wear-stitched", "Tercel FL Bahar", 1750, "A polished event look with premium contrast.", 8),
      createProduct("party-wear-stitched", "CRing Jimichu-002", 1950, "A dressier statement option for the top row.", 9, { featured: true }),
      createProduct("party-wear-stitched", "Hubby Tercel SP", 2550, "Layered styling with a more premium ask.", 10),
      createProduct("party-wear-stitched", "Elegance B.M", 1750, "Balanced and safe for broad audience targeting.", 11),
    ],
  },
  {
    slug: "silk-stitched",
    title: "Silk Stitched",
    subtitle: "Refined occasion pieces",
    description: "Elegant stitched silks with polished cards, clear pricing, and an upscale campaign feel.",
    accent: "bg-[#6c8fcf]",
    banner: "Shimmering silk stitched styles",
    summary: "Refined silk looks with rich color stories and polished details.",
    products: [
      createProduct("silk-stitched", "Blue Stich Art", 850, "A bright hero silk style with a softer drape.", 16, { featured: true }),
      createProduct("silk-stitched", "Coconut Fall Silk", 850, "Light neutral styling for premium browses.", 17, { soldOut: true, badge: "Sold Out" }),
      createProduct("silk-stitched", "Pipen Way Silk", 1150, "A balanced silk option with a clean finish.", 18),
      createProduct("silk-stitched", "Suppway Silk", 1250, "A slightly richer product card for the row.", 19),
      createProduct("silk-stitched", "Licked Orange Silk", 850, "Warm tone with an easy campaign palette.", 20),
      createProduct("silk-stitched", "Maan Tuli Silk", 1150, "A deeper variant with a premium ask.", 21),
    ],
  },
  {
    slug: "pk-georgette-stitched",
    title: "PK Georgette Stitched",
    subtitle: "Bright campaign fabric",
    description: "A compact promo shelf with sale pricing and strong visual contrast.",
    accent: "bg-[#c18f2c]",
    banner: "Lightweight stitched georgette",
    summary: "Promotion-ready georgette styles with sale badges.",
    products: [
      createProduct("pk-georgette-stitched", "JolPata PakG-10", 1350, "A bright everyday seller.", 12, { featured: true }),
      createProduct("pk-georgette-stitched", "Madhobi PakG-11", 1150, "Discounted hero item with compare-at price.", 13, { compareAtPrice: 1350, badge: "-14%" }),
      createProduct("pk-georgette-stitched", "Padma Rani PakG-12", 500, "Budget-friendly promo style.", 14),
      createProduct("pk-georgette-stitched", "Aush Pia PakG-13", 1350, "A balanced alternative for carousel slots.", 15),
    ],
  },
  {
    slug: "2pcs-dresses",
    title: "2pcs Dresses",
    subtitle: "Quick outfit kits",
    description: "Two-piece dresses presented in a tight grid with fast scanning and obvious pricing.",
    accent: "bg-[#7264aa]",
    banner: "Pre-styled outfits for speed",
    summary: "Two-piece outfits for compact product shelves.",
    products: [
      createProduct("2pcs-dresses", "7Colour Rainbow", 950, "A bright, cheerful listing for homepage modules.", 16, { featured: true }),
      createProduct("2pcs-dresses", "Zafrani &7", 650, "A value-priced two-piece pick.", 17),
      createProduct("2pcs-dresses", "Zara Classic", 650, "Clean minimal styling with broad appeal.", 18),
      createProduct("2pcs-dresses", "Velvet Bloom", 1250, "A richer choice for seasonal promotions.", 19),
    ],
  },
  {
    slug: "premium-silk-saree",
    title: "Premium Silk Saree",
    subtitle: "Classic saree offers",
    description: "Premium silk sarees with a softer presentation and stronger gifting energy.",
    accent: "bg-[#b3864d]",
    banner: "Elegant sarees for gifting season",
    summary: "A premium saree collection with giftable visuals.",
    products: [
      createProduct("premium-silk-saree", "Poddo Koli", 250, "Entry-price classic silk saree.", 20),
      createProduct("premium-silk-saree", "Bokul Bela", 250, "Budget-friendly and easy to browse.", 21),
      createProduct("premium-silk-saree", "Surjomukhi", 250, "Warm tone with a soft festival feel.", 22),
      createProduct("premium-silk-saree", "Argentine Saree", 599, "Higher-value premium silk option.", 23, { featured: true }),
    ],
  },
  {
    slug: "1piece-dresses",
    title: "1piece Dresses",
    subtitle: "Simple daily wear",
    description: "One-piece dresses shown with stronger cards and more breathable card spacing.",
    accent: "bg-[#8e5e4e]",
    banner: "Single-piece dresses for fast shopping",
    summary: "One-piece dresses with a wide pricing ladder.",
    products: [
      createProduct("1piece-dresses", "BullCart", 450, "A simple starter listing.", 24),
      createProduct("1piece-dresses", "DotRace", 450, "Playful everyday wardrobe piece.", 25),
      createProduct("1piece-dresses", "Fl Story", 450, "Soft line art-inspired design.", 26),
      createProduct("1piece-dresses", "Rosy Whisper", 750, "More premium and feminine styling.", 27, { featured: true }),
    ],
  },
  {
    slug: "slub-cotton-1-piece",
    title: "Slub Cotton 1 Piece",
    subtitle: "Lightweight essentials",
    description: "Minimal, breathable pieces with a clean one-column story on mobile.",
    accent: "bg-[#6d927a]",
    banner: "Easy-wear slub cotton",
    summary: "Summer-friendly slub cotton pieces with low-friction shopping.",
    products: [
      createProduct("slub-cotton-1-piece", "Rosey Delight", 350, "Soft floral energy at an accessible price.", 28, { featured: true }),
      createProduct("slub-cotton-1-piece", "Orange Bloom", 350, "Warm tone for seasonal campaigns.", 29),
      createProduct("slub-cotton-1-piece", "Seafoam Floral", 350, "Fresh cool hue for clean grid layouts.", 30),
      createProduct("slub-cotton-1-piece", "Sunflower Glow", 350, "Bright and easy to spot in a product wall.", 31),
    ],
  },
  {
    slug: "kids-casual-outfits",
    title: "KID's Casual Outfits",
    subtitle: "Playful essentials",
    description: "Kids casual pieces with compact cards, cheerful colors, and soft visual hierarchy.",
    accent: "bg-[#df9ea0]",
    banner: "Kids outfits with playful details",
    summary: "Playful kidswear with a wide price ladder.",
    products: [
      createProduct("kids-casual-outfits", "Sunshine", 380, "A friendly entry item with warm tone.", 32),
      createProduct("kids-casual-outfits", "Bluebell", 380, "Simple and soft for quick selection.", 33),
      createProduct("kids-casual-outfits", "Lilac", 380, "Light pastel with a gentle look.", 34),
      createProduct("kids-casual-outfits", "Candy Checks", 599, "Patterned option for campaign variety.", 35, { featured: true }),
    ],
  },
  {
    slug: "limited-drops",
    title: "Limited Drops",
    subtitle: "High urgency promos",
    description: "Discount-led cards that use stronger badges and louder CTA styling.",
    accent: "bg-[#8f6f65]",
    banner: "Limited drop deals",
    summary: "Sale-heavy cards for conversion-first traffic.",
    products: [
      createProduct("limited-drops", "Amber Marble", 750, "Sale item with compare-at pricing.", 36, { compareAtPrice: 2500, badge: "-70%", featured: true }),
      createProduct("limited-drops", "Amethyst Marble", 750, "Another high-contrast promo card.", 37, { compareAtPrice: 2500, badge: "-70%" }),
      createProduct("limited-drops", "Violet Marble", 750, "Darkened marble tone with sale tagging.", 38, { compareAtPrice: 2500, badge: "-70%" }),
      createProduct("limited-drops", "Charcoal Marble", 750, "Neutral alternative for the final slot.", 39, { compareAtPrice: 2500, badge: "-70%" }),
    ],
  },
  {
    slug: "mini-fan",
    title: "Mini Fan",
    subtitle: "Single-product category",
    description: "A very small collection that should still feel complete and intentional.",
    accent: "bg-[#7d8a96]",
    banner: "Utility item spotlight",
    summary: "One utility product with a simple conversion path.",
    products: [
      createProduct("mini-fan", "China Mini Fan", 400, "A compact add-on product for the utility shelf.", 40, { featured: true }),
    ],
  },
  {
    slug: "panjabi",
    title: "Panjabi",
    subtitle: "Classic menswear",
    description: "Menswear basics presented in the same storefront structure with a broader category row.",
    accent: "bg-[#b07d3b]",
    banner: "Classic panjabi selections",
    summary: "Panjabi styles for higher seasonal demand.",
    products: [
      createProduct("panjabi", "Luxury Soft Cotton Panjabi", 350, "Soft cotton with a clean, direct card.", 41),
      createProduct("panjabi", "Zafran Crushed Panjabi", 350, "Crushed texture with a value-driven label.", 42, { soldOut: true, badge: "Sold Out" }),
      createProduct("panjabi", "Premium Cotton Panjabi", 350, "A premium everyday staple.", 43, { featured: true }),
      createProduct("panjabi", "Luxury Jacquard Textured Panjabi", 350, "Texture-forward menswear option.", 44),
    ],
  },
];

export const storefrontCollections = collectionSeeds.map((collection) => ({
  ...collection,
  products: collection.products,
}));

export const storefrontProducts = storefrontCollections.flatMap((collection) => collection.products);

export const storefrontPrimaryNav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about-us", label: "About Us" },
  { href: "/contact-us", label: "Contact Us" },
  { href: "/track-order", label: "Order Tracking" },
];

export const storefrontCategoryRail = storefrontCollections.slice(0, 8).map((collection) => ({
  href: `/shop?category=${collection.slug}`,
  label: collection.title,
}));

export const storefrontQuickTopics = [
  "Slub Cotton 1 Piece",
  "KID's Casual Outfits",
  "Limited Drops",
  "Mini Fan",
  "Panjabi",
];

export const storefrontServices = [
  { title: "Fast delivery", copy: "Dhaka and nationwide dispatch with clear order status." },
  { title: "Easy returns", copy: "A simple return process for eligible products." },
  { title: "Secure payment", copy: "Cash on delivery and mobile wallet flow." },
  { title: "Friendly support", copy: "Live help through phone and Messenger." },
];

export const storefrontHighlights = [
  {
    title: "New season fabrics",
    copy: "Warm neutral campaigns with layered product story cards.",
    tone: "from-[#d98f2e] to-[#7c4620]",
  },
  {
    title: "Urgent sale drops",
    copy: "Bold badges and compare-at pricing for the limited row.",
    tone: "from-[#8d4960] to-[#3a2032]",
  },
];

export const storefrontPolicyPages: Record<string, StaticPage> = {
  "about-us": {
    eyebrow: `About ${siteBrand.name}`,
    title: "Designed for quick fashion campaigns",
    intro: `${siteBrand.name} presents compact collections, clear pricing, and a storefront that is easy to scan on mobile.`,
    body: [
      "The public layout leans on big product shelves, a visible utility bar, and prominent collection shortcuts.",
      "It is built for shoppers who arrive from social ads and need a straightforward path to products, filters, and checkout.",
      "The rebuild in this project keeps that structure while making the theme easy to change from one central set of tokens.",
    ],
  },
  "contact-us": {
    eyebrow: "Contact",
    title: "Get in touch with the store team",
    intro: "The reference site pushes contact information into the header, footer, and order flow so shoppers can reach support quickly.",
    body: [
      "Address: মাকসুদ টাওয়ার লেভেল ১, NCC ব্যাংকের নিচে ৬৫ এলিফ্যান্ট রোড, স্টার্ন মল্লিকা এবং স্টার হোটেল সংলগ্ন, ঢাকা ১২০৫।",
      "Phone: +8809639279024",
      `Email: ${siteBrand.supportEmail}`,
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Simple answers for common shopping questions",
    intro: "The public FAQ page is intentionally compact, with a couple of direct answers instead of a long support article.",
    body: [
      "How do I order? Add a product, review the cart, and proceed to checkout.",
      "Can I pay cash on delivery? The storefront surfaces COD alongside mobile money options.",
      "Do you ship nationwide? The layout presents nationwide delivery as a core store promise.",
    ],
  },
  "track-order": {
    eyebrow: "Order tracking",
    title: "Track your invoice in a single field",
    intro: "The reference page keeps order tracking lightweight: enter the invoice number and continue.",
    body: [
      "The rebuilt page keeps that same emphasis but styles it as a proper utility panel with a visible call to action.",
      "It can be connected to backend tracking later without changing the page chrome.",
    ],
  },
  "privacy": {
    eyebrow: "Privacy policy",
    title: "Customer data handling",
    intro: "This page mirrors the footer policy links from the public storefront and keeps the legal copy easy to scan.",
    body: [
      "We only use the information needed to process orders, support delivery, and provide customer service.",
      "The legal text is presentational in this frontend-only rebuild and can be replaced with the store's final policy copy later.",
    ],
  },
  terms: {
    eyebrow: "Terms of service",
    title: "Store usage and order terms",
    intro: "The live site presents its terms in Bangla; this rebuild keeps the structure and uses concise sections.",
    body: [
      "Use the shop for lawful purposes and do not misuse images, text, or trademarks.",
      "Orders, payment flow, and delivery timelines should always follow the store's published rules.",
    ],
  },
  "cookie-policy": {
    eyebrow: "Cookie policy",
    title: "How the storefront uses cookies",
    intro: "Cookie disclosure is included in the footer and is surfaced as a dedicated public page here.",
    body: [
      "Cookies support cart state, session continuity, and basic analytics where configured.",
      "The policy page is intentionally minimal because the implementation in this repository stays frontend-focused.",
    ],
  },
};

export function getCollectionBySlug(slug: string) {
  return storefrontCollections.find((collection) => collection.slug === slug) ?? null;
}

export function getProductBySlug(slug: string) {
  return storefrontProducts.find((product) => product.slug === slug) ?? null;
}

export function getRelatedProducts(productSlug: string, collectionSlug: string, limit = 4) {
  return storefrontProducts
    .filter((product) => product.collectionSlug === collectionSlug && product.slug !== productSlug)
    .slice(0, limit);
}

export function searchStorefrontProducts(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return storefrontProducts;
  return storefrontProducts.filter((product) => {
    return [product.name, product.description, product.collectionSlug, product.badge ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}
