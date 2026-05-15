import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { SlidersHorizontal, ShoppingCart, Plus, Check, Heart } from "lucide-react";
import Nav from "@/components/Nav";
import { listings, formatPrice, Listing } from "@/data/listings";
import { artists } from "@/data/artists";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/hooks/useWishlist";

const MEDIUMS = ["All", "Glass", "Metal", "Sculpture", "Fiber"];
const SORTS = ["Default", "Price: Low to High", "Price: High to Low"];

const SIZES = ['Any size', 'Small (<12")', 'Medium (12–24")', 'Large (24–48")', 'Monumental (48"+)'] as const;
type SizeLabel = typeof SIZES[number];

function maxDim(dims: string): number {
  const nums = [...dims.matchAll(/[\d.]+/g)].map(m => parseFloat(m[0]));
  return Math.max(...nums, 0);
}
function matchSize(listing: Listing, s: SizeLabel): boolean {
  if (s === 'Any size') return true;
  const m = maxDim(listing.dimensions);
  if (s === 'Small (<12")') return m < 12;
  if (s === 'Medium (12–24")') return m >= 12 && m < 24;
  if (s === 'Large (24–48")') return m >= 24 && m < 48;
  if (s === 'Monumental (48"+)') return m >= 48;
  return true;
}

const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under $1K",  min: 0,     max: 999 },
  { label: "$1K–$5K",   min: 1000,  max: 4999 },
  { label: "$5K–$25K",  min: 5000,  max: 24999 },
  { label: "$25K+",     min: 25000, max: Infinity },
] as const;

function matchMedium(listing: Listing, filter: string): boolean {
  if (filter === "All") return true;
  const m = listing.medium.toLowerCase();
  if (filter === "Glass") return m.includes("glass");
  if (filter === "Metal") return m.includes("steel") || m.includes("metal") || m.includes("forged");
  if (filter === "Sculpture") return m.includes("cast") || m.includes("sculpt");
  if (filter === "Fiber") return m.includes("filet") || m.includes("thread");
  return true;
}

function getArtistName(artistId: string): string {
  return artists.find((a) => a.id === artistId)?.name ?? artistId;
}

export default function Shop() {
  const [medium, setMedium] = useState("All");
  const [sort, setSort] = useState("Default");
  const [showSold, setShowSold] = useState(false);
  const [priceRangeIdx, setPriceRangeIdx] = useState(0);
  const [size, setSize] = useState<SizeLabel>('Any size');
  const { addItem, isInCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const priceRange = PRICE_RANGES[priceRangeIdx];
  let filtered = listings.filter((l) =>
    matchMedium(l, medium) &&
    matchSize(l, size) &&
    (showSold || l.available) &&
    l.price >= priceRange.min &&
    l.price <= priceRange.max
  );

  if (sort === "Price: Low to High") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "Price: High to Low") filtered = [...filtered].sort((a, b) => b.price - a.price);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Kiln · Marketplace
          </p>
          <h1 className="font-serif text-3xl font-normal text-foreground mb-1">Available Works</h1>
          <p className="text-sm text-muted-foreground">
            Acquire museum-quality work directly from the artists.
          </p>
        </div>

        <div className="mb-8 pb-6 border-b border-border/50 space-y-3">
          {/* Row 1: medium + controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1" data-testid="shop-medium-filters">
              {MEDIUMS.map((m) => (
                <button
                  key={m}
                  data-testid={`shop-filter-${m.toLowerCase()}`}
                  onClick={() => setMedium(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    medium === m
                      ? "text-background font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  style={medium === m ? { background: "hsl(28 68% 52%)" } : {}}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                data-testid="toggle-sold"
                onClick={() => setShowSold((v) => !v)}
                className={`text-[11px] transition-colors px-3 py-1.5 rounded-full border ${
                  showSold
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {showSold ? "Hiding sold" : "Show sold"}
              </button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <SlidersHorizontal size={13} />
                <select
                  data-testid="shop-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-transparent text-xs text-muted-foreground focus:outline-none cursor-pointer hover:text-foreground transition-colors"
                >
                  {SORTS.map((s) => (
                    <option key={s} value={s} style={{ background: "hsl(20 8% 12%)" }}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: price range */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Price:</span>
            {PRICE_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setPriceRangeIdx(i)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  priceRangeIdx === i
                    ? "border-primary/50 text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Row 3: size */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Size:</span>
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  size === s
                    ? "border-primary/50 text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((listing, i) => (
            <motion.div
              key={listing.id}
              data-testid={`listing-card-${listing.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className={`group bg-card rounded-lg overflow-hidden border border-card-border hover:border-primary/30 transition-all duration-300 ${
                !listing.available ? "opacity-60" : ""
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer">
                <Link href={`/listings/${listing.id}`}>
                  {listing.imageUrl && (
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  {!listing.available && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-black/60 text-white/70 text-[10px] uppercase tracking-wider">
                        Sold
                      </span>
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => toggleWishlist(listing.id)}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70"
                  title={isWishlisted(listing.id) ? "Remove from wishlist" : "Save to wishlist"}
                >
                  <Heart size={13} className={isWishlisted(listing.id) ? "fill-rose-400 text-rose-400" : "text-white/70"} />
                </button>
              </div>

              <div className="p-4">
                <Link href={`/listings/${listing.id}`}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-1 hover:opacity-80 transition-opacity">
                    {getArtistName(listing.artistId)}
                  </p>
                </Link>
                <Link href={`/listings/${listing.id}`}>
                  <p className="text-sm font-medium text-foreground leading-tight mb-1 hover:opacity-80 transition-opacity cursor-pointer">{listing.title}</p>
                </Link>
                <p className="text-[11px] text-muted-foreground mb-1">{listing.year} · {listing.medium.split(",")[0]}</p>
                <p className="text-[10px] text-muted-foreground mb-3">{listing.dimensions}</p>

                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">
                    {formatPrice(listing.price)}
                  </span>
                  {listing.available ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => addItem(listing)}
                        data-testid={`add-to-cart-btn-${listing.id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-all"
                        style={isInCart(listing.id)
                          ? { borderColor: "hsl(142 70% 45% / 0.4)", color: "hsl(142 70% 60%)", background: "hsl(142 70% 45% / 0.1)" }
                          : { borderColor: "hsl(28 68% 52% / 0.4)", color: "hsl(28 68% 62%)", background: "transparent" }}
                      >
                        {isInCart(listing.id) ? <Check size={9} /> : <Plus size={9} />}
                        {isInCart(listing.id) ? "In cart" : "Add"}
                      </button>
                      <Link href={`/shop/checkout/${listing.id}`}>
                        <button
                          data-testid={`inquire-btn-${listing.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all"
                          style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}
                        >
                          <ShoppingCart size={9} /> Buy
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Unavailable</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-muted-foreground text-sm">No works match the current filters.</p>
          </div>
        )}

        <div className="mt-16 p-8 rounded-xl border border-border/50 bg-card/50">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">About Kiln Marketplace</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            All inquiries are handled directly between collector and artist. Kiln facilitates introductions
            and provides secure transaction infrastructure. Works are authenticated and documented.
            Pricing shown is the asking price; payment plans are available for works over $25,000.
          </p>
        </div>
      </div>
    </div>
  );
}
