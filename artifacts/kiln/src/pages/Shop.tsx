import { useState, useEffect } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { SlidersHorizontal, ShoppingCart, Plus, Check, Heart, Loader2, Truck } from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";

interface ArtistShipping {
  offerFreeShipping: boolean;
  domesticRate: number | null;
  internationalRate: number | null;
  freeThreshold: number | null;
  offerLocalPickup: boolean;
}

function ShippingBadge({ shipping }: { shipping: ArtistShipping | undefined }) {
  if (!shipping) return null;
  if (shipping.offerFreeShipping) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
        <Truck size={9} />Free shipping
      </span>
    );
  }
  const hasDomestic = shipping.domesticRate != null && shipping.domesticRate > 0;
  const hasInternational = shipping.internationalRate != null && shipping.internationalRate > 0;
  if (hasDomestic || hasInternational || shipping.offerLocalPickup) {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {hasDomestic && (
          <span className="flex items-center gap-1 text-[10px] text-stone-500">
            <Truck size={9} />US ${shipping.domesticRate}
          </span>
        )}
        {hasInternational && (
          <span className="flex items-center gap-1 text-[10px] text-sky-500">
            <Truck size={9} />Intl ${shipping.internationalRate}
          </span>
        )}
        {shipping.offerLocalPickup && (
          <span className="flex items-center gap-1 text-[10px] text-sky-400">
            <Truck size={9} />Pickup avail.
          </span>
        )}
      </span>
    );
  }
  return null;
}

const MEDIUMS = ["All", "Glass", "Metal", "Sculpture", "Fiber"];
const SORTS = ["Default", "Price: Low to High", "Price: High to Low"];
const SIZES = ['Any size', 'Small (<12")', 'Medium (12–24")', 'Large (24–48")', 'Monumental (48"+)'] as const;
type SizeLabel = (typeof SIZES)[number];

const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under $1K",  min: 0,     max: 999 },
  { label: "$1K–$5K",   min: 1000,  max: 4999 },
  { label: "$5K–$25K",  min: 5000,  max: 24999 },
  { label: "$25K+",     min: 25000, max: Infinity },
] as const;

interface ApiListing {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  title: string;
  description: string | null;
  medium: string | null;
  technique: string | null;
  dimensions: string | null;
  year: number | null;
  edition: string | null;
  imageUrl: string | null;
  price: number;
  isSold: boolean;
  isAvailable: boolean;
  isWishlisted: boolean;
  wishlistCount: number;
  tags: string[];
  sharedPlatforms?: string[];
  isResale?: boolean;
}

const PLATFORM_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  instagram: { label: "IG", bg: "bg-purple-500/20", text: "text-purple-400" },
  tiktok: { label: "TT", bg: "bg-stone-700/60", text: "text-stone-300" },
  facebook: { label: "FB", bg: "bg-blue-600/20", text: "text-blue-400" },
};

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function maxDim(dims: string): number {
  const nums = [...dims.matchAll(/[\d.]+/g)].map(m => parseFloat(m[0]));
  return Math.max(...nums, 0);
}
function matchSize(listing: ApiListing, s: SizeLabel): boolean {
  if (s === 'Any size') return true;
  if (!listing.dimensions) return false;
  const m = maxDim(listing.dimensions);
  if (s === 'Small (<12")') return m < 12;
  if (s === 'Medium (12–24")') return m >= 12 && m < 24;
  if (s === 'Large (24–48")') return m >= 24 && m < 48;
  if (s === 'Monumental (48"+)') return m >= 48;
  return true;
}
function matchMedium(listing: ApiListing, filter: string): boolean {
  if (filter === "All") return true;
  const m = (listing.medium ?? "").toLowerCase();
  if (filter === "Glass") return m.includes("glass");
  if (filter === "Metal") return m.includes("steel") || m.includes("metal") || m.includes("forged");
  if (filter === "Sculpture") return m.includes("cast") || m.includes("sculpt");
  if (filter === "Fiber") return m.includes("filet") || m.includes("thread") || m.includes("fiber");
  return true;
}

export default function Shop() {
  useEffect(() => { markFeatureVisited("shop"); }, []);
  const [medium, setMedium] = useState("All");
  const [sort, setSort] = useState("Default");
  const [showSold, setShowSold] = useState(false);
  const [priceRangeIdx, setPriceRangeIdx] = useState(0);
  const [size, setSize] = useState<SizeLabel>('Any size');
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  const [shippingMap, setShippingMap] = useState<Record<string, ArtistShipping>>({});
  const { addItem, isInCart } = useCart();

  useEffect(() => {
    setLoading(true);
    fetch("/api/listings", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const loaded: ApiListing[] = data.listings ?? [];
        setListings(loaded);
        setWishlisted(new Set(loaded.filter((l) => l.isWishlisted).map((l) => l.id)));
        const artistIds = [...new Set(loaded.map((l) => l.artistId))];
        Promise.all(
          artistIds.map(id =>
            fetch(`/api/artists/${id}/shipping`)
              .then(r => r.ok ? r.json() : null)
              .then(s => s ? ({ id, s }) : null)
              .catch(() => null)
          )
        ).then(results => {
          const map: Record<string, ArtistShipping> = {};
          for (const r of results) { if (r) map[r.id] = r.s; }
          setShippingMap(map);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleWishlist = (id: string) => {
    fetch(`/api/listings/${id}/wishlist`, { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setWishlisted(prev => {
          const next = new Set(prev);
          data.wishlisted ? next.add(id) : next.delete(id);
          return next;
        });
      })
      .catch(() => {});
  };

  const priceRange = PRICE_RANGES[priceRangeIdx]!;
  let filtered = listings.filter(l =>
    matchMedium(l, medium) &&
    matchSize(l, size) &&
    (showSold || !l.isSold) &&
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
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Kiln · Marketplace</p>
          <h1 className="font-serif text-3xl font-normal text-foreground mb-1">Available Works</h1>
          <p className="text-sm text-muted-foreground">Acquire museum-quality work directly from the artists.</p>
        </div>

        <div className="mb-8 pb-6 border-b border-border/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              {MEDIUMS.map(m => (
                <button key={m} onClick={() => setMedium(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${medium === m ? "text-background font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                  style={medium === m ? { background: "hsl(28 68% 52%)" } : {}}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSold(v => !v)}
                className={`text-[11px] transition-colors px-3 py-1.5 rounded-full border ${showSold ? "border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {showSold ? "Hiding sold" : "Show sold"}
              </button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <SlidersHorizontal size={13} />
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="bg-transparent text-xs text-muted-foreground focus:outline-none cursor-pointer hover:text-foreground transition-colors">
                  {SORTS.map(s => <option key={s} value={s} style={{ background: "hsl(20 8% 12%)" }}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Price:</span>
            {PRICE_RANGES.map((r, i) => (
              <button key={r.label} onClick={() => setPriceRangeIdx(i)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${priceRangeIdx === i ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">Size:</span>
            {SIZES.map(s => (
              <button key={s} onClick={() => setSize(s)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${size === s ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((listing, i) => (
              <motion.div key={listing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={`group bg-card rounded-lg overflow-hidden border border-card-border hover:border-primary/30 transition-all duration-300 ${listing.isSold ? "opacity-60" : ""}`}>
                <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer">
                  <Link href={`/listings/${listing.id}`}>
                    {listing.imageUrl && (
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const seed = encodeURIComponent(listing.artistName + listing.id);
                          img.src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=450&fit=crop&seed=${seed}`;
                          img.onerror = () => {
                            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='450'%3E%3Crect width='600' height='450' fill='%23292421'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23665544' font-size='14' font-family='system-ui'%3EWork%3C/text%3E%3C/svg%3E";
                          };
                        }}
                      />
                    )}
                    {!listing.imageUrl && (
                      <div className="w-full h-full bg-stone-900 flex items-center justify-center border border-white/5">
                        <span className="text-stone-500 text-xs font-medium">No image</span>
                      </div>
                    )}
                    {listing.isSold && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-black/60 text-white/70 text-[10px] uppercase tracking-wider">Sold</span>
                      </div>
                    )}
                    {listing.isResale && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-stone-950 text-[9px] font-bold uppercase tracking-wider">
                        Resale
                      </div>
                    )}
                  </Link>
                  <button onClick={() => toggleWishlist(listing.id)}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70">
                    <Heart size={13} className={wishlisted.has(listing.id) ? "fill-rose-400 text-rose-400" : "text-white/70"} />
                  </button>
                </div>
                <div className="p-4">
                  <Link href={`/listings/${listing.id}`}>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-1 hover:opacity-80 transition-opacity">{listing.artistName}</p>
                  </Link>
                  <Link href={`/listings/${listing.id}`}>
                    <p className="text-sm font-medium text-foreground leading-tight mb-1 hover:opacity-80 transition-opacity cursor-pointer">{listing.title}</p>
                  </Link>
                  {listing.year && <p className="text-[11px] text-muted-foreground mb-1">{listing.year} · {(listing.medium ?? "").split(",")[0]}</p>}
                  {listing.dimensions && <p className="text-[10px] text-muted-foreground mb-1">{listing.dimensions}</p>}
                  {listing.edition && <p className="text-[10px] text-amber-400/70 font-medium mb-1">Ed. {listing.edition}</p>}
                  {(listing.sharedPlatforms?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1 mb-2.5">
                      {listing.sharedPlatforms!.map((p) => {
                        const b = PLATFORM_BADGE[p];
                        return b ? (
                          <span key={p} className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${b.bg} ${b.text}`}>{b.label}</span>
                        ) : null;
                      })}
                      <span className="text-[9px] text-stone-600">shared</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-semibold text-foreground">{formatPrice(listing.price)}</span>
                      <div className="mt-0.5">
                        <ShippingBadge shipping={shippingMap[listing.artistId]} />
                      </div>
                    </div>
                    {!listing.isSold ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => addItem({ id: listing.id, title: listing.title, price: listing.price, imageUrl: listing.imageUrl ?? "", artistId: listing.artistId, available: true } as any)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-all"
                          style={isInCart(listing.id) ? { borderColor: "hsl(142 70% 45% / 0.4)", color: "hsl(142 70% 60%)", background: "hsl(142 70% 45% / 0.1)" } : { borderColor: "hsl(28 68% 52% / 0.4)", color: "hsl(28 68% 62%)", background: "transparent" }}>
                          {isInCart(listing.id) ? <Check size={9} /> : <Plus size={9} />}
                          {isInCart(listing.id) ? "In cart" : "Add"}
                        </button>
                        <Link href={`/shop/checkout/${listing.id}`}>
                          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all"
                            style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}>
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
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-muted-foreground text-sm">
              {listings.length === 0 ? "No works listed yet. Artists can add works from their profile." : "No works match the current filters."}
            </p>
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
