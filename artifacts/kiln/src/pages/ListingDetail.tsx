import { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ShoppingCart, Heart, Share2, Check, Plus,
  Shield, Truck, Award, MapPin, ExternalLink, ChevronRight,
  Package, Ruler, Calendar, Palette, Star, MessageSquare,
  Bell, BellOff, DollarSign, X, Send, TrendingDown,
} from "lucide-react";
import Nav from "@/components/Nav";
import { listings, formatPrice, type Listing } from "@/data/listings";
import { getArtistById, artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useCart } from "@/contexts/CartContext";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import ARPreview from "@/components/ARPreview";

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

const WAITLIST_KEY = "kiln_listing_waitlist_v1";
function getWaitlisted(): string[] {
  try { return JSON.parse(localStorage.getItem(WAITLIST_KEY) ?? "[]"); } catch { return []; }
}
function setWaitlisted(ids: string[]) {
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(ids));
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { addItem, isInCart } = useCart();
  const { getReviews, addReview, sendCommissionInquiry } = useSocial();
  const { profile } = useProfile();

  const [wishlisted, setWishlisted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [offerSent, setOfferSent] = useState(false);

  const [onWaitlist, setOnWaitlist] = useState(() =>
    id ? getWaitlisted().includes(id) : false
  );

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const listing = findListing(id ?? "");

  const gallery = useMemo(() => buildGallery(listing?.imageUrl ?? null), [listing?.imageUrl]);

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
    if (onWaitlist) {
      setWaitlisted(current.filter((i) => i !== id));
      setOnWaitlist(false);
    } else {
      setWaitlisted([...current, id!]);
      setOnWaitlist(true);
    }
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

  function handleSubmitReview() {
    if (!listing || reviewRating === 0) return;
    addReview({
      listingId: listing.id,
      fromName: profile?.name ?? "Anonymous Collector",
      fromAvatarUrl: `https://picsum.photos/seed/${profile?.handle ?? "anon"}/60/60`,
      rating: reviewRating,
      text: reviewText,
    });
    setReviewSubmitted(true);
    setShowReviewForm(false);
    setReviewRating(0);
    setReviewText("");
  }

  if (!listing) {
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
  const reviews = getReviews(listing.id);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const suggestedOffer = Math.round(listing.price * 0.85 / 100) * 100;

  const currentImage = gallery[selectedImg] ?? listing.imageUrl;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-xs text-stone-600">
          <Link href="/shop" className="hover:text-amber-400 transition-colors">Shop</Link>
          <ChevronRight size={12} />
          <span className="text-stone-500">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-14">

          {/* Image gallery */}
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
                    <img
                      src={src}
                      alt={`View ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
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

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
            {/* Artist */}
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

            {/* Rating summary */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRow rating={Math.round(avgRating)} size={13} />
                <span className="text-xs text-stone-400">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-stone-600">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
              </div>
            )}

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 mb-6">
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

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-serif text-4xl text-amber-200 font-medium">{formatPrice(listing.price)}</span>
              {listing.price > 25000 && (
                <span className="text-xs text-stone-600">Payment plans available</span>
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

            {/* Actions */}
            {listing.available ? (
              <>
                <div className="flex gap-2 mb-3">
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
                    onClick={() => setWishlisted((v) => !v)}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      wishlisted ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
                    }`}
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

                {/* Make an offer */}
                <button
                  onClick={() => { setShowOfferModal(true); setOfferAmount(String(suggestedOffer)); }}
                  className="w-full flex items-center justify-center gap-2 rounded-full border border-stone-700 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-all mb-4"
                >
                  <TrendingDown size={14} /> Make an offer
                </button>
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
                {/* Waitlist */}
                <button
                  onClick={handleWaitlist}
                  className={`w-full flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm transition-all ${
                    onWaitlist
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/10 text-stone-500 hover:border-amber-500/30 hover:text-amber-400"
                  }`}
                >
                  {onWaitlist ? <><BellOff size={14} /> Remove from waitlist</> : <><Bell size={14} /> Notify me when similar work is available</>}
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

        {/* Reviews section */}
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

          {/* Review form */}
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
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 rounded-full border border-white/10 py-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewRating === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-amber-500 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Be the first to review this work
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/8 bg-stone-900/40 p-5"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={r.fromAvatarUrl}
                      alt={r.fromName}
                      className="h-9 w-9 rounded-full object-cover border border-white/10 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/60/60`; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-stone-200">{r.fromName}</p>
                        <span className="text-[10px] text-stone-600">
                          {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <StarRow rating={r.rating} size={12} />
                      {r.text && <p className="mt-2 text-sm text-stone-400 leading-relaxed">{r.text}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Related works */}
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
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link href={`/listings/${r.id}`}>
                    <div className="group rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden hover:border-amber-500/20 transition-colors cursor-pointer">
                      <div className="aspect-[4/3] overflow-hidden bg-stone-800">
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Palette size={28} className="text-stone-700" />
                          </div>
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

      {/* Make an Offer modal */}
      <AnimatePresence>
        {showOfferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOfferModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1a1714] p-6"
            >
              {offerSent ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-semibold text-stone-200">Offer sent!</p>
                  <p className="text-sm text-stone-500 text-center">
                    {getArtistName(listing.artistId)} will review your offer and respond in their inbox.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-serif text-lg text-amber-100">Make an offer</p>
                      <p className="text-xs text-stone-600 mt-0.5">{listing.title} · Asking {formatPrice(listing.price)}</p>
                    </div>
                    <button onClick={() => setShowOfferModal(false)} className="text-stone-600 hover:text-stone-300 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-stone-500 uppercase tracking-wide mb-2 block">Your offer</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder={String(suggestedOffer)}
                        className="w-full rounded-xl border border-white/10 bg-stone-800 pl-9 pr-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                      />
                    </div>
                    <p className="text-[10px] text-stone-700 mt-1.5">
                      Suggested: {formatPrice(suggestedOffer)} (15% below asking)
                    </p>
                  </div>

                  <div className="mb-5">
                    <label className="text-xs text-stone-500 uppercase tracking-wide mb-2 block">Message to artist <span className="text-stone-700">(optional)</span></label>
                    <textarea
                      value={offerNote}
                      onChange={(e) => setOfferNote(e.target.value)}
                      placeholder="Introduce yourself or explain your offer…"
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSendOffer}
                    disabled={!offerAmount}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={14} /> Send offer
                  </button>

                  <p className="text-[10px] text-stone-700 text-center mt-3 leading-relaxed">
                    Your offer is sent directly to the artist. Kiln does not guarantee acceptance.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
