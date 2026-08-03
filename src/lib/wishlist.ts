export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  tone: string;
  sku?: string;
  badge?: string;
  compareAtPrice?: number;
  collectionSlug?: string;
};

const STORAGE_KEY = "easy_ecom_wishlist";

function readStorage(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWishlistItem);
  } catch {
    return [];
  }
}

function writeStorage(items: WishlistItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("easy-ecom:wishlist-change"));
}

function isWishlistItem(value: unknown): value is WishlistItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.tone === "string"
  );
}

export function readWishlistItems() {
  return readStorage();
}

export function isWishlistEntrySaved(id: string) {
  return readStorage().some((item) => item.id === id);
}

export function removeWishlistItem(id: string) {
  const next = readStorage().filter((item) => item.id !== id);
  writeStorage(next);
  return next;
}

export function toggleWishlistItem(item: WishlistItem) {
  const current = readStorage();
  const next = current.some((entry) => entry.id === item.id)
    ? current.filter((entry) => entry.id !== item.id)
    : [item, ...current];
  writeStorage(next);
  return next;
}
