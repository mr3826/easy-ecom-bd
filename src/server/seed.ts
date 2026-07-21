import { hashSync } from "bcryptjs";
import type { DatabaseState } from "@/lib/domain";
import { storefrontCollections } from "@/lib/bornohin-storefront";
import { homepageCarouselItemsTemplate } from "@/lib/homepage-carousel";
import { createDefaultProductMetadata } from "@/lib/product-admin";
import { slugify } from "@/lib/utils";
import { siteBrand } from "@/lib/site-brand";

const now = new Date().toISOString();

function buildKeywords(parts: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      parts
        .map((part) => part?.trim().toLowerCase())
        .filter((part): part is string => Boolean(part)),
    ),
  );
}

export function createSeedState(): DatabaseState {
  const brand = {
    id: "brand-bornohin",
    name: siteBrand.name,
    slug: slugify(siteBrand.name),
    description: `Official ${siteBrand.name} catalog`,
    isActive: true,
  };

  const categories = storefrontCollections.map((collection) => ({
    id: `cat-${collection.slug}`,
    name: collection.title,
    slug: collection.slug,
    description: collection.description,
    isActive: true,
  }));

  const products: DatabaseState["products"] = storefrontCollections.flatMap((collection, collectionIndex) =>
    collection.products.map((product, productIndex) => {
      const soldOut = Boolean(product.soldOut);
      return {
        id: `prod-${collection.slug}-${product.slug}`,
        name: product.name,
        slug: product.slug,
        sku: `BOR-${String(collectionIndex + 1).padStart(2, "0")}-${String(productIndex + 1).padStart(2, "0")}`,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: soldOut ? 0 : product.featured ? 24 : 18,
        lowStockThreshold: 5,
        categoryId: categories[collectionIndex].id,
        brandId: brand.id,
        isActive: !soldOut,
        featured: Boolean(product.featured),
        archivedAt: soldOut ? now : null,
        weightGrams: 0,
        tags: [collection.slug, product.badge ? product.badge.toLowerCase() : null].filter(Boolean) as string[],
        searchKeywords: buildKeywords([
          product.name,
          product.description,
          collection.title,
          collection.subtitle,
          collection.description,
          product.badge,
          collection.slug,
        ]),
        metadata: {
          ...createDefaultProductMetadata(),
          source: "manual",
          minOrderQuantity: 1,
          returnable: true,
          variantGroups: [],
        },
        createdAt: now,
      };
    }),
  );

  const productImages = products.map((product) => ({
    id: `img-${product.id}`,
    productId: product.id,
    url: "/hero-products.png",
    alt: product.name,
    sortOrder: 1,
  }));

  const adminUser = {
    id: "user-admin",
    name: "Admin User",
    email: "admin@easy-ecom.test",
    passwordHash: hashSync("admin1234", 10),
    role: "admin" as const,
    phone: "01700000000",
    createdAt: now,
  };

  const customerUser = {
    id: "user-customer",
    name: "Amina Rahman",
    email: "amina@example.com",
    passwordHash: hashSync("customer1234", 10),
    role: "customer" as const,
    phone: "01811111111",
    createdAt: now,
  };

  const demoOrderProducts = products.slice(0, 2);
  const demoOrderSubtotal = demoOrderProducts.reduce((sum, product) => sum + product.price, 0);

  return {
    users: [adminUser, customerUser],
    categories,
    brands: [brand],
    products,
    productImages,
    carts: [
      {
        id: "cart-demo",
        ownerId: customerUser.id,
        guestKey: "demo",
        items: [{ id: "cart-item-1", productId: products[0].id, quantity: 1 }],
        updatedAt: now,
      },
    ],
    orders: [
      {
        id: "order-1",
        orderCode: "EE-240621-1001",
        customerId: customerUser.id,
        customerName: customerUser.name,
        customerPhone: customerUser.phone ?? "",
        customerEmail: customerUser.email,
        district: "Dhaka",
        shippingAddress: "House 22, Road 4, Dhanmondi, Dhaka",
        deliveryCharge: 80,
        discountAmount: 90,
        subtotal: demoOrderSubtotal,
        total: demoOrderSubtotal - 90 + 80,
        status: "confirmed",
        paymentStatus: "processing",
        deliveryStatus: "in_transit",
        paymentProvider: "bkash",
        deliveryZone: "inside_dhaka",
        notes: "Ring before delivery",
        adminNotes: "Seed order for operations dashboard",
        createdAt: now,
        updatedAt: now,
        items: demoOrderProducts.map((product, index) => ({
          id: `order-item-${index + 1}`,
          productId: product.id,
          quantity: 1,
          unitPrice: product.price,
          lineTotal: product.price,
        })),
      },
    ],
    payments: [
      {
        id: "pay-1",
        orderId: "order-1",
        provider: "bkash",
        transactionId: "TXN-EE-1001",
        amount: demoOrderSubtotal - 90 + 80,
        status: "processing",
        rawResponse: { status: "processing", gateway: "demo" },
        createdAt: now,
        updatedAt: now,
      },
    ],
    paymentLogs: [],
    orderStatusHistory: [
      {
        id: "osh-1",
        orderId: "order-1",
        fromStatus: null,
        toStatus: "confirmed",
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        note: "Seed confirmed order",
        createdAt: now,
      },
    ],
    landingPages: [
      {
        id: "lp-home",
        slug: "home",
        title: "Home",
        metaDescription: "Homepage carousel and storefront campaign content.",
        heroTitle: "Fresh, image-led fashion shelves built for quick browsing",
        heroSubtitle: "Move through featured collections with admin-managed slides.",
        bannerImageUrl: "/hero-fashion-1.svg",
        published: true,
        attachedProductIds: products.slice(0, 4).map((product) => product.id),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lp-1",
        slug: "ramadan-collection",
        title: "Ramadan Collection",
        metaDescription: "Curated offers for your campaign landing page.",
        heroTitle: "Big bundles, same-day conversion",
        heroSubtitle: "Custom landing pages, attached products, and direct wallet checkout for Bangladesh.",
        bannerImageUrl: "/hero-products.png",
        published: true,
        attachedProductIds: products.slice(0, 2).map((product) => product.id),
        createdAt: now,
        updatedAt: now,
      },
    ],
    landingPageSections: [
      {
        id: "lp-section-home-carousel",
        landingPageId: "lp-home",
        type: "carousel",
        title: "Homepage carousel",
        subtitle: "Featured",
        body: "Admin-managed homepage slider.",
        imageUrl: "/hero-fashion-1.svg",
        productIds: [],
        items: JSON.parse(homepageCarouselItemsTemplate),
        ctaLabel: "Shop now",
        ctaHref: "/shop",
        sortOrder: 1,
      },
      {
        id: "lp-section-1",
        landingPageId: "lp-1",
        type: "banner",
        title: "Ramadan Sale",
        subtitle: "Fast deals for mobile shoppers",
        body: "Highlight urgency, benefits, and direct payment.",
        imageUrl: "/hero-products.png",
        productIds: [products[0].id],
        items: [],
        ctaLabel: "Shop now",
        ctaHref: "/checkout",
        sortOrder: 1,
      },
      {
        id: "lp-section-2",
        landingPageId: "lp-1",
        type: "faq",
        title: "Frequently asked",
        subtitle: "Clear objections before checkout",
        body: "",
        productIds: [],
        items: [
          { title: "Do you support bKash?", body: "Yes, direct merchant checkout is built in." },
          { title: "Can I manage delivery status?", body: "Yes, order delivery status and delivery zones are managed from admin." },
        ],
        sortOrder: 2,
      },
    ],
    coupons: [
      {
        id: "coupon-1",
        code: "BD10",
        description: "10% off for campaign traffic",
        type: "percentage",
        value: 10,
        minOrderAmount: 1000,
        isActive: true,
      },
    ],
    inventoryLogs: [],
    settings: {
      storeName: siteBrand.name,
      logoText: siteBrand.name,
      logoUrl: null,
      supportEmail: siteBrand.supportEmail,
      contactNumber: "01700 123 456",
      address: "Dhanmondi, Dhaka, Bangladesh",
      businessHours: "10:00 AM - 8:00 PM",
      deliveryAreas: ["Inside Dhaka", "Sub-Dhaka", "Outside Dhaka"],
      returnRefundPolicy: "Return requests are reviewed within 3 days of delivery.",
      confirmationMessageTemplate: "Thanks for your order. We will confirm it shortly.",
      metaPixelId: null,
      gtmContainerId: null,
      deliveryCharge: 80,
      freeDeliveryThreshold: 1990,
      codEnabled: true,
      bkashEnabled: true,
      bkashAccountNumber: "01700123456",
      bkashInstructions: "Send payment to bKash merchant number and share transaction ID.",
      nagadEnabled: false,
      nagadAccountNumber: null,
      nagadInstructions: "",
      rocketEnabled: false,
      rocketAccountNumber: null,
      rocketInstructions: "",
      insideDhakaDeliveryCharge: 80,
      subDhakaDeliveryCharge: 100,
      outsideDhakaDeliveryCharge: 130,
      insideDhakaCodEnabled: true,
      subDhakaCodEnabled: true,
      outsideDhakaCodEnabled: true,
    },
    auditLogs: [
      {
        id: "audit-1",
        actorEmail: adminUser.email,
        action: "seed",
        entity: "system",
        entityId: "seed",
        oldValue: null,
        newValue: { message: "Initial demo content created" },
        createdAt: now,
      },
    ],
  };
}

export function defaultLandingSlug(title: string) {
  return slugify(title);
}
