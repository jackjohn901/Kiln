import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Check, Package, ArrowRight, Truck, ShieldCheck,
  ExternalLink, MessageCircle, Info, CreditCard, Gift, AlertTriangle, Clock,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/listings";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import {
  readPaymentSettings, venmoUrl, cashAppUrl, paypalMeUrl,
  type ArtistPayments,
} from "@/utils/paymentSettings";

const ALL_ARTISTS = [...artists, ...seedArtists];

type Step = "address" | "pay" | "done";

interface AddressForm {
  name: string; email: string; phone: string;
  address: string; city: string; state: string; zip: string; country: string;
}

interface ShippingRateInfo {
  offerFreeShipping: boolean;
  domesticRate: number | null;
  internationalRate: number | null;
  perItemRate: number | null;
  freeThreshold: number | null;
}
const EMPTY_ADDR: AddressForm = {
  name: "", email: "", phone: "", address: "", city: "", state: "", zip: "", country: "US",
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  "usa": "US",
  "us": "US",
  "canada": "CA",
  "united kingdom": "GB",
  "uk": "GB",
  "australia": "AU",
  "germany": "DE",
  "france": "FR",
  "japan": "JP",
};

function normalizeCountryCode(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return COUNTRY_NAME_TO_CODE[lower] ?? (raw.trim().length === 2 ? raw.trim().toUpperCase() : "US");
}

// Per-artist group in cart
interface ArtistGroup {
  artistId: string;
  artistName: string;
  avatarUrl?: string;
  items: Array<{ listing: any; quantity: number }>;
  subtotal: number;
  payments: ArtistPayments;
  paid: boolean;
}

// Demo payment stubs for seeded artists so the UI shows live examples
const DEMO_PAYMENTS: Record<string, Partial<ArtistPayments>> = {
  "default": {},
};

function getDemoPayments(artistId: string): ArtistPayments {
  const saved = readPaymentSettings();
  const hasSaved = saved.stripeLink || saved.venmo || saved.cashapp || saved.paypalMe;
  if (hasSaved) return saved;
  const demo = DEMO_PAYMENTS[artistId] ?? DEMO_PAYMENTS["default"];
  return { stripeLink: demo.stripeLink ?? "", venmo: demo.venmo ?? "", cashapp: demo.cashapp ?? "", paypalMe: demo.paypalMe ?? "", notes: demo.notes ?? "" };
}

async function fetchArtistPayments(artistId: string): Promise<ArtistPayments> {
  try {
    const res = await fetch(`/api/users/${artistId}/payment-settings`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json() as ArtistPayments;
      const hasReal = data.stripeLink || data.venmo || data.cashapp || data.paypalMe;
      if (hasReal) return data;
    }
  } catch { /* fall through */ }
  return getDemoPayments(artistId);
}

async function fetchArtistShipping(artistId: string): Promise<ShippingRateInfo> {
  try {
    const res = await fetch(`/api/artists/${artistId}/shipping`);
    if (res.ok) return await res.json() as ShippingRateInfo;
  } catch { /* fall through */ }
  return { offerFreeShipping: false, domesticRate: null, internationalRate: null, perItemRate: null, freeThreshold: null };
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

export default function CartCheckout() {
  const [, navigate] = useLocation();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const [step, setStep] = useState<Step>("address");
  const [addr, setAddr] = useState<AddressForm>(EMPTY_ADDR);
  const [orderId] = useState(() => "KLN-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [groups, setGroups] = useState<ArtistGroup[]>([]);
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [noPayoutMethod, setNoPayoutMethod] = useState(false);
  const [noPayoutMethodCount, setNoPayoutMethodCount] = useState(1);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState<string | null>(null);
  const [manualPayoutWarning, setManualPayoutWarning] = useState(false);
  const [processingWindowDays, setProcessingWindowDays] = useState<number | null>(null);
  const [processingWindowLabel, setProcessingWindowLabel] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<Map<string, ShippingRateInfo>>(new Map());
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  const isDomestic = addr.country === "US";

  // Build per-artist subtotals and item quantities for shipping calculation
  const artistSubtotals = new Map<string, number>();
  const artistItemQtys = new Map<string, number>();
  for (const { listing, quantity } of items) {
    const aid = listing.artistId as string;
    artistSubtotals.set(aid, (artistSubtotals.get(aid) ?? 0) + (listing.price as number) * quantity);
    artistItemQtys.set(aid, (artistItemQtys.get(aid) ?? 0) + quantity);
  }

  const perArtistShipping: Array<{ artistId: string; artistName: string; cost: number }> = Array.from(artistSubtotals.entries()).map(([aid, artistSub]) => {
    const info = shippingRates.get(aid);
    const cost = info ? calcArtistShipping(info, artistSub, isDomestic, artistItemQtys.get(aid) ?? 1) : 0;
    const artist = ALL_ARTISTS.find(a => a.id === aid);
    return { artistId: aid, artistName: artist?.name ?? aid, cost };
  });

  const shipping = perArtistShipping.reduce((sum, { cost }) => sum + cost, 0);

  const tax = Math.round(subtotal * 0.0875 * 100) / 100;
  const total = subtotal + shipping + tax;

  // Pre-fill address from buyer's saved default shipping address
  useEffect(() => {
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ defaultShippingAddress?: { street?: string; city?: string; state?: string; zip?: string; country?: string } | null }> : null)
      .then(data => {
        const saved = data?.defaultShippingAddress;
        if (!saved) return;
        const street = typeof saved.street === "string" ? saved.street.trim() : "";
        const city = typeof saved.city === "string" ? saved.city.trim() : "";
        const state = typeof saved.state === "string" ? saved.state.trim() : "";
        const zip = typeof saved.zip === "string" ? saved.zip.trim() : "";
        const country = typeof saved.country === "string" && saved.country.trim()
          ? normalizeCountryCode(saved.country)
          : "US";
        if (street || city || zip) {
          setAddr(prev => ({
            ...prev,
            address: prev.address || street,
            city: prev.city || city,
            state: prev.state || state,
            zip: prev.zip || zip,
            country: prev.country === "US" ? country : prev.country,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch shipping rates for each unique artist in the cart
  useEffect(() => {
    if (items.length === 0) return;
    const artistIds = [...new Set(items.map(i => i.listing.artistId as string))];
    Promise.all(artistIds.map(aid => fetchArtistShipping(aid).then(info => ({ aid, info }))))
      .then(results => {
        setShippingRates(new Map(results.map(r => [r.aid, r.info])));
      })
      .catch(() => {});
  }, [items]);

  // Detect return from success (legacy path — real Stripe flow lands on /cart/success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      clearCart();
      setStep("done");
    }
  }, []);

  // Build artist groups when entering pay step — fetch real payment settings from API
  useEffect(() => {
    if (step !== "pay") return;
    const artistIds = [...new Set(items.map(i => i.listing.artistId))];
    Promise.all(artistIds.map(aid => fetchArtistPayments(aid).then(payments => ({ aid, payments }))))
      .then(results => {
        const paymentMap = new Map(results.map(r => [r.aid, r.payments]));
        const map = new Map<string, ArtistGroup>();
        for (const { listing, quantity } of items) {
          const aid = listing.artistId;
          if (!map.has(aid)) {
            const artist = ALL_ARTISTS.find((a) => a.id === aid);
            map.set(aid, {
              artistId: aid,
              artistName: artist?.name ?? aid,
              avatarUrl: artist?.images?.[0]?.url,
              items: [],
              subtotal: 0,
              payments: paymentMap.get(aid) ?? getDemoPayments(aid),
              paid: false,
            });
          }
          const g = map.get(aid)!;
          g.items.push({ listing, quantity });
          g.subtotal += listing.price * quantity;
        }
        setGroups(Array.from(map.values()));
      })
      .catch(() => {
        // Fallback: build groups with demo payments
        const map = new Map<string, ArtistGroup>();
        for (const { listing, quantity } of items) {
          const aid = listing.artistId;
          if (!map.has(aid)) {
            const artist = ALL_ARTISTS.find((a) => a.id === aid);
            map.set(aid, { artistId: aid, artistName: artist?.name ?? aid, avatarUrl: artist?.images?.[0]?.url, items: [], subtotal: 0, payments: getDemoPayments(aid), paid: false });
          }
          const g = map.get(aid)!;
          g.items.push({ listing, quantity });
          g.subtotal += listing.price * quantity;
        }
        setGroups(Array.from(map.values()));
      });
  }, [step, items]);

  function togglePaid(artistId: string) {
    setGroups((gs) => gs.map((g) => g.artistId === artistId ? { ...g, paid: !g.paid } : g));
  }

  const allPaid = groups.length > 0 && groups.every((g) => g.paid);

  function handleDone() {
    clearCart();
    setStep("done");
  }

  function addrValid() {
    return addr.name && addr.email && addr.address && addr.city && addr.state && addr.zip;
  }

  async function handleStripeCheckout() {
    if (!addrValid()) return;
    setCheckingOut(true);
    setCheckoutError("");
    setNoPayoutMethod(false);
    try {
      const cartItems = items.map(({ listing, quantity }) => ({
        name: listing.title as string,
        listingId: listing.id as string,
        quantity,
        imageUrl: (listing.imageUrl as string | undefined) ?? undefined,
        artistName: ((listing as unknown as Record<string, unknown>).artistName as string | undefined) ?? undefined,
      }));
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: cartItems,
          customerEmail: addr.email || undefined,
          successPath: "/cart/success",
          cancelPath: "/cart/checkout",
        }),
      });
      const data = await res.json();
      if (data.url) {
        try {
          localStorage.setItem("kiln_pre_checkout", JSON.stringify({
            sessionId: data.sessionId,
            items: items.map(({ listing, quantity }) => ({
              title: listing.title as string,
              amount: (listing.price as number) * quantity,
              sellerId: (listing as unknown as Record<string, unknown>).artistId as string | undefined,
              imageUrl: (listing.imageUrl as string | undefined) ?? undefined,
              type: "listing",
              refId: listing.id as string,
            })),
          }));
        } catch {}
        // Extract processing window from checkout response (both manual-payout and Connect)
        const pwDays = typeof data.processingWindowDays === "number" ? data.processingWindowDays : null;
        const pwLabel = typeof data.processingWindowLabel === "string" && data.processingWindowLabel.trim()
          ? data.processingWindowLabel.trim()
          : null;
        // Show processing window in sidebar before any redirect
        setProcessingWindowDays(pwDays);
        setProcessingWindowLabel(pwLabel);

        if (data.manualPayout) {
          setPendingCheckoutUrl(data.url);
          setManualPayoutWarning(true);
          setCheckingOut(false);
        } else {
          // Persist processing window to localStorage so CartSuccess can display it
          // immediately after the Stripe redirect, before the /api/me/orders/bulk
          // response comes back (same pattern as manual-payout orders).
          try {
            if (pwDays !== null) {
              localStorage.setItem("kiln_processing_window", String(pwDays));
            } else {
              localStorage.removeItem("kiln_processing_window");
            }
            if (pwLabel !== null) {
              localStorage.setItem("kiln_processing_window_label", pwLabel);
            } else {
              localStorage.removeItem("kiln_processing_window_label");
            }
          } catch {}
          // Show the "redirecting" spinner in place of the pay button; keep step="address"
          // so the sidebar stays visible and displays the processing window.
          // We intentionally do NOT call setStep("pay") here because that triggers an
          // unrelated useEffect that fetches artist payment settings for the legacy manual flow.
          setRedirectingToStripe(true);
          setCheckingOut(false);
          // Brief pause when there's a processing window to show so the sidebar renders it
          // before the buyer lands on Stripe; redirect immediately when there's nothing to show.
          const redirectDelay = (pwDays !== null || pwLabel !== null) ? 1500 : 0;
          setTimeout(() => { window.location.href = data.url; }, redirectDelay);
        }
      } else {
        if (data.code === "no_payout_method") {
          setNoPayoutMethod(true);
          setNoPayoutMethodCount(typeof data.affectedArtistCount === "number" ? data.affectedArtistCount : 1);
          setCheckingOut(false);
        } else {
          throw new Error(data.error ?? "Checkout failed");
        }
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setCheckingOut(false);
    }
  }

  function proceedToPendingCheckout() {
    if (pendingCheckoutUrl) {
      // Persist processing window so it survives the Stripe redirect
      try {
        if (processingWindowDays !== null) {
          localStorage.setItem("kiln_processing_window", String(processingWindowDays));
        } else {
          localStorage.removeItem("kiln_processing_window");
        }
        if (processingWindowLabel !== null) {
          localStorage.setItem("kiln_processing_window_label", processingWindowLabel);
        } else {
          localStorage.removeItem("kiln_processing_window_label");
        }
      } catch {}
      window.location.href = pendingCheckoutUrl;
    }
  }

  const STEPS: Step[] = ["address", "pay", "done"];
  const stepIdx = STEPS.indexOf(step);

  if (items.length === 0 && step !== "done") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <Package size={40} className="text-stone-700 mb-4" />
          <p className="text-stone-400 mb-2">Your cart is empty</p>
          <Link href="/shop">
            <button className="mt-4 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
              Browse Shop
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          {step !== "done" && (
            <button
              onClick={() => step === "address" ? navigate("/cart") : setStep("address")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <h1 className="font-serif text-2xl text-amber-100">
            {step === "done" ? "Order Complete" : "Checkout"}
          </h1>
        </div>

        {/* Progress bar */}
        {step !== "done" && (
          <div className="mb-8 flex items-center gap-2">
            {(["address", "pay"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  stepIdx > i ? "bg-emerald-500 text-white" : stepIdx === i ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-500"
                }`}>
                  {stepIdx > i ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs ${stepIdx === i ? "text-amber-300" : "text-stone-600"}`}>
                  {s === "address" ? "Shipping info" : "Pay artists"}
                </span>
                {i < 1 && <div className={`flex-1 h-px ${stepIdx > i ? "bg-emerald-500/40" : "bg-stone-800"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Shipping address ── */}
              {step === "address" && (
                <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Your shipping address</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Field label="Full name" value={addr.name} onChange={(v) => setAddr({ ...addr, name: v })} />
                      </div>
                      <Field label="Email" type="email" value={addr.email} onChange={(v) => setAddr({ ...addr, email: v })} />
                      <Field label="Phone" type="tel" value={addr.phone} onChange={(v) => setAddr({ ...addr, phone: v })} />
                      <div className="col-span-2">
                        <Field label="Street address" value={addr.address} onChange={(v) => setAddr({ ...addr, address: v })} />
                      </div>
                      <Field label="City" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} />
                      <Field label="State" value={addr.state} onChange={(v) => setAddr({ ...addr, state: v })} />
                      <Field label="ZIP code" value={addr.zip} onChange={(v) => setAddr({ ...addr, zip: v })} />
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">Country</label>
                        <select
                          value={addr.country}
                          onChange={(e) => setAddr({ ...addr, country: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="JP">Japan</option>
                        </select>
                      </div>
                    </div>

                    {/* Gift toggle */}
                    <div className="rounded-xl border border-white/8 bg-stone-800/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gift size={14} className={isGift ? "text-amber-400" : "text-stone-500"} />
                          <span className="text-sm text-stone-200">Send as a gift</span>
                        </div>
                        <button
                          onClick={() => setIsGift((v) => !v)}
                          className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${isGift ? "bg-amber-500" : "bg-stone-700"}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isGift ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      <AnimatePresence>
                        {isGift && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-2"
                          >
                            <Field label="Recipient name" value={giftRecipient} onChange={setGiftRecipient} />
                            <div>
                              <label className="text-xs text-stone-500 mb-1 block">Gift message (optional)</label>
                              <textarea
                                value={giftMessage}
                                onChange={(e) => setGiftMessage(e.target.value)}
                                placeholder="Write a personal note to include with the artwork…"
                                rows={2}
                                className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Free platform note */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-start gap-2">
                      <Info size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-emerald-300/80">
                        Kiln is free — payments go directly from you to each artist. No platform fees, no middleman.
                      </p>
                    </div>

                    {manualPayoutWarning && pendingCheckoutUrl ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 space-y-3"
                      >
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-start gap-2.5">
                          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-300 mb-0.5">Manual payout artist</p>
                            <p className="text-xs text-amber-200/70">
                              This artist manages payouts manually. Your order will be processed within{" "}
                              {processingWindowLabel
                                ? processingWindowLabel
                                : processingWindowDays !== null
                                  ? processingWindowDays === 1
                                    ? "1 business day"
                                    : `${processingWindowDays} business days`
                                  : "3–5 business days"}.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setManualPayoutWarning(false); setPendingCheckoutUrl(null); }}
                            className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:text-stone-300 hover:border-white/20 transition-colors"
                          >
                            Go back
                          </button>
                          <button
                            onClick={proceedToPendingCheckout}
                            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
                          >
                            <CreditCard size={14} /> Continue to payment
                          </button>
                        </div>
                      </motion.div>
                    ) : noPayoutMethod ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 space-y-3"
                      >
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-3 flex items-start gap-2.5">
                          <AlertTriangle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-rose-300 mb-0.5">Payment not available</p>
                            <p className="text-xs text-rose-200/70">
                              {noPayoutMethodCount > 1
                                ? `${noPayoutMethodCount} artists in your cart haven't set up a payment method yet. Please reach out to them directly through Kiln messages to arrange your purchase.`
                                : "This artist hasn't set up a payment method yet. Please reach out to them directly through Kiln messages to arrange your purchase."}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setNoPayoutMethod(false); setNoPayoutMethodCount(1); }}
                            className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:text-stone-300 hover:border-white/20 transition-colors"
                          >
                            Go back
                          </button>
                          <button
                            onClick={() => navigate("/messages")}
                            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-stone-700 py-2.5 text-sm font-bold text-stone-200 hover:bg-stone-600 transition-colors"
                          >
                            <MessageCircle size={14} /> Contact {noPayoutMethodCount > 1 ? "artists" : "artist"}
                          </button>
                        </div>
                      </motion.div>
                    ) : redirectingToStripe ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 flex flex-col items-center gap-3 py-6"
                      >
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                        <p className="text-stone-400 text-xs">Redirecting to secure checkout…</p>
                      </motion.div>
                    ) : (
                      <>
                        <button
                          disabled={!addrValid() || checkingOut}
                          onClick={handleStripeCheckout}
                          className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {checkingOut ? "Redirecting to checkout…" : <><CreditCard size={14} /> Pay securely with Stripe</>}
                        </button>
                        {checkoutError && (
                          <p className="text-center text-xs text-rose-400 mt-2">{checkoutError}</p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Redirecting to Stripe ── */}
              {step === "pay" && (
                <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                  <p className="text-stone-400 text-sm">Redirecting to secure checkout…</p>
                </motion.div>
              )}
              {(false as boolean) && (
                <motion.div key="_unused" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-2">
                    <Info size={13} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/80">
                      Pay each artist directly using their preferred method below. Once you've sent payment, check the box to confirm. Then share your shipping address with them.
                    </p>
                  </div>

                  {groups.map((group) => {
                    const payNote = `Kiln artwork purchase — ${group.items.map(i => i.listing.title).join(", ")}`;
                    const amt = group.subtotal;
                    const p = group.payments;
                    const hasAny = p.stripeLink || p.venmo || p.cashapp || p.paypalMe;

                    return (
                      <div key={group.artistId} className={`rounded-2xl border bg-stone-900/60 overflow-hidden transition-colors ${group.paid ? "border-emerald-500/30" : "border-white/8"}`}>
                        {/* Artist header */}
                        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-stone-800 shrink-0">
                            {group.avatarUrl
                              ? <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                              : <div className="h-full w-full flex items-center justify-center text-stone-500 text-sm font-bold">{group.artistName[0]}</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-200">{group.artistName}</p>
                            <p className="text-xs text-stone-500">{group.items.length} item{group.items.length !== 1 ? "s" : ""} · {formatPrice(group.subtotal)}</p>
                          </div>
                          {group.paid && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                              <Check size={13} /> Paid
                            </div>
                          )}
                        </div>

                        {/* Items */}
                        <div className="px-5 pb-3 space-y-2">
                          {group.items.map(({ listing, quantity }) => (
                            <div key={listing.id} className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                                {listing.imageUrl && <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />}
                              </div>
                              <p className="flex-1 text-xs text-stone-400 line-clamp-1">{listing.title}</p>
                              <p className="text-xs font-medium text-amber-300/80">{formatPrice(listing.price * quantity)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Payment methods */}
                        <div className="border-t border-white/8 px-5 py-4 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">Pay {group.artistName.split(" ")[0]} directly</p>

                          {hasAny ? (
                            <div className="flex flex-wrap gap-2">
                              {p.stripeLink && (
                                <PayButton
                                  href={p.stripeLink}
                                  color="bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25"
                                  icon={<CreditCard size={12} />}
                                  label="Pay with Stripe"
                                />
                              )}
                              {p.venmo && (
                                <PayButton
                                  href={venmoUrl(p.venmo, amt, payNote)}
                                  color="bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25"
                                  icon={<span className="text-[10px] font-black">V</span>}
                                  label={`Venmo ${p.venmo.startsWith("@") ? p.venmo : "@" + p.venmo}`}
                                />
                              )}
                              {p.cashapp && (
                                <PayButton
                                  href={cashAppUrl(p.cashapp, amt, payNote)}
                                  color="bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                                  icon={<span className="text-[10px] font-black">$</span>}
                                  label={`Cash App ${p.cashapp.startsWith("$") ? p.cashapp : "$" + p.cashapp}`}
                                />
                              )}
                              {p.paypalMe && (
                                <PayButton
                                  href={paypalMeUrl(p.paypalMe, amt)}
                                  color="bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25"
                                  icon={<span className="text-[10px] font-black">P</span>}
                                  label="PayPal.me"
                                />
                              )}
                              <Link href={`/messages`}>
                                <button className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-stone-400 hover:border-white/20 hover:text-stone-300 transition-colors">
                                  <MessageCircle size={12} /> Message artist
                                </button>
                              </Link>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Link href={`/messages`}>
                                <button className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:border-white/20 transition-colors">
                                  <MessageCircle size={12} /> Message artist to arrange payment
                                </button>
                              </Link>
                            </div>
                          )}

                          {p.notes && (
                            <p className="text-xs text-stone-600 italic">Note from artist: "{p.notes}"</p>
                          )}

                          {/* Amount summary */}
                          <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-white/5">
                            <span>Amount to send</span>
                            <span className="font-bold text-amber-200">{formatPrice(amt)}</span>
                          </div>

                          {/* Paid confirmation */}
                          <button
                            onClick={() => togglePaid(group.artistId)}
                            className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold border transition-colors ${
                              group.paid
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                : "border-white/10 text-stone-400 hover:border-white/20"
                            }`}
                          >
                            {group.paid ? <><Check size={12} /> Payment sent</> : "Mark as paid"}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    disabled={!allPaid}
                    onClick={handleDone}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check size={14} /> Complete order
                  </button>
                  {!allPaid && (
                    <p className="text-center text-xs text-stone-600">Mark all payments as sent to complete your order</p>
                  )}
                </motion.div>
              )}

              {/* ── Done ── */}
              {step === "done" && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl text-amber-100 mb-1">Order complete!</h2>
                      <p className="text-sm text-stone-400">Reference #{orderId}</p>
                    </div>
                    <div className="rounded-xl bg-stone-900/60 border border-white/8 px-4 py-3 text-sm text-stone-400 text-left space-y-1.5">
                      <div className="flex justify-between">
                        <span>Ship to</span>
                        <span className="text-stone-300">{addr.name || "—"}</span>
                      </div>
                      {isGift && giftRecipient && (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1"><Gift size={11} /> Gift for</span>
                          <span className="text-amber-300">{giftRecipient}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Payments</span>
                        <span className="text-emerald-400">Sent directly to artists</span>
                      </div>
                      {(processingWindowLabel !== null || processingWindowDays !== null) && (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1"><Package size={11} /> Delivery estimate</span>
                          <span className="text-amber-300">
                            {processingWindowLabel
                              ? processingWindowLabel
                              : processingWindowDays === 1
                                ? "1 business day"
                                : `${processingWindowDays} business days`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Estimated delivery</span>
                        <span className="text-stone-300">5–10 business days</span>
                      </div>
                    </div>
                    {isGift && giftMessage && (
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 text-sm">
                        <p className="text-[10px] text-amber-500/70 uppercase tracking-wide font-semibold mb-1">Gift message</p>
                        <p className="text-stone-300 italic">"{giftMessage}"</p>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-xs text-stone-600">
                      <ShieldCheck size={12} className="text-emerald-600" /> Artist-verified, authenticity guaranteed
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Link href="/orders" className="flex-1">
                        <button className="w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-white/20 transition-colors">
                          View orders
                        </button>
                      </Link>
                      <Link href="/shop" className="flex-1">
                        <button className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                          Keep shopping
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order summary sidebar */}
          {step !== "done" && (
            <div className="lg:w-72 shrink-0">
              <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map(({ listing, quantity }) => (
                    <div key={listing.id} className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-800">
                          {listing.imageUrl && <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        {quantity > 1 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-bold text-stone-950 flex items-center justify-center">
                            {quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-300 line-clamp-1">{listing.title}</p>
                        <p className="text-xs text-stone-600">{formatPrice(listing.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/8 pt-3 space-y-1.5 text-xs text-stone-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                  </div>
                  {shippingRates.size === 0 && items.length > 0 ? (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1"><Truck size={9} /> Shipping</span>
                      <span className="text-stone-600 italic">calculating…</span>
                    </div>
                  ) : perArtistShipping.length >= 2 ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-stone-500">
                        <Truck size={9} /> <span>Shipping</span>
                      </div>
                      {perArtistShipping.map(({ artistId, artistName, cost }) => (
                        <div key={artistId} className="flex justify-between pl-3">
                          <span className="text-stone-600 truncate max-w-[130px]">{artistName}</span>
                          <span className={cost === 0 ? "text-emerald-400" : ""}>{cost === 0 ? "Free" : `$${cost.toFixed(2)}`}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-0.5 border-t border-white/5">
                        <span className="text-stone-500">Total shipping</span>
                        <span className={shipping === 0 ? "text-emerald-400" : ""}>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1"><Truck size={9} /> Shipping</span>
                      <span className={shipping === 0 ? "text-emerald-400" : ""}>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (est.)</span><span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/8 pt-2 text-sm font-bold text-amber-100">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>
                {(processingWindowLabel !== null || processingWindowDays !== null) && (
                  <div className="border-t border-white/8 pt-3 flex items-start gap-2">
                    <Clock size={12} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-0.5">Processing time</p>
                      <p className="text-xs text-amber-300">
                        {processingWindowLabel
                          ? processingWindowLabel
                          : processingWindowDays === 1
                            ? "1 business day"
                            : `${processingWindowDays} business days`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PayButton({ href, color, icon, label }: { href: string; color: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <button className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${color}`}>
        {icon} {label} <ExternalLink size={10} />
      </button>
    </a>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none transition-colors"
      />
    </div>
  );
}
