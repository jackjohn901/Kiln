import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Listing } from "@/data/listings";

export interface CartItem {
  listing: Listing;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
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
  const [items, setItems] = useState<CartItem[]>(readCart);

  const sync = useCallback((next: CartItem[]) => {
    setItems(next);
    saveCart(next);
  }, []);

  const addItem = useCallback((listing: Listing) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listing.id === listing.id);
      const next = existing
        ? prev.map((i) => i.listing.id === listing.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { listing, quantity: 1 }];
      saveCart(next);
      return next;
    });
  }, [sync]);

  const removeItem = useCallback((listingId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.listing.id !== listingId);
      saveCart(next);
      return next;
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
    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, removeItem, updateQty, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
