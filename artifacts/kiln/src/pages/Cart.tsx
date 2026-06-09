import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Gift, Sparkles, PackageCheck, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/listings";

interface ShippingRateInfo {
  offerFreeShipping: boolean;
  domesticRate: number | null;
  internationalRate: number | null;
  perItemRate: number | null;
  freeThreshold: number | null;
  freeShippingGapPercent: number | null;
}

async function fetchArtistShipping(artistId: string): Promise<ShippingRateInfo> {
  try {
    const res = await fetch(`/api/artists/${artistId}/shipping`);
    if (res.ok) return await res.json() as ShippingRateInfo;
  } catch { /* fall through */ }
  return { offerFreeShipping: false, domesticRate: null, internationalRate: null, perItemRate: null, freeThreshold: null, freeShippingGapPercent: null };
}

function calcArtistShipping(info: ShippingRateInfo, artistSubtotal: number, isDomestic: boolean, totalQty: number): number {
  if (info.offerFreeShipping) return 0;
  if (info.freeThreshold !== null && artistSubtotal >= info.freeThreshold) return 0;
  const rate = isDomestic ? info.domesticRate : (info.internationalRate ?? info.domesticRate);
  if (rate === null) return 0;
  const additionalItems = Math.max(0, totalQty - 1);
  const perItem = (info.perItemRate ?? 0) * additionalItems;
  return rate + perItem;
}

interface ProcessingWindow {
  days: number | null;
  label: string | null;
}

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const { items, itemCount, subtotal, cartReady, removeItem, updateQty, clearCart } = useCart();
  const [bundleApplied, setBundleApplied] = useState(false);
  const [shippingRates, setShippingRates] = useState<Map<string, ShippingRateInfo>>(new Map());
  const [isDomestic, setIsDomestic] = useState(true);
  const [processingWindows, setProcessingWindows] = useState<Map<string, ProcessingWindow>>(new Map());
  const [staleItems, setStaleItems] = useState<Array<{ id: string; title: string }>>([]);
  const [overStockItems, setOverStockItems] = useState<Array<{ id: string; title: string; available: number; requested: number }>>([]);

  // Validate cart availability on mount (and whenever items change) so buyers are
  // warned about sold/deleted listings right here on the cart page — not only once
  // they reach checkout. Reuses the same /api/stripe/cart-validate endpoint.
  useEffect(() => {
    if (!isAuthenticated) { setStaleItems([]); setOverStockItems([]); return; }
    const listingIds = items.map(i => i.listing.id as string).filter(Boolean);
    if (listingIds.length === 0) { setStaleItems([]); setOverStockItems([]); return; }
    let cancelled = false;
    const listingQtys = items.map(i => ({ id: i.listing.id as string, qty: i.quantity }));
    fetch("/api/stripe/cart-validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ listingIds, listingQtys }),
    })
      .then(r => r.ok ? r.json() as Promise<{ unavailableListings: Array<{ id: string; title: string }>; overStockListings?: Array<{ id: string; title: string; available: number; requested: number }> }> : null)
      .then(data => {
        if (cancelled || !data) return;
        // Only flag IDs that are actually still in the cart (it may have changed).
        const inCart = new Set(items.map(i => i.listing.id as string));
        setStaleItems((data.unavailableListings ?? []).filter(it => inCart.has(it.id)));
        setOverStockItems((data.overStockListings ?? []).filter(it => inCart.has(it.id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [items, isAuthenticated]);

  useEffect(() => {
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ defaultShippingAddress?: { country?: string } | null }> : null)
      .then(data => {
        const country = data?.defaultShippingAddress?.country;
        if (country && typeof country === "string") {
          setIsDomestic(country.trim().toUpperCase() === "US");
        }
      })
      .catch(() => {});
  }, []);

  // Stable key: only changes when the SET of artists changes, not on qty updates.
  // Shipping rate info (domestic rate, free threshold, etc.) is per-artist and
  // doesn't vary with quantity, so we don't need to refetch on every qty bump.
  const artistIds = [...new Set(items.map(i => i.listing.artistId as string))];
  const artistIdsKey = [...artistIds].sort().join(",");

  useEffect(() => {
    // Wait until CartContext has finished its server reconcile so that a transient
    // change to the artist set during hydration doesn't trigger an extra fetch.
    if (!cartReady) return;
    if (artistIds.length === 0) {
      setShippingRates(new Map());
      return;
    }
    Promise.all(artistIds.map(aid => fetchArtistShipping(aid).then(info => ({ aid, info }))))
      .then(results => setShippingRates(new Map(results.map(r => [r.aid, r.info]))))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady, artistIdsKey]);

  useEffect(() => {
    // Same guard: don't hit the API while the cart is still being reconciled.
    if (!cartReady) return;
    if (artistIds.length === 0) {
      setProcessingWindows(new Map());
      return;
    }
    Promise.all(
      artistIds.map(aid =>
        fetch(`/api/users/${aid}/payment-settings`, { credentials: "include" })
          .then(r => r.ok ? r.json() as Promise<Record<string, unknown>> : null)
          .catch(() => null)
          .then(ps => ({ aid, ps }))
      )
    ).then(results => {
      const perArtist = new Map<string, ProcessingWindow>();
      for (const { aid, ps } of results) {
        const days = ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null;
        const label = ps && typeof ps.processingWindowLabel === "string" && (ps.processingWindowLabel as string).trim()
          ? (ps.processingWindowLabel as string).trim()
          : null;
        if (days !== null || label !== null) {
          perArtist.set(aid, { days, label });
        }
      }
      setProcessingWindows(perArtist);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartReady, artistIdsKey]);

  const [unlockedToasts, setUnlockedToasts] = useState<{ id: string; artistId: string }[]>([]);
  const prevArtistSubtotalsRef = useRef<Map<string, number>>(new Map());

  const bundleDiscount = bundleApplied ? Math.round(subtotal * 0.10) : 0;

  // Build per-artist subtotals and item quantities for shipping calculation
  const artistSubtotals = new Map<string, number>();
  const artistItemQtys = new Map<string, number>();
  for (const { listing, quantity } of items) {
    const aid = listing.artistId as string;
    artistSubtotals.set(aid, (artistSubtotals.get(aid) ?? 0) + (listing.price as number) * quantity);
    artistItemQtys.set(aid, (artistItemQtys.get(aid) ?? 0) + quantity);
  }

  // Detect when a per-artist subtotal crosses the free-shipping threshold and fire a celebratory toast.
  // We serialize the subtotals to a stable string so the effect only re-runs when values actually change.
  const artistSubtotalsKey = [...artistSubtotals.entries()].sort().map(([k, v]) => `${k}:${v}`).join("|");
  useEffect(() => {
    if (shippingRates.size === 0) return;
    const prev = prevArtistSubtotalsRef.current;
    const newUnlocked: { id: string; artistId: string }[] = [];

    for (const [aid, info] of shippingRates.entries()) {
      if (!info.freeThreshold || info.offerFreeShipping) continue;
      const prevSub = prev.get(aid) ?? 0;
      const currSub = artistSubtotals.get(aid) ?? 0;
      if (prevSub < info.freeThreshold && currSub >= info.freeThreshold) {
        newUnlocked.push({ id: `${aid}-${Date.now()}`, artistId: aid });
      }
    }

    prevArtistSubtotalsRef.current = new Map(artistSubtotals);

    if (newUnlocked.length > 0) {
      setUnlockedToasts(prev => [...prev, ...newUnlocked]);
      newUnlocked.forEach(t => {
        setTimeout(() => {
          setUnlockedToasts(prev => prev.filter(existing => existing.id !== t.id));
        }, 3000);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistSubtotalsKey, shippingRates]);

  // Compute shipping total + breakdown (base rate vs per-item add-on).
  // Stays null (→ "Calculating…") only after the cart is ready and rates haven't
  // arrived yet.  Before cartReady we stay null too, but render "—" instead so
  // there's no flash during the initial hydration cycle.
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
      const rate = isDomestic ? info.domesticRate : (info.internationalRate ?? info.domesticRate);
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

  // Free-shipping proximity nudges: show when subtotal is within the artist's configured gap below the threshold (default 20%)
  const DEFAULT_FREE_SHIPPING_GAP = 0.20;
  function artistDisplayName(id: string): string {
    return id
      .replace(/^seed-/, "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  interface FreeShippingNudge { artistId: string; threshold: number; subtotal: number; amountNeeded: number; progress: number; }
  const freeShippingNudges: FreeShippingNudge[] = [];
  if (shippingRates.size > 0) {
    for (const [aid, info] of shippingRates.entries()) {
      if (!info.freeThreshold || info.offerFreeShipping) continue;
      const artistSub = artistSubtotals.get(aid) ?? 0;
      if (artistSub >= info.freeThreshold) continue; // already qualifies
      const gap = info.freeShippingGapPercent !== null ? info.freeShippingGapPercent / 100 : DEFAULT_FREE_SHIPPING_GAP;
      const lowerBound = info.freeThreshold * (1 - gap);
      if (artistSub >= lowerBound) {
        freeShippingNudges.push({
          artistId: aid,
          threshold: info.freeThreshold,
          subtotal: artistSub,
          amountNeeded: info.freeThreshold - artistSub,
          progress: Math.max(0, Math.min(1, artistSub / info.freeThreshold)),
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />

      {/* Free-shipping unlock toasts */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none" style={{ width: "min(90vw, 360px)" }}>
        <AnimatePresence>
          {unlockedToasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 backdrop-blur-sm px-4 py-3 shadow-lg shadow-emerald-900/30"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-100 leading-snug">Free shipping unlocked!</p>
                <p className="text-xs text-emerald-400/80 truncate">from {t.artistId}</p>
              </div>
              <Sparkles size={14} className="shrink-0 text-emerald-400" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
                      {(() => {
                        const pw = processingWindows.get(listing.artistId as string);
                        if (!pw) return null;
                        const text = pw.label
                          ? pw.label
                          : pw.days === 1
                            ? "Ships within 1 business day"
                            : `Ships within ${pw.days} business days`;
                        return (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-400">
                            <Clock size={10} className="shrink-0" />
                            {text}
                          </span>
                        );
                      })()}
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

            {/* Free-shipping proximity nudges */}
            <AnimatePresence>
              {freeShippingNudges.map((nudge) => (
                <motion.div
                  key={nudge.artistId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      <Truck size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-emerald-100">Almost free shipping!</p>
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <PackageCheck size={8} />SO CLOSE
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mb-2">
                        Add <span className="font-semibold text-emerald-300">${nudge.amountNeeded.toLocaleString()}</span> more from{" "}
                        <span className="text-stone-300">{artistDisplayName(nudge.artistId)}</span> to unlock free shipping.
                      </p>
                      <Link
                        href={`/profile/${nudge.artistId}?tab=shop`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Browse {artistDisplayName(nudge.artistId)} →
                      </Link>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${nudge.progress * 100}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-stone-600">
                        <span>${nudge.subtotal.toLocaleString()}</span>
                        <span>${nudge.threshold.toLocaleString()} for free shipping</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Over-stock warning — surfaces when the requested quantity exceeds available stock */}
            {overStockItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-300 mb-1">
                      {overStockItems.length === 1
                        ? "One item in your cart exceeds available stock"
                        : `${overStockItems.length} items in your cart exceed available stock`}
                    </p>
                    <ul className="space-y-1 mb-2">
                      {overStockItems.map((item) => (
                        <li key={item.id} className="text-xs text-amber-200/70">
                          <span className="font-medium text-amber-200">&ldquo;{item.title}&rdquo;</span>
                          {" — "}
                          {item.available === 0
                            ? "sold out"
                            : `only ${item.available} available (you requested ${item.requested})`}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-200/50">Reduce the quantity above before checking out.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stale-item warning — surfaces sold/deleted listings on the cart page,
                so buyers catch them before clicking through to checkout. */}
            {staleItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/8 px-4 py-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-rose-300 mb-1">
                      {staleItems.length === 1
                        ? "An item in your cart is no longer available"
                        : `${staleItems.length} items in your cart are no longer available`}
                    </p>
                    <ul className="space-y-0.5 mb-2">
                      {staleItems.map((item) => (
                        <li key={item.id} className="text-xs text-rose-200/70">
                          {item.title === "This item" ? "A deleted listing" : `\u201c${item.title}\u201d`}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        staleItems.forEach((item) => removeItem(item.id));
                        setStaleItems([]);
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
                    >
                      Remove unavailable {staleItems.length === 1 ? "item" : "items"}
                    </button>
                  </div>
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
                  <span className="text-stone-600">{cartReady ? "Calculating…" : "—"}</span>
                </div>
              ) : shipping === 0 ? (
                <div className="flex justify-between text-sm text-stone-400">
                  <span className="flex items-center gap-1"><Truck size={12} /> Shipping</span>
                  <span className="text-emerald-400">{subtotal > 0 ? "Free" : "—"}</span>
                </div>
              ) : hasPerItemAddOn ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-stone-400">
                    <span className="flex items-center gap-1">
                      <Truck size={12} /> Shipping
                      {!isDomestic && <span className="ml-1 rounded-full bg-sky-500/15 border border-sky-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400">Intl</span>}
                    </span>
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
                  <span className="flex items-center gap-1">
                    <Truck size={12} /> Shipping
                    {!isDomestic && <span className="ml-1 rounded-full bg-sky-500/15 border border-sky-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400">Intl</span>}
                  </span>
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
