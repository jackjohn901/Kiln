import { useState, useCallback, useEffect } from "react";

const KEY = "kiln_wishlist_v1";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function save(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(read);

  useEffect(() => {
    fetch("/api/me/wishlist", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ listingIds: string[] }> : null)
      .then(data => {
        if (!data?.listingIds?.length) return;
        setIds(prev => {
          const merged = Array.from(new Set([...prev, ...data.listingIds]));
          save(merged);
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback((listingId: string) => {
    setIds((prev) => {
      const next = prev.includes(listingId)
        ? prev.filter((i) => i !== listingId)
        : [...prev, listingId];
      save(next);
      return next;
    });
    fetch(`/api/listings/${listingId}/wishlist`, { method: "POST", credentials: "include" }).catch(() => {});
  }, []);

  const isWishlisted = useCallback((id: string) => ids.includes(id), [ids]);

  return { wishlistIds: ids, toggleWishlist: toggle, isWishlisted };
}
