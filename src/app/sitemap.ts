import { listProducts, listCategories } from "@/server/store";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const baseUrl = getSiteOrigin();

  const staticRoutes = [
    "",
    "/shop",
    "/about-us",
    "/contact-us",
    "/privacy",
    "/terms",
    "/faq",
    "/cookie-policy",
    "/track-order",
    "/search",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const [products, categories] = await Promise.all([listProducts(), listCategories()]);

  const productRoutes = products
    .filter((product) => product.isActive && !product.archivedAt)
    .map((product) => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  const categoryRoutes = categories
    .filter((category) => category.isActive)
    .map((category) => ({
      url: `${baseUrl}/shop?category=${category.slug}`,
      lastModified: category.updatedAt ? new Date(category.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
