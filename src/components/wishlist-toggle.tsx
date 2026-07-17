"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import type { WishlistItem } from "@/lib/wishlist";
import { isWishlistEntrySaved, toggleWishlistItem } from "@/lib/wishlist";

export function WishlistToggle({
  item,
  compact = false,
}: {
  item: WishlistItem;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(isWishlistEntrySaved(item.id));
    sync();
    window.addEventListener("easy-ecom:wishlist-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("easy-ecom:wishlist-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleWishlistItem(item);
        setSaved(next.some((entry) => entry.id === item.id));
      }}
      aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={
        compact
          ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur transition hover:bg-black/35"
          : "inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
      }
    >
      <Heart className={saved ? "h-4 w-4 fill-current text-[#c62f3f]" : "h-4 w-4"} />
      {!compact ? <span>{saved ? "Saved" : "Wishlist"}</span> : null}
    </button>
  );
}
