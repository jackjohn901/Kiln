import { useState, useMemo, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "@/hooks/useWishlist";
import {
  ChevronLeft, ShoppingCart, Heart, Share2, Check, Plus,
  Shield, Truck, Award, MapPin, ExternalLink, ChevronRight,
  Package, Ruler, Calendar, Palette, Star, MessageSquare,
  Bell, BellOff, DollarSign, X, Send, TrendingDown, Landmark,
  QrCode, Download, MapPinned,
} from "lucide-react";

interface ArtistShipping {
  offerFreeShipping: boolean;
  domesticRate: number | null;
  internationalRate: number | null;
  freeThreshold: number | null;
  offerLocalPickup: boolean;
}
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import Nav from "@/components/Nav";
import { listings, formatPrice, type Listing } from "@/data/listings";
import { getArtistById, artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useCart } from "@/contexts/CartContext";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import ARPreview from "@/components/ARPreview";
import ReviewsSection from "@/components/ReviewsSection";

const ALL_ARTISTS = [...artists, ...seedArtists];

function findListing(id: string): Listing | undefined {
  return listings.find((l) => l.id === id);
}

function getArtistName(artistId: string): string {
  const a = getArtistById(artistId) ?? ALL_ARTISTS.find((x) => x.id === artistId);
  return a?.name ?? "Unknown Artist";
}

function getRelated(listing: Listing): Listing[] {
  const sameArtist = listings
    .filter((l) => l.id !== listing.id && l.artistId === listing.artistId && l.available)
    .slice(0, 3);
  if (sameArtist.length >= 3) return sameArtist;
  const sameMedium = listings
    .filter((l) => l.id !== listing.id &&
      !sameArtist.find((s) => s.id === l.id) &&
      l.medium.split(",")[0].trim() === listing.medium.split(",")[0].trim() &&
      l.available)
    .slice(0, 3 - sameArtist.length);
  return [...sameArtist, ...sameMedium];
}

function extractYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/img\.youtube\.com\/vi\/([^/]+)\//);
  return m ? m[1] : null;
}

function buildGallery(imageUrl: string | null): string[] {
  const ytId = extractYoutubeId(imageUrl);
  if (ytId) {
    return [
      `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
    ];
  }
  return imageUrl ? [imageUrl] : [];
}

function generatePriceHistory(listing: Listing) {
  const seed = listing.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const months = 12;
  const current = listing.price;
  const start = Math.round(current * 0.78);
  return Array.from({ length: months + 1 }, (_, i) => {
    const date = new Date(2026, 4 - months + i, 1);
    const progress = i / months;
    const noiseFactor = ((seed * (i + 7) * 13) % 97 - 48) / 1200;
    const price = Math.round(start + (current - start) * (progress + noiseFactor));
    return {
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      price: Math.max(price, Math.round(start * 0.88)),
    };
  });
}

function StarRow({ rating, size = 14, interactive = false, onRate }: {
  rating: number; size?: number; interactive?: boolean; onRate?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={(hover || rating) >= s ? "currentColor" : "none"}
          className={`${(hover || rating) >= s ? "text-amber-400" : "text-stone-700"} ${interactive ? "cursor-pointer transition-colors" : ""}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(s)}
        />
      ))}
    </div>
  );
}

// ─── Shipping Estimate ─────────────────────────────────────────────────────────

const US_REGIONS: Record<string, string> = {
  "0": "Northeast", "1": "Northeast", "2": "Mid-Atlantic", "3": "Southeast",
  "4": "Southeast", "5": "Midwest", "6": "South Central", "7": "South Central",
  "8": "Mountain", "9": "West Coast",
};

function estimateShipping(listing: Listing, zip: string): { label: string; days: string; price: number }[] | null {
  if (zip.length !== 5 || !/^\d{5}$/.test(zip)) return null;
  const region = US_REGIONS[zip[0]] ?? "US";
  const base = listing.price >= 5000 ? 65 : listing.price >= 1500 ? 45 : listing.price >= 500 ? 25 : 18;
  const regional = region === "West Coast" || region === "Northeast" ? 0 : 8;
  const std = base + regional;
  const exp = Math.round(std * 2.2);
  const free = listing.price >= 3000;
  return [
    { label: `Standard — White Glove Delivery (${region})`, days: "7–14 business days", price: free ? 0 : std },
    { label: "Expedited Freight", days: "3–5 business days", price: free ? Math.round(exp * 0.4) : exp },
    { label: "Express Art Courier", days: "1–2 business days", price: Math.round(exp * 1.6) },
  ];
}

function ShippingEstimate({ listing }: { listing: Listing }) {
  const [zip, setZip] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const estimates = submitted ? estimateShipping(listing, zip) : null;

  return (
    <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck size={14} className="text-amber-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Shipping estimate</p>
        {listing.price >= 3000 && (
          <span className="ml-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Free shipping
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={zip}
          onChange={(e) => { setZip(e.target.value.replace(/\D/g, "").slice(0, 5)); setSubmitted(false); }}
          placeholder="Enter ZIP code"
          inputMode="numeric"
          maxLength={5}
          className="flex-1 rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
        />
        <button
          onClick={() => zip.length === 5 && setSubmitted(true)}
          disabled={zip.length !== 5}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
        >
          Calculate
        </button>
      </div>
      {estimates && (
        <div className="mt-3 space-y-2">
          {estimates.map((e) => (
            <div key={e.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-stone-400 truncate">{e.label}</p>
                <p className="text-[10px] text-stone-600">{e.days}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-amber-300">
                {e.price === 0 ? "Free" : formatPrice(e.price)}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-stone-700 pt-1">Estimates only — final shipping arranged directly with artist. All works are professionally packed.</p>
        </div>
      )}
    </div>
  );
}

const WAITLIST_KEY = "kiln_listing_waitlist_v1";
function getWaitlisted(): string[] {
  try { return JSON.parse(localStorage.getItem(WAITLIST_KEY) ?? "[]"); } catch { return []; }
}
function setWaitlistedLocal(ids: string[]) {
  try { localStorage.setItem(WAITLIST_KEY, JSON.stringify(ids)); } catch {}
}
const PRICE_ALERTS_KEY = "kiln_price_alerts_v1";
function getPriceAlerts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PRICE_ALERTS_KEY) ?? "{}"); } catch { return {}; }
}
function setPriceAlertsLocal(a: Record<string, number>) {
  try { localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(a)); } catch {}
}

const PLAN_OPTIONS = [
  { id: "half", label: "50 / 50", desc: "50% now, 50% in 30 days", schedule: "50% deposit, 50% on delivery" },
  { id: "thirds", label: "3 installments", desc: "Equal payments over 3 months", schedule: "33% monthly over 3 months" },
  { id: "quarters", label: "4 installments", desc: "Equal payments over 4 months", schedule: "25% monthly over 4 months" },
];

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { addItem, isInCart } = useCart();
  const { sendCommissionInquiry } = useSocial();
  const { profile } = useProfile();
  const [apiReviews, setApiReviews] = useState<Array<{ id: string; reviewerId: string; reviewerName: string; reviewerAvatarUrl: string | null; rating: number; body: string | null; isVerifiedPurchase: boolean; createdAt: string; }>>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [firstAccess, setFirstAccess] = useState<{ hasAccess: boolean; expiresAt: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/reviews/listing/${id}`).then(r => r.json()).then(d => {
      setApiReviews(d.reviews ?? []);
      setReviewsLoaded(true);
    }).catch(() => setReviewsLoaded(true));
  }, [id]);

  useEffect(() => {
    if (!id || !profile) return;
    fetch(`/api/listings/${id}/first-access`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.hasAccess) setFirstAccess(d); })
      .catch(() => {});
  }, [id, profile]);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = id ? isWishlisted(id) : false;
  const [copied, setCopied] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [priceAlertTarget, setPriceAlertTarget] = useState("");
  const [priceAlertSaved, setPriceAlertSaved] = useState(() => {
    const a = getPriceAlerts(); return id ? !!a[id] : false;
  });
  const [priceAlertValue, setPriceAlertValue] = useState(() => {
    const a = getPriceAlerts(); return id && a[id] ? String(a[id]) : "";
  });
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedEdition, setSelectedEdition] = useState("Original");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [offerSent, setOfferSent] = useState(false);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSent, setPlanSent] = useState(false);

  const [onWaitlist, setOnWaitlist] = useState(() =>
    id ? getWaitlisted().includes(id) : false
  );

  useEffect(() => {
    if (!id) return;
    fetch("/api/me/price-alerts", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.alerts) return;
        setPriceAlertsLocal(data.alerts);
        if (data.alerts[id]) {
          setPriceAlertSaved(true);
          setPriceAlertValue(String(data.alerts[id]));
        }
      })
      .catch(() => {});
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const wl: string[] = Array.isArray(data?.settings?.listingWaitlist) ? data.settings.listingWaitlist : [];
        if (wl.length) {
          setWaitlistedLocal(wl);
          if (wl.includes(id)) setOnWaitlist(true);
        }
      })
      .catch(() => {});
  }, [id]);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [apiListing, setApiListing] = useState<import("@/data/listings").Listing | null>(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [artistShipping, setArtistShipping] = useState<ArtistShipping | null>(null);

  const staticListing = findListing(id ?? "");

  useEffect(() => {
    const artistId = staticListing?.artistId ?? apiListing?.artistId;
    if (!artistId) return;
    fetch(`/api/artists/${artistId}/shipping`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setArtistShipping(d); })
      .catch(() => {});
  }, [staticListing?.artistId, apiListing?.artistId]);

  useEffect(() => {
    if (staticListing || !id) return;
    setListingLoading(true);
    fetch(`/api/listings/${id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.id) {
          setApiListing({
            id: d.id, artistId: d.artistId, title: d.title,
            year: d.year != null ? String(d.year) : "",
            medium: d.medium ?? "", dimensions: d.dimensions ?? "",
            price: d.price ?? 0, imageUrl: d.imageUrl ?? null,
            available: d.isAvailable ?? true,
            isResale: d.isResale ?? false,
            originalArtistName: d.originalArtistName ?? "",
            originalListingId: d.originalListingId ?? "",
            royaltyPercent: d.royaltyPercent ?? 10,
            shipsTo: Array.isArray(d.shipsTo) ? d.shipsTo : [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setListingLoading(false));
  }, [id, staticListing]);

  const listing = staticListing ?? apiListing;
  const gallery = useMemo(() => buildGallery(listing?.imageUrl ?? null), [listing?.imageUrl]);
  const priceHistory = useMemo(() => listing ? generatePriceHistory(listing) : [], [listing]);

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: listing?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleWaitlist() {
    const current = getWaitlisted();
    const next = onWaitlist ? current.filter((i) => i !== id) : [...current, id!];
    setWaitlistedLocal(next);
    setOnWaitlist(!onWaitlist);
    fetch(`/api/me/listing-waitlist/${id}`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  function handleSendOffer() {
    if (!listing || !offerAmount) return;
    const artist = getArtistById(listing.artistId) ?? ALL_ARTISTS.find((a) => a.id === listing.artistId);
    sendCommissionInquiry({
      toArtistId: listing.artistId,
      toArtistName: artist?.name ?? "Unknown Artist",
      fromName: profile?.name ?? "Anonymous Collector",
      fromEmail: "collector@kiln.app",
      fromHandle: profile?.handle,
      type: "custom",
      description: `Offer for "${listing.title}" — $${offerAmount}${offerNote ? `\n\n${offerNote}` : ""}`,
      budget: `$${offerAmount}`,
      timeline: "Flexible",
    });
    setOfferSent(true);
    setTimeout(() => {
      setShowOfferModal(false);
      setOfferSent(false);
      setOfferAmount("");
      setOfferNote("");
    }, 1800);
  }

  async function handleSendPlan() {
    if (!listing || !selectedPlan) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/stripe/payment-plan-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingId: listing.id, installments: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPlanLoading(false);
        alert(data.error || "Failed to start checkout");
      }
    } catch (err) {
      setPlanLoading(false);
      alert("Failed to start checkout");
    }
  }

  async function handleSubmitReview() {
    if (!listing || reviewRating === 0) return;
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetId: listing.id, targetType: "listing", rating: reviewRating, body: reviewText }),
      });
      const data = await res.json();
      if (data.id) {
        setApiReviews(prev => [data, ...prev]);
      }
    } catch {}
    setReviewSubmitted(true);
    setShowReviewForm(false);
    setReviewRating(0);
    setReviewText("");
  }

  if (!listing) {
    if (listingLoading) {
      return (
        <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-4">
          <Nav />
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-4">
        <Nav />
        <Package size={36} className="text-stone-700" />
        <p className="text-stone-500">Work not found</p>
        <Link href="/shop">
          <button className="rounded-full border border-amber-500/30 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors">
            Back to shop
          </button>
        </Link>
      </div>
    );
  }

  const artist = getArtistById(listing.artistId) ?? ALL_ARTISTS.find((a) => a.id === listing.artistId);
  const avatar = artist?.images?.[0]?.url ?? `https://picsum.photos/seed/${listing.artistId}/200/200`;
  const related = getRelated(listing);
  const inCart = isInCart(listing.id);
  const reviews = apiReviews;
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const suggestedOffer = Math.round(listing.price * 0.85 / 100) * 100;
  const priceGrowth = priceHistory.length > 1
    ? Math.round((listing.price / priceHistory[0]!.price - 1) * 100)
    : 0;
  const currentImage = gallery[selectedImg] ?? listing.imageUrl;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6">

        {/* Collector first-access banner */}
        {firstAccess?.hasAccess && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Award size={15} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200">You have first access</p>
              <p className="text-xs text-stone-400">
                As one of this artist's top collectors, you have a 24-hour head start before this listing goes public.
                {firstAccess.expiresAt && (
                  <> Expires {new Date(firstAccess.expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-xs text-stone-600">
          <Link href="/shop" className="hover:text-amber-400 transition-colors">Shop</Link>
          <ChevronRight size={12} />
          <span className="text-stone-500">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14">

          {/* ── Image gallery ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-900 border border-white/8">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={listing.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (selectedImg > 0) {
                      const fallback = gallery[0] ?? listing.imageUrl;
                      if (fallback && el.src !== fallback) { el.src = fallback; }
                      else { el.style.display = "none"; }
                    } else { el.style.display = "none"; }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Palette size={48} className="text-stone-700" />
                </div>
              )}
              {!listing.available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="rounded-full bg-black/70 px-5 py-2 text-sm text-white/60 uppercase tracking-widest">Sold</span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      selectedImg === i ? "border-amber-500" : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <img src={src} alt={`View ${i + 1}`} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: "Authenticated", sub: "Certificate included" },
                { icon: Truck, label: "Insured shipping", sub: "White glove delivery" },
                { icon: Award, label: "Kiln Verified", sub: "Artist in good standing" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-stone-900/40 p-3 text-center">
                  <Icon size={14} className="text-amber-400" />
                  <p className="text-[10px] font-semibold text-stone-300 leading-tight">{label}</p>
                  <p className="text-[9px] text-stone-700 leading-tight">{sub}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Details column ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">

            {/* Artist link */}
            {artist && (
              <Link href={`/artists/${artist.id}`}>
                <div className="flex items-center gap-2.5 mb-4 group w-fit">
                  <img src={avatar} alt={artist.name}
                    className="h-8 w-8 rounded-full object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${listing.artistId}/80/80`; }}
                  />
                  <div>
                    <p className="text-xs text-amber-400 group-hover:text-amber-300 transition-colors font-semibold">{artist.name}</p>
                    <p className="text-[10px] text-stone-600">{artist.location}</p>
                  </div>
                  <ExternalLink size={11} className="text-stone-700 group-hover:text-amber-400 transition-colors" />
                </div>
              </Link>
            )}

            <h1 className="font-serif text-3xl text-amber-100 mb-1 leading-tight">{listing.title}</h1>
            <p className="text-stone-500 text-sm mb-3">{listing.medium}</p>

            {/* Resale Banner */}
            {(listing as any).isResale && (
              <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">
                    <TrendingDown size={11} className="text-amber-400 rotate-180" />
                  </div>
                  <span className="text-xs font-semibold text-amber-200">Resale Work</span>
                </div>
                <p className="text-[11px] text-stone-400 mb-1.5">
                  Originally by <span className="text-stone-200">{(listing as any).originalArtistName}</span>
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-stone-500 italic">
                  <Landmark size={10} />
                  <span>{(listing as any).royaltyPercent}% of this sale goes back to the original artist</span>
                </div>
              </div>
            )}

            {/* Rating summary */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRow rating={Math.round(avgRating)} size={13} />
                <span className="text-xs text-stone-400">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-stone-600">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
              </div>
            )}

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { icon: Calendar, label: "Year", value: listing.year },
                { icon: Ruler, label: "Dimensions", value: listing.dimensions },
                { icon: Palette, label: "Medium", value: listing.medium.split(",")[0] },
                { icon: Package, label: "Availability", value: listing.available ? "Available" : "Sold" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={11} className="text-stone-600" />
                    <span className="text-[10px] text-stone-600 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm text-stone-300 font-medium leading-snug">{value}</p>
                </div>
              ))}
            </div>

            {/* Edition / Format variants */}
            <div className="mb-5 space-y-3">
              <div>
                <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold mb-2">Edition</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-lg border border-amber-500 bg-amber-500/10 text-amber-300 text-xs font-medium">
                    {listing.edition ?? "One of a kind"}
                  </span>
                </div>
              </div>
              {listing.dimensions && (
                <div>
                  <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold mb-2">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {["As shown", "Custom scale", "Miniature edition"].map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(selectedSize === sz ? null : sz)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          selectedSize === sz
                            ? "border-amber-500 bg-amber-500/10 text-amber-300"
                            : "border-white/10 text-stone-400 hover:border-white/20 hover:text-stone-300"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                  {selectedSize && selectedSize !== "As shown" && (
                    <p className="mt-1.5 text-[10px] text-stone-600">Custom sizing is commissioned directly. Contact the artist for a quote.</p>
                  )}
                </div>
              )}
            </div>

            {/* Price history chart */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold">Price history · 12 months</p>
                {priceGrowth > 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">+{priceGrowth}% appreciation</span>
                )}
              </div>
              <div className="rounded-xl border border-white/8 bg-stone-900/40 px-3 pt-3 pb-1">
                <ResponsiveContainer width="100%" height={72}>
                  <AreaChart data={priceHistory} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id={`priceGrad-${listing.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ background: "#1a1714", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, padding: "4px 10px" }}
                      formatter={(v: number) => [formatPrice(v), "Price"]}
                      labelStyle={{ color: "#78716c", fontSize: 10 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      fill={`url(#priceGrad-${listing.id})`}
                      dot={false}
                      activeDot={{ r: 3, fill: "#f59e0b", stroke: "#12100e", strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px] text-stone-700">{priceHistory[0]?.month}</span>
                  <span className="text-[9px] text-stone-700">{priceHistory[priceHistory.length - 1]?.month}</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="mb-5">
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className="font-serif text-4xl text-amber-200 font-medium">{formatPrice(listing.price)}</span>
                {(listing as any).currency && (listing as any).currency !== "USD" && (
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 uppercase">
                    {(listing as any).currency}
                  </span>
                )}
                {listing.price >= 15000 && (
                  <span className="text-xs text-stone-600">Payment plans available</span>
                )}
              </div>
              {(listing as any).bundleMinQty && (listing as any).bundleDiscountPct && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                  <span>🎁</span>
                  Buy {(listing as any).bundleMinQty}+ and save {(listing as any).bundleDiscountPct}%
                </div>
              )}
              {artistShipping && (
                <div className="flex flex-wrap items-center gap-2">
                  {artistShipping.offerFreeShipping ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                      <Truck size={10} />Free shipping
                    </span>
                  ) : (
                    <>
                      {artistShipping.domesticRate != null && artistShipping.domesticRate > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-stone-900/60 px-2.5 py-1 text-[11px] text-stone-400">
                          <Truck size={10} />US from ${artistShipping.domesticRate}
                        </span>
                      )}
                      {artistShipping.internationalRate != null && artistShipping.internationalRate > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/8 px-2.5 py-1 text-[11px] text-sky-400">
                          <Truck size={10} />International ${artistShipping.internationalRate}
                        </span>
                      )}
                    </>
                  )}
                  {artistShipping.offerLocalPickup && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-400">
                      <MapPinned size={10} />Local pickup available
                    </span>
                  )}
                </div>
              )}
              {listing.shipsTo && listing.shipsTo.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <MapPin size={10} className="text-stone-600 shrink-0" />
                  <span className="text-[10px] text-stone-600">Ships to:</span>
                  {listing.shipsTo.map((region) => (
                    <span key={region} className="rounded-full border border-white/8 bg-stone-900/50 px-2 py-0.5 text-[10px] text-stone-400">
                      {region}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AR Preview */}
            {listing.imageUrl && (
              <div className="mb-4">
                <ARPreview
                  imageUrl={currentImage ?? listing.imageUrl}
                  title={listing.title}
                  widthInches={parseInt(listing.dimensions?.split("×")[0]) || 18}
                  heightInches={parseInt(listing.dimensions?.split("×")[1]) || 24}
                />
              </div>
            )}

            {/* ── Shipping Estimate ── */}
            <ShippingEstimate listing={listing} />

            {/* ── Actions ── */}
            {listing.available ? (
              <>
                <div className="flex gap-2 mb-2.5">
                  <button
                    onClick={() => addItem(listing)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold border transition-all ${
                      inCart
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    }`}
                  >
                    {inCart ? <Check size={15} /> : <Plus size={15} />}
                    {inCart ? "In cart" : "Add to cart"}
                  </button>
                  <Link href={`/shop/checkout/${listing.id}`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                      <ShoppingCart size={15} /> Buy now
                    </button>
                  </Link>
                  <button
                    onClick={() => id && toggleWishlist(id)}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      wishlisted ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
                    }`}
                    title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                  >
                    <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                  </button>
                </div>

                {/* Make an offer + Payment plan */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setShowOfferModal(true); setOfferAmount(String(suggestedOffer)); }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-stone-700 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-all"
                  >
                    <TrendingDown size={14} /> Make an offer
                  </button>
                  {listing.price >= 15000 && (
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-stone-700 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-all"
                    >
                      <Landmark size={14} /> Payment plan
                    </button>
                  )}
                  <button
                    onClick={() => setShowPriceAlert(true)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2.5 text-xs transition-all ${
                      priceAlertSaved
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-stone-700 text-stone-400 hover:border-amber-500/30 hover:text-amber-400"
                    }`}
                    title="Set a price drop alert"
                  >
                    <TrendingDown size={13} />
                    {priceAlertSaved ? `Alert: ${priceAlertValue ? `<$${parseInt(priceAlertValue).toLocaleString()}` : "set"}` : "Price alert"}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center justify-center rounded-full border border-white/10 py-3 text-sm text-stone-600">
                    This work has been sold
                  </div>
                  <Link href={`/commission/${listing.artistId}`} className="flex-1">
                    <button className="w-full rounded-full border border-amber-500/30 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
                      Commission a new work
                    </button>
                  </Link>
                </div>
                <button
                  onClick={handleWaitlist}
                  className={`w-full flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm transition-all ${
                    onWaitlist
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 text-stone-500 hover:border-amber-500/30 hover:text-amber-400"
                  }`}
                >
                  {onWaitlist
                    ? <><BellOff size={14} /> Remove from waitlist</>
                    : <><Bell size={14} /> Notify me when similar work is available</>}
                </button>
              </div>
            )}

            {/* Inquiry note */}
            <p className="text-xs text-stone-700 leading-relaxed mb-6">
              All sales are handled directly between collector and artist.
              Kiln facilitates introductions and provides authentication infrastructure.
              Inquiries are typically answered within 2–3 business days.
            </p>

            {/* Artist bio */}
            {artist && (
              <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
                <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold mb-3">About the artist</p>
                <div className="flex items-start gap-3">
                  <img src={avatar} alt={artist.name}
                    className="h-12 w-12 rounded-full object-cover border border-white/10 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${listing.artistId}/80/80`; }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-200 mb-1">{artist.name}</p>
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{artist.bio}</p>
                    <Link href={`/artists/${artist.id}`}>
                      <button className="mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
                        View full profile <ChevronRight size={10} />
                      </button>
                    </Link>
                  </div>
                </div>
                {artist.location && (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                    <MapPin size={11} className="text-stone-600" />
                    <span className="text-xs text-stone-600">{artist.location}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Print QR / Physical Certificate ── */}
        <div className="mb-10">
          <button
            onClick={() => setQrExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-stone-900/40 px-5 py-4 hover:border-amber-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <QrCode size={16} className="text-amber-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-stone-200">Physical Certificate</p>
                <p className="text-xs text-stone-500">Print a QR code to attach to the physical piece</p>
              </div>
            </div>
            <ChevronRight size={15} className={`text-stone-600 transition-transform ${qrExpanded ? "rotate-90" : ""}`} />
          </button>
          <AnimatePresence>
            {qrExpanded && (() => {
              const listingUrl = `${window.location.origin}${window.location.pathname.split("/kiln")[0]}/kiln/shop/${id}`;
              const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&bgcolor=18160c&color=e8d5a3&qzone=2&data=${encodeURIComponent(listingUrl)}`;
              async function handleDownload() {
                setQrDownloading(true);
                try {
                  const r = await fetch(qrSrc);
                  const blob = await r.blob();
                  const href = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = href; a.download = `kiln-certificate-${id}.png`; a.click();
                  URL.revokeObjectURL(href);
                } catch { /* ignore */ }
                finally { setQrDownloading(false); }
              }
              return (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-2xl border border-amber-500/15 bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-900 p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="rounded-xl overflow-hidden border border-amber-500/20 p-2 bg-[#18160c] shrink-0">
                        <img src={qrSrc} alt="QR code" width={120} height={120} className="block" />
                      </div>
                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <p className="font-serif text-base text-amber-100">{listing?.title}</p>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Scan to view provenance, artist story, and original listing — attach to the physical piece for a permanent digital record.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <button
                            onClick={handleDownload}
                            disabled={qrDownloading}
                            className="flex items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                          >
                            <Download size={12} /> {qrDownloading ? "Downloading…" : "Download PNG"}
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(listingUrl).catch(() => {}); }}
                            className="flex items-center justify-center gap-2 rounded-full border border-stone-700 px-4 py-2 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors"
                          >
                            <Share2 size={12} /> Copy link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* ── Reviews ── */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-serif text-xl text-amber-100">Collector reviews</p>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <StarRow rating={Math.round(avgRating)} size={13} />
                  <span className="text-sm text-stone-400">{avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
            {!showReviewForm && !reviewSubmitted && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-all"
              >
                <MessageSquare size={12} /> Write a review
              </button>
            )}
            {reviewSubmitted && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check size={12} /> Review posted
              </span>
            )}
          </div>

          <AnimatePresence>
            {showReviewForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="rounded-2xl border border-amber-500/20 bg-stone-900/60 p-5">
                  <p className="text-sm font-semibold text-stone-200 mb-3">Your rating</p>
                  <StarRow rating={reviewRating} size={22} interactive onRate={setReviewRating} />
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this work or artist…"
                    rows={3}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowReviewForm(false)}
                      className="flex-1 rounded-full border border-white/10 py-2 text-xs text-stone-500 hover:text-stone-300 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSubmitReview} disabled={reviewRating === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-amber-500 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <Send size={11} /> Post review
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {reviews.length === 0 && !showReviewForm ? (
            <div className="rounded-2xl border border-white/5 bg-stone-900/30 py-12 flex flex-col items-center gap-3">
              <Star size={28} className="text-stone-700" />
              <p className="text-sm text-stone-600">No reviews yet</p>
              <button onClick={() => setShowReviewForm(true)} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Be the first to review this work
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
                  <div className="flex items-start gap-3">
                    <img src={r.reviewerAvatarUrl ?? `https://picsum.photos/seed/${r.id}/60/60`} alt={r.reviewerName}
                      className="h-9 w-9 rounded-full object-cover border border-white/10 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/60/60`; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-stone-200">{r.reviewerName}</p>
                        <span className="text-[10px] text-stone-600">
                          {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <StarRow rating={r.rating} size={12} />
                      {r.body && <p className="mt-2 text-sm text-stone-400 leading-relaxed">{r.body}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── Related works ── */}
        {related.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-serif text-xl text-amber-100">Related works</p>
              <Link href="/shop" className="text-xs text-stone-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                Browse all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link href={`/listings/${r.id}`}>
                    <div className="group rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden hover:border-amber-500/20 transition-colors cursor-pointer">
                      <div className="aspect-[4/3] overflow-hidden bg-stone-800">
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Palette size={28} className="text-stone-700" /></div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-amber-500 mb-0.5 uppercase tracking-wide">{getArtistName(r.artistId)}</p>
                        <p className="text-sm font-medium text-stone-200 leading-snug line-clamp-1 mb-1">{r.title}</p>
                        <p className="text-xs text-stone-600">{r.year} · {r.medium.split(",")[0]}</p>
                        <p className="text-sm font-semibold text-amber-300 mt-2">{formatPrice(r.price)}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Make an Offer modal ── */}
      <AnimatePresence>
        {showOfferModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOfferModal(false); }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1a1714] p-6">
              {offerSent ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-semibold text-stone-200">Offer sent!</p>
                  <p className="text-sm text-stone-500 text-center">{getArtistName(listing.artistId)} will review your offer and respond via their inbox.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-serif text-lg text-amber-100">Make an offer</p>
                      <p className="text-xs text-stone-600 mt-0.5">{listing.title} · Asking {formatPrice(listing.price)}</p>
                    </div>
                    <button onClick={() => setShowOfferModal(false)} className="text-stone-600 hover:text-stone-300 transition-colors"><X size={18} /></button>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs text-stone-500 uppercase tracking-wide mb-2 block">Your offer</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder={String(suggestedOffer)}
                        className="w-full rounded-xl border border-white/10 bg-stone-800 pl-9 pr-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40" />
                    </div>
                    <p className="text-[10px] text-stone-700 mt-1.5">Suggested: {formatPrice(suggestedOffer)} (15% below asking)</p>
                  </div>
                  <div className="mb-5">
                    <label className="text-xs text-stone-500 uppercase tracking-wide mb-2 block">Message <span className="text-stone-700">(optional)</span></label>
                    <textarea value={offerNote} onChange={(e) => setOfferNote(e.target.value)}
                      placeholder="Introduce yourself or explain your offer…" rows={3}
                      className="w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 resize-none" />
                  </div>
                  <button onClick={handleSendOffer} disabled={!offerAmount}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send size={14} /> Send offer
                  </button>
                  <p className="text-[10px] text-stone-700 text-center mt-3">Your offer goes directly to the artist. Kiln does not guarantee acceptance.</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Payment Plan modal ── */}
      <AnimatePresence>
        {showPlanModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPlanModal(false); }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1a1714] p-6">
              {planSent ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-semibold text-stone-200">Request sent!</p>
                  <p className="text-sm text-stone-500 text-center">{getArtistName(listing.artistId)} will review your payment plan request and follow up directly.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-serif text-lg text-amber-100">Pay in installments</p>
                      <p className="text-xs text-stone-600 mt-0.5">{listing.title} · {formatPrice(listing.price)}</p>
                    </div>
                    <button onClick={() => setShowPlanModal(false)} className="text-stone-600 hover:text-stone-300 transition-colors"><X size={18} /></button>
                  </div>

                  <div className="space-y-3 mb-5">
                    {[2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSelectedPlan(num)}
                        className={`w-full text-left rounded-xl border px-4 py-4 transition-all ${
                          selectedPlan === num
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-semibold ${selectedPlan === num ? "text-amber-300" : "text-stone-200"}`}>{num} installments</p>
                          {selectedPlan === num && <Check size={14} className="text-amber-400" />}
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {formatPrice(Math.ceil(listing.price / num))} per month
                        </p>
                      </button>
                    ))}
                  </div>

                  <button onClick={handleSendPlan} disabled={!selectedPlan || planLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {planLoading ? (
                      <div className="h-4 w-4 rounded-full border-2 border-stone-900/30 border-t-stone-900 animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {planLoading ? "Redirecting..." : "Start payment plan"}
                  </button>
                  <p className="text-[10px] text-stone-700 text-center mt-3">You will be redirected to Stripe to complete the first installment.</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {id && (
        <div className="mx-auto max-w-4xl px-4 pb-10">
          <ReviewsSection targetId={id} targetType="listing" />
        </div>
      )}

      {/* Price alert modal */}
      <AnimatePresence>
        {showPriceAlert && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPriceAlert(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-700 p-6 space-y-4"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-amber-100">Price Drop Alert</h3>
                <button onClick={() => setShowPriceAlert(false)} className="text-stone-500 hover:text-stone-300">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-stone-400">
                We'll notify you if this piece drops below your target price.
              </p>
              {priceAlertSaved ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                  <Check size={20} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-sm text-emerald-400 font-medium">Alert set for &lt;${parseInt(priceAlertValue).toLocaleString()}</p>
                  <button
                    onClick={() => {
                      const a = getPriceAlerts();
                      delete a[id!];
                      setPriceAlertsLocal(a);
                      setPriceAlertSaved(false);
                      setPriceAlertValue("");
                      fetch(`/api/me/price-alerts/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
                    }}
                    className="mt-2 text-xs text-stone-500 hover:text-stone-300 underline"
                  >
                    Remove alert
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-stone-400 uppercase tracking-wider mb-1.5 block">Alert me when price drops below</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                      <input
                        type="number"
                        value={priceAlertTarget}
                        onChange={(e) => setPriceAlertTarget(e.target.value)}
                        placeholder={(listing?.price ? Math.round(listing.price * 0.85) : 0).toString()}
                        className="w-full rounded-xl bg-stone-800 border border-stone-600 pl-7 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60"
                      />
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1.5">Current price: {listing ? formatPrice(listing.price) : "—"}</p>
                  </div>
                  <button
                    disabled={!priceAlertTarget || parseInt(priceAlertTarget) <= 0}
                    onClick={() => {
                      if (!priceAlertTarget || !id) return;
                      const targetPrice = parseInt(priceAlertTarget);
                      const a = getPriceAlerts();
                      a[id] = targetPrice;
                      setPriceAlertsLocal(a);
                      setPriceAlertSaved(true);
                      setPriceAlertValue(priceAlertTarget);
                      setShowPriceAlert(false);
                      fetch(`/api/me/price-alerts/${id}`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ targetPrice }),
                      }).catch(() => {});
                    }}
                    className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Set alert
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
