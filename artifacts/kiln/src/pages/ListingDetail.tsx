import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, ShoppingCart, Heart, Share2, Check, Plus,
  Shield, Truck, Award, MapPin, ExternalLink, ChevronRight,
  Package, Ruler, Calendar, Palette,
} from "lucide-react";
import Nav from "@/components/Nav";
import { listings, formatPrice, type Listing } from "@/data/listings";
import { getArtistById, artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useCart } from "@/contexts/CartContext";
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
    .filter((l) => l.id !== listing.id && l.id !== listing.id &&
      !sameArtist.find((s) => s.id === l.id) &&
      l.medium.split(",")[0].trim() === listing.medium.split(",")[0].trim() &&
      l.available)
    .slice(0, 3 - sameArtist.length);
  return [...sameArtist, ...sameMedium];
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { addItem, isInCart } = useCart();
  const [wishlisted, setWishlisted] = useState(false);
  const [copied, setCopied] = useState(false);

  const listing = findListing(id ?? "");

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
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-900 border border-white/8">
              {listing.imageUrl ? (
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            {/* Artist */}
            {artist && (
              <Link href={`/artists/${artist.id}`}>
                <div className="flex items-center gap-2.5 mb-4 group w-fit">
                  <img src={avatar} alt={artist.name}
                    className="h-8 w-8 rounded-full object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/80/80`; }}
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
            <p className="text-stone-500 text-sm mb-5">{listing.medium}</p>

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

            {/* Actions */}
            {listing.available ? (
              <div className="flex gap-2 mb-4">
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
            ) : (
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center justify-center rounded-full border border-white/10 py-3 text-sm text-stone-600">
                  This work has been sold
                </div>
                <Link href={`/commission/${listing.artistId}`} className="flex-1">
                  <button className="w-full rounded-full border border-amber-500/30 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
                    Commission a new work
                  </button>
                </Link>
              </div>
            )}

            {/* Inquiry note */}
            <p className="text-xs text-stone-700 leading-relaxed mb-6">
              All sales are handled directly between collector and artist.
              Kiln facilitates introductions and provides escrow infrastructure.
              Inquiries are typically answered within 2–3 business days.
            </p>

            {/* Artist bio snippet */}
            {artist && (
              <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
                <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold mb-3">About the artist</p>
                <div className="flex items-start gap-3">
                  <img src={avatar} alt={artist.name}
                    className="h-12 w-12 rounded-full object-cover border border-white/10 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/80/80`; }}
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
    </div>
  );
}
