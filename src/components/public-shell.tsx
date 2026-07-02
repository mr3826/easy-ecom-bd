import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteAnalytics } from "@/components/site-analytics";
import { getSettings } from "@/server/store";
import { getCurrentUser } from "@/server/auth";
import { getCartSummary, getOrCreateCart } from "@/server/store";
import { storefrontProducts } from "@/lib/mokkah-storefront";
import { money } from "@/lib/utils";
import { siteBrand } from "@/lib/site-brand";

function buildFallbackCartSummary() {
  const fallbackProducts = storefrontProducts.slice(0, 2);
  const items = fallbackProducts.map((product, index) => ({
    id: `fallback-cart-item-${index + 1}`,
    productId: product.slug,
    quantity: index + 1,
    lineTotal: product.price * (index + 1),
    product: {
      id: product.slug,
      name: product.name,
      sku: `MFB-${index + 1}`,
      slug: product.slug,
      price: product.price,
    },
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    formattedSubtotal: money(subtotal),
    couponCode: null,
  };
}

export async function PublicShell({
  children,
  showCategoryRail = true,
}: {
  children: ReactNode;
  showCategoryRail?: boolean;
}) {
  const settings = await getSettings();
  const cookieStore = await cookies();
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const guestKey = cookieStore.get("easy_ecom_guest")?.value ?? "guest-preview";
  const user = hasDatabase ? await getCurrentUser() : null;
  const cartSummary = hasDatabase
    ? await getCartSummary(await getOrCreateCart(guestKey, user?.id))
    : buildFallbackCartSummary();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3de_0%,#f5efe5_34%,#eef2f6_100%)] text-[color:var(--foreground)]">
      <SiteAnalytics />
      <SiteHeader
        storeName={settings.storeName}
        contactNumber={settings.contactNumber}
        supportEmail={settings.supportEmail ?? siteBrand.supportEmail}
        cartSummary={cartSummary}
        showCategoryRail={showCategoryRail}
      />
      <main className="pb-20 sm:pb-0">{children}</main>
      <SiteFooter />
    </div>
  );
}
