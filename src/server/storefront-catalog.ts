import { cache } from "react";
import type { Brand, Product, ProductImage } from "@/lib/domain";
import {
  storefrontCollections,
  type StorefrontCollection,
  type StorefrontProduct,
} from "@/lib/bornohin-storefront";
import { listBrands, listCategories, listProductImages, listProducts } from "@/server/store";

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
  collection: Pick<StorefrontCollection, "slug" | "title">,
  brand: Pick<Brand, "slug" | "name"> | undefined,
  templateCollection: StorefrontCollection | undefined,
  image: ProductImage | undefined,
  fallbackIndex: number,
): StorefrontProduct {
  const templateProducts = templateCollection?.products ?? [];
  const templateProduct =
    templateProducts.find((entry) => entry.slug === product.slug) ??
    templateProducts[fallbackIndex % Math.max(templateProducts.length, 1)] ??
    templateProducts[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    collectionSlug: collection.slug,
    collectionTitle: collection.title,
    brandSlug: brand?.slug,
    brandTitle: brand?.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? templateProduct?.compareAtPrice,
    badge: isSoldOut(product) ? "Sold Out" : templateProduct?.badge,
    description: product.description,
    tone: templateProduct?.tone ?? "from-[#e6ddd0] via-[#f2ece4] to-[#cbb9a4]",
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt ?? product.name,
    featured: Boolean(product.featured || templateProduct?.featured),
    soldOut: isSoldOut(product),
  };
}

async function resolveBackendCollections(): Promise<ResolvedStorefrontCollection[]> {
  const [categories, brands, products, productImages] = await Promise.all([listCategories(), listBrands(), listProducts(), listProductImages()]);
  const templateBySlug = new Map(storefrontCollections.map((collection) => [collection.slug, collection] as const));
  const brandById = new Map(brands.filter((brand) => brand.isActive).map((brand) => [brand.id, brand] as const));
  const productsByCategoryId = new Map<string, Product[]>();
  const imagesByProductId = new Map<string, ProductImage>();

  for (const image of productImages) {
    if (!imagesByProductId.has(image.productId)) {
      imagesByProductId.set(image.productId, image);
    }
  }

  for (const product of products.filter((entry) => entry.isActive && !entry.archivedAt)) {
    const list = productsByCategoryId.get(product.categoryId) ?? [];
    list.push(product);
    productsByCategoryId.set(product.categoryId, list);
  }

  const activeCategories = categories.filter((category) => category.isActive);
  const resolved = activeCategories
    .map((category) => {
      const templateCollection = templateBySlug.get(category.slug);
      const collectionProducts = productsByCategoryId.get(category.id) ?? [];

      if (!collectionProducts.length) {
        return null;
      }

      return {
        slug: category.slug,
        title: category.name,
        subtitle: templateCollection?.subtitle ?? "Shop collection",
        description: category.description || templateCollection?.description || "Browse the latest products in this collection.",
        accent: templateCollection?.accent ?? "bg-[color:var(--brand)]",
        banner: templateCollection?.banner ?? `Shop ${category.name}`,
        summary: templateCollection?.summary ?? category.description,
        products: collectionProducts.map((product, index) =>
          toStorefrontProduct(
            product,
            { slug: category.slug, title: category.name },
            product.brandId ? brandById.get(product.brandId) : undefined,
            templateCollection,
            imagesByProductId.get(product.id),
            index,
          ),
        ),
      } satisfies StorefrontCollection;
    })
    .filter((collection): collection is StorefrontCollection => Boolean(collection));

  // An empty catalogue means an empty shop. This used to fall back to
  // storefrontCollections, which put 51 template products with prices in front
  // of real customers whenever the database had none - a freshly launched or
  // freshly wiped store advertised merchandise that did not exist and could not
  // be checked out. storefrontCollections stays a presentation template above
  // (tone, badges); it is not a catalogue.
  return resolved;
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

export const getStorefrontBrandRail = cache(async function getStorefrontBrandRail() {
  const products = await getStorefrontProducts();
  const brandEntries = new Map<string, StorefrontRailEntry>();
  for (const product of products) {
    if (product.brandSlug && product.brandTitle) {
      brandEntries.set(product.brandSlug, {
        href: `/shop?brand=${product.brandSlug}`,
        label: product.brandTitle,
      });
    }
  }
  return Array.from(brandEntries.values());
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

export const getStorefrontBrandBySlug = cache(async function getStorefrontBrandBySlug(slug: string) {
  const brands = await getStorefrontBrandRail();
  return brands.find((brand) => brand.href === `/shop?brand=${slug}`) ?? null;
});

export const getStorefrontRelatedProducts = cache(async function getStorefrontRelatedProducts(
  productSlug: string,
  collectionSlug: string,
  limit = 4,
) {
  const collection = await getStorefrontCollectionBySlug(collectionSlug);
  // No template fallback: related products must be real products, or none.
  return collection?.products.filter((product) => product.slug !== productSlug).slice(0, limit) ?? [];
});

export const searchStorefrontProducts = cache(async function searchStorefrontProducts(query: string) {
  const normalized = query.trim().toLowerCase();
  const products = await getStorefrontProducts();
  if (!normalized) return products;
  return products.filter((product) =>
    [product.name, product.description, product.collectionSlug, product.collectionTitle ?? "", product.brandTitle ?? "", product.badge ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
});

export const filterStorefrontProducts = cache(async function filterStorefrontProducts(query: string, categorySlug?: string, brandSlug?: string) {
  const normalizedCategory = categorySlug?.trim();
  const normalizedBrand = brandSlug?.trim();
  const products = await searchStorefrontProducts(query);
  return products.filter((product) => {
    if (normalizedCategory && product.collectionSlug !== normalizedCategory) return false;
    if (normalizedBrand && product.brandSlug !== normalizedBrand) return false;
    return true;
  });
});
