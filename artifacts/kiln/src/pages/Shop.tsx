import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { SlidersHorizontal, ExternalLink } from "lucide-react";
import Nav from "@/components/Nav";
import { listings, formatPrice, Listing } from "@/data/listings";
import { artists } from "@/data/artists";

const MEDIUMS = ["All", "Glass", "Metal", "Sculpture", "Fiber"];
const SORTS = ["Default", "Price: Low to High", "Price: High to Low"];

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

  let filtered = listings.filter((l) => matchMedium(l, medium) && (showSold || l.available));

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

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50">
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
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
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
              </div>

              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-1">
                  {getArtistName(listing.artistId)}
                </p>
                <p className="text-sm font-medium text-foreground leading-tight mb-1">{listing.title}</p>
                <p className="text-[11px] text-muted-foreground mb-1">{listing.year} · {listing.medium.split(",")[0]}</p>
                <p className="text-[10px] text-muted-foreground mb-3">{listing.dimensions}</p>

                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">
                    {formatPrice(listing.price)}
                  </span>
                  {listing.available ? (
                    <Link href={`/artists/${listing.artistId}`}>
                      <button
                        data-testid={`inquire-btn-${listing.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all"
                        style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}
                      >
                        Inquire <ExternalLink size={9} />
                      </button>
                    </Link>
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
