import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Gift, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/listings";

interface ShippingRateInfo {
  offerFreeShipping: boolean;
  domesticRate: number | null;
  internationalRate: number | null;
  perItemRate: number | null;
  freeThreshold: number | null;
}

async function fetchArtistShipping(artistId: string): Promise<ShippingRateInfo> {
  try {
    const res = await fetch(`/api/artists/${artistId}/shipping`);
    if (res.ok) return await res.json() as ShippingRateInfo;
  } catch { /* fall through */ }
  return { offerFreeShipping: false, domesticRate: null, internationalRate: null, perItemRate: null, freeThreshold: null };
}

function calcArtistShipping(info: ShippingRateInfo, artistSubtotal: number, totalQty: number): number {
  if (info.offerFreeShipping) return 0;
  if (info.freeThreshold !== null && artistSubtotal >= info.freeThreshold) return 0;
  const rate = info.domesticRate;
  if (rate === null) return 0;
  const additionalItems = Math.max(0, totalQty - 1);
  const perItem = (info.perItemRate ?? 0) * additionalItems;
  return rate + perItem;
}

export default function Cart() {
  const { items, itemCount, subtotal, removeItem, updateQty, clearCart } = useCart();
  const [bundleApplied, setBundleApplied] = useState(false);
  const [shippingRates, setShippingRates] = useState<Map<string, ShippingRateInfo>>(new Map());

  useEffect(() => {
    if (items.length === 0) return;
    const artistIds = [...new Set(items.map(i => i.listing.artistId as string))];
    Promise.all(artistIds.map(aid => fetchArtistShipping(aid).then(info => ({ aid, info }))))
      .then(results => setShippingRates(new Map(results.map(r => [r.aid, r.info]))))
      .catch(() => {});
  }, [items]);

  const bundleDiscount = bundleApplied ? Math.round(subtotal * 0.10) : 0;

  // Build per-artist subtotals and item quantities for shipping calculation
  const artistSubtotals = new Map<string, number>();
  const artistItemQtys = new Map<string, number>();
  for (const { listing, quantity } of items) {
    const aid = listing.artistId as string;
    artistSubtotals.set(aid, (artistSubtotals.get(aid) ?? 0) + (listing.price as number) * quantity);
    artistItemQtys.set(aid, (artistItemQtys.get(aid) ?? 0) + quantity);
  }

  // Compute shipping total + breakdown (base rate vs per-item add-on)
  let shipping: number | null = subtotal > 0 ? null : 0;
  let shippingBase = 0;
  let shippingPerItemAddOn = 0;
  let perItemAdditionalCount = 0;
  let perItemRatesSeen: number[] = [];

  if (shippingRates.size > 0) {
    let total = 0;
    for (const [aid, artistSub] of artistSubtotals.entries()) {
      const info = shippingRates.get(aid);
      if (!info) continue;
      const adjSub = artistSub - (bundleApplied ? Math.round(artistSub * 0.10) : 0);
      if (info.offerFreeShipping || (info.freeThreshold !== null && adjSub >= info.freeThreshold)) continue;
      const rate = info.domesticRate;
      if (rate === null) continue;
      const qty = artistItemQtys.get(aid) ?? 1;
      const additional = Math.max(0, qty - 1);
      const addOn = (info.perItemRate ?? 0) * additional;
      total += rate + addOn;
      shippingBase += rate;
      shippingPerItemAddOn += addOn;
      if (info.perItemRate != null && info.perItemRate > 0 && additional > 0) {
        perItemAdditionalCount += additional;
        perItemRatesSeen.push(info.perItemRate);
      }
    }
    shipping = total;
  }

  const uniquePerItemRates = [...new Set(perItemRatesSeen)];
  const uniformPerItemRate = uniquePerItemRates.length === 1 ? uniquePerItemRates[0]! : null;
  const hasPerItemAddOn = perItemAdditionalCount > 0 && shippingPerItemAddOn > 0;

  const total = subtotal - bundleDiscount + (shipping ?? 0);

  const artistGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    const id = item.listing.artistId;
    if (!acc[id]) acc[id] = [];
    acc[id]!.push(item);
    return acc;
  }, {});
  const bundleEligible = Object.values(artistGroups).some((group) => group.length >= 2);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/shop" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Cart</h1>
            {itemCount > 0 && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-xs font-bold text-amber-400">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          {itemCount > 0 && (
            <button onClick={clearCart} className="text-xs text-stone-600 hover:text-red-400 transition-colors">
              Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <ShoppingBag size={40} className="mx-auto mb-4 text-stone-700" />
            <p className="text-stone-500 mb-1">Your cart is empty</p>
            <p className="text-sm text-stone-700 mb-6">Discover original craft pieces in the shop</p>
            <Link href="/shop">
              <button className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                Browse shop
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {items.map(({ listing, quantity }) => {
                const imageUrl = listing.imageUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${listing.id}`;
                const price = typeof listing.price === "number" ? listing.price : 0;
                return (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 rounded-2xl border border-white/8 bg-stone-900/60 p-4"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-800">
                      <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-100 leading-snug line-clamp-2">{listing.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{listing.artistId}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm font-bold text-amber-400">{formatPrice(listing.price)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(listing.id, quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-stone-400 hover:border-white/20 transition-colors"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-5 text-center text-sm font-medium text-stone-200">{quantity}</span>
                          <button
                            onClick={() => updateQty(listing.id, quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-stone-400 hover:border-white/20 transition-colors"
                          >
                            <Plus size={10} />
                          </button>
                          <button
                            onClick={() => removeItem(listing.id)}
                            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-stone-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Bundle deal */}
            {bundleEligible && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                    <Gift size={16} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-amber-100">Bundle & Save 10%</p>
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                        <Sparkles size={8} className="inline mr-0.5" />DEAL
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">You have multiple pieces from the same artist. Save 10% when you bundle them.</p>
                    {bundleApplied && (
                      <p className="mt-1 text-xs font-semibold text-emerald-400">−${bundleDiscount.toLocaleString()} saved!</p>
                    )}
                  </div>
                  <button
                    onClick={() => setBundleApplied((v) => !v)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                      bundleApplied
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                    }`}
                  >
                    {bundleApplied ? "Applied ✓" : "Apply"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Order summary */}
            <div className="mt-2 rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Order summary</p>
              <div className="flex justify-between text-sm text-stone-400">
                <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              {bundleApplied && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Bundle discount (10%)</span>
                  <span>−${bundleDiscount.toLocaleString()}</span>
                </div>
              )}
              {shipping === null ? (
                <div className="flex justify-between text-sm text-stone-400">
                  <span className="flex items-center gap-1"><Truck size={12} /> Shipping</span>
                  <span className="text-stone-600">Calculating…</span>
                </div>
              ) : shipping === 0 ? (
                <div className="flex justify-between text-sm text-stone-400">
                  <span className="flex items-center gap-1"><Truck size={12} /> Shipping</span>
                  <span className="text-emerald-400">{subtotal > 0 ? "Free" : "—"}</span>
                </div>
              ) : hasPerItemAddOn ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-stone-400">
                    <span className="flex items-center gap-1"><Truck size={12} /> Shipping</span>
                    <span>${shipping.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500 pl-5">
                    <span>Base rate</span>
                    <span>${shippingBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500 pl-5">
                    <span>
                      {uniformPerItemRate !== null
                        ? `+ $${uniformPerItemRate} per additional item (×${perItemAdditionalCount})`
                        : `Per-item add-on (×${perItemAdditionalCount} items)`}
                    </span>
                    <span>${shippingPerItemAddOn.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-sm text-stone-400">
                  <span className="flex items-center gap-1"><Truck size={12} /> Shipping</span>
                  <span>${shipping.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/8 pt-3 flex justify-between text-base font-bold text-amber-100">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>

              <Link href="/cart/checkout">
                <button className="mt-1 w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                  Proceed to checkout <ArrowRight size={14} />
                </button>
              </Link>
              <Link href="/shop">
                <button className="w-full text-center text-xs text-stone-500 hover:text-stone-300 transition-colors py-1">
                  Continue shopping
                </button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 text-xs text-stone-700 py-2">
              <span>🔒 Secure checkout</span>
              <span>🎨 Artist-direct</span>
              <span>✓ Satisfaction guarantee</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
