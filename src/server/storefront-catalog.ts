import { cache } from "react";
import type { Product } from "@/lib/domain";
import {
  storefrontCollections,
  type StorefrontCollection,
  type StorefrontProduct,
} from "@/lib/bornohin-storefront";
import { listCategories, listProducts } from "@/server/store";

type StorefrontRailEntry = {
  href: string;
  label: string;
};

type ResolvedStorefrontCollection = StorefrontCollection;

function isSoldOut(product: Product) {
  return Boolean(product.archivedAt) || !product.isActive || product.stock <= 0;
}

function toStorefrontProduct(
  product: Product,
  templateCollection: StorefrontCollection,
  fallbackIndex: number,
): StorefrontProduct {
  const templateProduct =
    templateCollection.products.find((entry) => entry.slug === product.slug) ??
    templateCollection.products[fallbackIndex % Math.max(templateCollection.products.length, 1)] ??
    templateCollection.products[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    collectionSlug: templateCollection.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? templateProduct?.compareAtPrice,
    badge: isSoldOut(product) ? "Sold Out" : templateProduct?.badge,
    description: product.description,
    tone: templateProduct?.tone ?? "from-[#e6ddd0] via-[#f2ece4] to-[#cbb9a4]",
    featured: Boolean(product.featured || templateProduct?.featured),
    soldOut: isSoldOut(product),
  };
}

async function resolveBackendCollections(): Promise<ResolvedStorefrontCollection[]> {
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category] as const));
  const productsByCategoryId = new Map<string, Product[]>();

  for (const product of products) {
    const list = productsByCategoryId.get(product.categoryId) ?? [];
    list.push(product);
    productsByCategoryId.set(product.categoryId, list);
  }

  return storefrontCollections.map((templateCollection) => {
    const category = categoriesBySlug.get(templateCollection.slug);
    const collectionProducts = category ? productsByCategoryId.get(category.id) ?? [] : [];

    if (!collectionProducts.length) {
      return templateCollection;
    }

    return {
      ...templateCollection,
      products: collectionProducts.map((product, index) => toStorefrontProduct(product, templateCollection, index)),
    };
  });
}

export const getStorefrontCollections = cache(async function getStorefrontCollections() {
  return resolveBackendCollections();
});

export const getStorefrontCategoryRail = cache(async function getStorefrontCategoryRail() {
  const collections = await getStorefrontCollections();
  return collections.map((collection) => ({
    href: `/shop?category=${collection.slug}`,
    label: collection.title,
  })) satisfies StorefrontRailEntry[];
});

export const getStorefrontProducts = cache(async function getStorefrontProducts() {
  const collections = await getStorefrontCollections();
  return collections.flatMap((collection) => collection.products);
});

export const getStorefrontCollectionBySlug = cache(async function getStorefrontCollectionBySlug(slug: string) {
  const collections = await getStorefrontCollections();
  return collections.find((collection) => collection.slug === slug) ?? null;
});

export const getStorefrontProductBySlug = cache(async function getStorefrontProductBySlug(slug: string) {
  const products = await getStorefrontProducts();
  return products.find((product) => product.slug === slug) ?? null;
});

export const getStorefrontRelatedProducts = cache(async function getStorefrontRelatedProducts(
  productSlug: string,
  collectionSlug: string,
  limit = 4,
) {
  const collection = await getStorefrontCollectionBySlug(collectionSlug);
  return (
    collection?.products.filter((product) => product.slug !== productSlug).slice(0, limit) ??
    storefrontCollections
      .find((entry) => entry.slug === collectionSlug)
      ?.products.filter((product) => product.slug !== productSlug)
      .slice(0, limit) ??
    []
  );
});

export const searchStorefrontProducts = cache(async function searchStorefrontProducts(query: string) {
  const normalized = query.trim().toLowerCase();
  const products = await getStorefrontProducts();
  if (!normalized) return products;
  return products.filter((product) =>
    [product.name, product.description, product.collectionSlug, product.badge ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
});
