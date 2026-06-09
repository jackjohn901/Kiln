import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import type { Listing } from "@/data/listings";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface CartItem {
  listing: Listing;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  /** True once the initial server reconcile has settled; false during hydration. */
  cartReady: boolean;
  addItem: (listing: Listing) => void;
  removeItem: (listingId: string) => void;
  updateQty: (listingId: string, qty: number) => void;
  clearCart: () => void;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const CART_KEY = "kiln_cart_v1";

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>(readCart);
  // False until the initial server reconcile has settled (or failed / skipped).
  // Cart.tsx gates its shipping-rate fetch on this so it never fires during hydration.
  const [cartReady, setCartReady] = useState(false);
  // Tracks the previous auth state so we can detect a guest -> signed-in transition.
  const wasAuthenticated = useRef(isAuthenticated);

  // Sync with server on mount: reconcile server cart with local state
  useEffect(() => {
    fetch("/api/me/cart", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ items: { listingId: string; quantity: number }[] }> : null)
      .then(data => {
        if (data?.items) {
          const serverItems = data.items;
          const serverIds = new Set(serverItems.map(i => i.listingId));
          // Items we have locally but the server no longer returns were removed
          // server-side because their listing was deleted or marked sold/unavailable.
          // Name them so the buyer understands why they vanished, rather than having
          // items silently disappear on sync.
          const removed = readCart().filter(i => !serverIds.has(i.listing.id));
          if (removed.length) {
            const names = removed.map(i => i.listing.title);
            const label =
              names.length === 1
                ? `\u201C${names[0]}\u201D`
                : names.length === 2
                ? `\u201C${names[0]}\u201D and \u201C${names[1]}\u201D`
                : `\u201C${names[0]}\u201D and ${names.length - 1} other items`;
            toast({
              title: removed.length === 1 ? "An item was removed from your cart" : "Items were removed from your cart",
              description: `${label} ${removed.length === 1 ? "is" : "are"} no longer available.`,
            });
          }
          setItems(prev => {
            // Update quantities from server, remove items server no longer has
            const reconciled = prev
              .filter(i => serverIds.has(i.listing.id))
              .map(i => {
                const sv = serverItems.find(s => s.listingId === i.listing.id);
                return sv && sv.quantity !== i.quantity ? { ...i, quantity: sv.quantity } : i;
              });
            // If server has extra IDs we don't have listing data for, they'll appear next visit
            const changed = reconciled.length !== prev.length ||
              reconciled.some((r, idx) => r.quantity !== prev[idx]?.quantity);
            if (changed) {
              saveCart(reconciled);
              return reconciled;
            }
            return prev;
          });
        }
        // Mark the cart as ready regardless of whether reconcile changed anything
        setCartReady(true);
      })
      .catch(() => {
        // Server unreachable or not authenticated — local cart is the source of truth
        setCartReady(true);
      });
  }, []);

  // When a guest signs in, merge their locally stored cart into the server cart so
  // items added before authentication aren't silently discarded.
  useEffect(() => {
    const was = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    // Only act on the guest -> signed-in transition.
    if (was || !isAuthenticated) return;

    const localItems = readCart();
    let cancelled = false;

    (async () => {
      try {
        // Read the authoritative server cart first so we can compute exact deltas.
        const res = await fetch("/api/me/cart", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: { listingId: string; quantity: number }[] };
        const serverItems = data.items ?? [];
        const serverById = new Map(serverItems.map((i) => [i.listingId, i.quantity]));

        // Merge semantics: the final quantity for any listing is max(guest, server).
        // For new items we add the full guest quantity; for items already on the
        // server we add only the positive delta. POST sums quantities server-side,
        // so this reaches the target without ever doubling or losing guest items.
        const additions = localItems
          .map((i) => {
            const serverQty = serverById.get(i.listing.id) ?? 0;
            const delta = i.quantity - serverQty;
            return { listingId: i.listing.id, delta };
          })
          .filter((a) => a.delta > 0);

        const results = await Promise.allSettled(
          additions.map((a) =>
            fetch("/api/me/cart", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listingId: a.listingId, quantity: a.delta }),
            }).then((r) => {
              if (!r.ok) throw new Error();
            }),
          ),
        );
        if (cancelled) return;

        if (results.some((r) => r.status === "rejected")) {
          toast({
            title: "Couldn\u2019t sync your cart",
            description: "Some items added before signing in may not appear on your other devices.",
            variant: "destructive",
          });
        }

        // Merge into local state: keep every local item (these carry full listing
        // data) and raise each quantity to max(guest, server) so neither side's
        // additions are lost.
        setItems((prev) => {
          const merged = prev.map((i) => {
            const serverQty = serverById.get(i.listing.id) ?? 0;
            const target = Math.max(i.quantity, serverQty);
            return target !== i.quantity ? { ...i, quantity: target } : i;
          });
          saveCart(merged);
          return merged;
        });
      } catch {
        // Network/parse failure — keep the local cart as the source of truth.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const addItem = useCallback((listing: Listing) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listing.id === listing.id);
      const next = existing
        ? prev.map((i) => i.listing.id === listing.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { listing, quantity: 1 }];
      saveCart(next);
      return next;
    });
    fetch("/api/me/cart", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, quantity: 1 }),
    })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => {
        toast({ title: "Couldn\u2019t sync your cart", description: "Your cart is saved on this device, but may not appear elsewhere.", variant: "destructive" });
      });
  }, []);

  const removeItem = useCallback((listingId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.listing.id !== listingId);
      saveCart(next);
      return next;
    });
    fetch(`/api/me/cart/${listingId}`, { method: "DELETE", credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => {
        toast({ title: "Couldn\u2019t sync your cart", description: "Your cart is saved on this device, but may not appear elsewhere.", variant: "destructive" });
      });
  }, []);

  const updateQty = useCallback((listingId: string, qty: number) => {
    setItems((prev) => {
      const next = qty <= 0
        ? prev.filter((i) => i.listing.id !== listingId)
        : prev.map((i) => i.listing.id === listingId ? { ...i, quantity: qty } : i);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
    fetch("/api/me/cart", { method: "DELETE", credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => {
        toast({ title: "Couldn\u2019t sync your cart", description: "Your cart is saved on this device, but may not appear elsewhere.", variant: "destructive" });
      });
  }, []);

  const isInCart = useCallback((listingId: string) => {
    return items.some((i) => i.listing.id === listingId);
  }, [items]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => {
    const price = typeof i.listing.price === "number" ? i.listing.price : 0;
    return s + price * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, cartReady, addItem, removeItem, updateQty, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
