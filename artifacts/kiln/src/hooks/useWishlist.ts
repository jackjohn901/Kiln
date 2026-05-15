import { useState, useCallback } from "react";

const KEY = "kiln_wishlist_v1";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(read);

  const toggle = useCallback((listingId: string) => {
    setIds((prev) => {
      const next = prev.includes(listingId)
        ? prev.filter((i) => i !== listingId)
        : [...prev, listingId];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => ids.includes(id), [ids]);

  return { wishlistIds: ids, toggleWishlist: toggle, isWishlisted };
}
