"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Menu, CircleUserRound, ChevronDown, Heart, Trash2, Minus, Plus } from "lucide-react";
import { money } from "@/lib/utils";
import { storefrontCategoryRail, storefrontPrimaryNav } from "@/lib/bornohin-storefront";
import { siteBrand } from "@/lib/site-brand";
import { SiteLogo } from "@/components/site-logo";
import { LogoutButton } from "@/components/logout-button";
import { addToCartAction, clearCartAction, removeCartItemAction, updateCartQuantityAction } from "@/app/actions";
import { readWishlistItems, removeWishlistItem, type WishlistItem } from "@/lib/wishlist";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type CartSummaryItem = {
  id: string;
  productId: string;
  quantity: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
    sku: string;
    slug: string;
    price: number;
  };
};

type CartSummary = {
  items: CartSummaryItem[];
  subtotal: number;
  itemCount: number;
  formattedSubtotal: string;
  couponCode?: string | null;
};

type SiteHeaderProps = {
  storeName: string;
  logoText: string;
  logoUrl?: string | null;
  contactNumber: string;
  supportEmail: string;
  cartSummary: CartSummary;
  categoryRail?: Array<{ href: string; label: string }>;
  showCategoryRail?: boolean;
  currentUser?: {
    name: string;
    email: string;
    role: "customer" | "admin" | "super_admin";
  } | null;
  insideDhakaDeliveryCharge: number;
  subDhakaDeliveryCharge: number;
  outsideDhakaDeliveryCharge: number;
};

export function SiteHeader({
  storeName,
  logoText,
  logoUrl,
  contactNumber,
  supportEmail,
  cartSummary,
  categoryRail,
  showCategoryRail = true,
  currentUser = null,
  insideDhakaDeliveryCharge,
  subDhakaDeliveryCharge,
  outsideDhakaDeliveryCharge,
}: SiteHeaderProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"cart" | "wishlist" | null>(null);
  const [query, setQuery] = useState("");
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const cartItems = cartSummary.items;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const accountHref = isAdmin ? "/admin" : "/account";
  const accountLabel = isAdmin ? "Admin dashboard" : "My account";

  useEffect(() => {
    const syncWishlist = () => setWishlistItems(readWishlistItems());
    syncWishlist();
    window.addEventListener("easy-ecom:wishlist-change", syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener("easy-ecom:wishlist-change", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, []);

  const closeAllOverlays = () => {
    setMobileOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
    setActivePanel(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAllOverlays();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?query=${encodeURIComponent(trimmed)}` : "/search");
    closeAllOverlays();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-white/95">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={storeName} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#ece7e0] bg-white p-1.5 shadow-[0_12px_24px_rgba(139,0,0,0.08)] sm:h-14 sm:w-14 sm:rounded-[1.15rem]">
            <SiteLogo logoUrl={logoUrl} size={96} className="h-full w-full object-contain" />
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-[1.05rem] font-black tracking-[0.02em] text-[color:var(--brand)]">{logoText}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.42em] text-[color:var(--muted)]">{siteBrand.tagline}</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="hidden flex-1 items-stretch overflow-hidden rounded-full border-2 border-[color:var(--brand)] bg-white shadow-[0_8px_24px_rgba(139,0,0,0.08)] lg:flex">
          <label className="flex min-w-0 flex-1 items-center">
            <span className="sr-only">Search products</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm text-[color:var(--foreground)] outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-5 text-[color:var(--brand)] transition hover:text-[color:var(--accent)]"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <button
            type="button"
            onClick={() => {
              setActivePanel("wishlist");
              setAccountOpen(false);
              setSearchOpen(false);
              setMobileOpen(false);
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
            aria-label="Wishlist"
            aria-expanded={activePanel === "wishlist"}
            aria-controls="wishlist-drawer"
          >
            <Heart className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePanel("cart");
              setAccountOpen(false);
              setSearchOpen(false);
              setMobileOpen(false);
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
            aria-label="Cart"
            aria-expanded={activePanel === "cart"}
            aria-controls="cart-drawer"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAccountOpen((current) => !current);
              setActivePanel(null);
              setSearchOpen(false);
              setMobileOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)] shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
            aria-label="Account"
            aria-expanded={accountOpen}
            aria-controls="account-popover"
          >
            <CircleUserRound className="h-5 w-5 text-[color:var(--brand)]" />
            <span className="max-w-28 truncate">{currentUser?.name.split(" ")[0] || "Account"}</span>
            <ChevronDown className="h-4 w-4 text-[color:var(--muted)]" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--brand)]"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--brand)] text-white"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {accountOpen ? (
        <div className="fixed inset-0 z-50" role="presentation" onClick={() => setAccountOpen(false)}>
          {/* A disclosure popover, not a modal. It previously claimed
              aria-modal="true" without trapping focus, which tells assistive
              tech the rest of the page is inert when it is not. The trigger's
              aria-expanded/aria-controls is the correct contract here. */}
          <div
            id="account-popover"
            aria-label="Account options"
            className="absolute right-4 top-24 w-[min(92vw,20rem)] rounded-[1.5rem] border border-[color:var(--border)] bg-white p-3 shadow-[0_24px_80px_rgba(139,0,0,0.14)] sm:top-28 lg:right-8 lg:top-24"
            onClick={(event) => event.stopPropagation()}
          >
            {currentUser ? (
              <div className="grid gap-3">
                <div className="border-b border-[color:var(--border)] px-2 pb-3">
                  <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{currentUser.name}</p>
                  <p className="mt-1 truncate text-xs text-[color:var(--muted)]">{currentUser.email}</p>
                </div>
                <Link
                  href={accountHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand)] px-5 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(139,0,0,0.18)] transition hover:bg-[color:var(--accent)]"
                  onClick={() => setAccountOpen(false)}
                >
                  {accountLabel}
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <div className="grid gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white px-5 py-3 text-base font-semibold text-[color:var(--brand)] transition hover:border-[color:var(--brand)]"
                  onClick={() => setAccountOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand)] px-5 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(139,0,0,0.18)] transition hover:bg-[color:var(--accent)]"
                  onClick={() => setAccountOpen(false)}
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showCategoryRail ? (
        <div className="border-t border-[color:var(--border)] bg-[color:var(--surface-soft)]">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-3 text-sm font-medium text-[color:var(--foreground)] sm:px-6 lg:px-8">
            {(categoryRail ?? storefrontCategoryRail).map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="whitespace-nowrap rounded-full px-2 py-1 transition hover:text-[color:var(--brand)]"
              >
                {entry.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {activePanel === "cart" ? (
        <Drawer
          open
          onClose={closeAllOverlays}
          title="Shopping cart"
          description={`${cartSummary.itemCount} item${cartSummary.itemCount === 1 ? "" : "s"}`}
          footer={
            <>
              <dl className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[color:var(--muted)]">Subtotal</dt>
                  <dd className="text-base font-medium text-[color:var(--brand)]">{money(cartSummary.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[color:var(--muted)]">Delivery</dt>
                  <dd className="text-base font-medium text-[color:var(--brand)]">
                    {money(Math.min(insideDhakaDeliveryCharge, subDhakaDeliveryCharge, outsideDhakaDeliveryCharge))} - {money(Math.max(insideDhakaDeliveryCharge, subDhakaDeliveryCharge, outsideDhakaDeliveryCharge))}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4">
                  <dt className="text-base font-semibold text-[color:var(--foreground)]">Total</dt>
                  <dd className="text-2xl font-bold text-[color:var(--brand)]">{money(cartSummary.subtotal)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                onClick={closeAllOverlays}
                className="touch-target mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--accent)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_30px_rgba(184,134,11,0.18)] transition hover:bg-[color:var(--brand)]"
              >
                Proceed to Checkout
              </Link>
              <form action={clearCartAction} className="mt-3">
                <Button type="submit" variant="secondary" fullWidth pendingWhileSubmitting pendingLabel="Clearing…">
                  Clear Cart
                </Button>
              </form>
            </>
          }
        >
          <div>
            <div className="rounded-[1.5rem] border border-[#f2d37a] bg-gradient-to-r from-[#fff3cc] to-[#fff7df] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe7a8] text-xl">🎁</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">আর মাত্র 2টি প্রোডাক্ট নিলে পাচ্ছেন ফ্রি ডেলিভারি!</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60">
                    <div className="h-full w-1/3 rounded-full bg-[color:var(--accent)]" />
                  </div>
                </div>
                <span className="text-sm font-semibold text-[color:var(--accent)]">1/3</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {cartItems.length ? (
                cartItems.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-[color:var(--border)] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#efb2a9,#b76e79)] text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                        {item.product.name.split(" ").slice(0, 2).map((word) => word.charAt(0)).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-[color:var(--foreground)]">{item.product.name}</h3>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">SKU: {item.product.sku}</p>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">Color: Black</p>
                          </div>
                          <p className="text-lg font-semibold text-[color:var(--brand)]">{money(item.lineTotal)}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          {item.quantity > 1 ? (
                            <form action={updateCartQuantityAction}>
                              <input type="hidden" name="productId" value={item.productId} />
                              <input type="hidden" name="quantity" value={item.quantity - 1} />
                              <button
                                type="submit"
                                className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--muted)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                                aria-label={`Decrease quantity for ${item.product.name}`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </form>
                          ) : (
                            <form action={removeCartItemAction}>
                              <input type="hidden" name="productId" value={item.productId} />
                              <button
                                type="submit"
                                className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--muted)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                                aria-label={`Remove ${item.product.name} from cart`}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            </form>
                          )}
                          <span className="min-w-10 text-center text-lg font-medium text-[color:var(--foreground)]">{item.quantity}</span>
                          <form action={updateCartQuantityAction}>
                            <input type="hidden" name="productId" value={item.productId} />
                            <input type="hidden" name="quantity" value={item.quantity + 1} />
                            <button
                              type="submit"
                              className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-[color:var(--muted)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                              aria-label={`Increase quantity for ${item.product.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </form>
                          <form action={removeCartItemAction} className="ml-auto">
                            <input type="hidden" name="productId" value={item.productId} />
                            <button
                              type="submit"
                              className="touch-target inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--brand)] transition hover:bg-[color:var(--brand-soft)]"
                              aria-label={`Remove ${item.product.name} from cart`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-6 text-center text-sm text-[color:var(--muted)]">
                  Your cart is empty.
                </div>
              )}
            </div>
          </div>
        </Drawer>
      ) : null}

      {activePanel === "wishlist" ? (
        <Drawer
          open
          onClose={closeAllOverlays}
          title="My wishlist"
          description={`${wishlistItems.length} saved item${wishlistItems.length === 1 ? "" : "s"}`}
          className="sm:w-[min(100vw,30rem)]"
          footer={
            <Link
              href="/shop"
              onClick={closeAllOverlays}
              className="touch-target inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--brand)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_30px_rgba(139,0,0,0.18)] transition hover:bg-[color:var(--accent)]"
            >
              Continue Shopping
            </Link>
          }
        >
          <div>
            <div className="space-y-4">
              {wishlistItems.length ? (
                wishlistItems.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] border border-[color:var(--border)] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone} text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white sm:h-28 sm:w-28 sm:text-xs sm:tracking-[0.24em]`}>
                        {item.name}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-[color:var(--foreground)] sm:text-lg">{item.name}</h3>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">SKU: {item.sku ?? item.slug}</p>
                        <form action={addToCartAction} className="mt-4">
                          <input type="hidden" name="productId" value={item.id} />
                          <input type="hidden" name="quantity" value="1" />
                          <button
                            type="submit"
                            onClick={closeAllOverlays}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--brand)]"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Add to Cart
                          </button>
                        </form>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWishlistItems(removeWishlistItem(item.id))}
                        className="touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[color:var(--brand)] transition hover:bg-[color:var(--brand-soft)]"
                        aria-label={`Remove ${item.name} from wishlist`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] p-6 text-center text-sm text-[color:var(--muted)]">
                  Your wishlist is empty.
                </div>
              )}
            </div>
          </div>
        </Drawer>
      ) : null}

      {mobileOpen ? (
        <Drawer
          open
          onClose={closeAllOverlays}
          title="Menu"
          description={storeName}
          className="sm:w-[min(92vw,24rem)]"
        >
          <div className="-mx-4 sm:-mx-6">
            <form onSubmit={submitSearch} className="border-b border-[color:var(--border)] p-4">
              <label className="grid gap-2 text-sm font-medium text-[color:var(--foreground)]">
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none"
                />
              </label>
              <button
                type="submit"
                className="touch-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--brand)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </button>
            </form>

            <div className="border-b border-[color:var(--border)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">Quick links</p>
              <div className="mt-3 grid gap-2">
                {storefrontPrimaryNav.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)]"
                    onClick={closeAllOverlays}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-b border-[color:var(--border)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">Account</p>
              {currentUser ? (
                <div className="mt-3 grid gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{currentUser.name}</p>
                    <p className="mt-1 truncate text-xs text-[color:var(--muted)]">{currentUser.email}</p>
                  </div>
                  <Link
                    href={accountHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand)] px-4 py-3 text-sm font-semibold text-white"
                    onClick={closeAllOverlays}
                  >
                    {accountLabel}
                  </Link>
                  <LogoutButton />
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--brand)]"
                    onClick={closeAllOverlays}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand)] px-4 py-3 text-center text-sm font-semibold text-white"
                    onClick={closeAllOverlays}
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>

            <div className="safe-bottom p-4 text-sm text-[color:var(--muted)]">
              <p className="font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]">Need help?</p>
              <p className="mt-2 leading-6">Call {contactNumber} or email {supportEmail} for store support.</p>
            </div>
          </div>
        </Drawer>
      ) : null}

      {searchOpen ? (
        <Drawer
          open
          onClose={() => setSearchOpen(false)}
          side="top"
          title="Search"
          description="Find a product or collection"
        >
          <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-2">
              <span className="sr-only">Search products</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                placeholder="Search products"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none"
              />
            </label>
            <button
              type="submit"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--brand)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search store
            </button>
          </form>
        </Drawer>
      ) : null}
    </header>
  );
}
