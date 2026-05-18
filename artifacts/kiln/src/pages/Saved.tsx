import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark, Play, Heart, ShoppingBag, Bell, Trash2, ExternalLink } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useWishlist } from "@/hooks/useWishlist";
import { listings, formatPrice } from "@/data/listings";

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function statVal(seed: string, min: number, max: number) { return min + (hash(seed) % (max - min)); }

function getTechnique(medium: string): string {
  const m = medium.toLowerCase();
  if (m.includes("blown") || m.includes("blow")) return "Glass Blowing";
  if (m.includes("flamework") || m.includes("lampwork")) return "Flameworking";
  if (m.includes("raku")) return "Raku";
  if (m.includes("cast")) return "Glass Casting";
  if (m.includes("fused") || m.includes("kiln-formed")) return "Kiln Forming";
  if (m.includes("enamel")) return "Enamel";
  if (m.includes("blacksmith")) return "Blacksmithing";
  if (m.includes("porcelain") || m.includes("celadon")) return "Porcelain";
  if (m.includes("ceramic") || m.includes("clay") || m.includes("pottery")) return "Ceramics";
  if (m.includes("fiber") || m.includes("felt") || m.includes("weav")) return "Fiber Arts";
  if (m.includes("bronze")) return "Bronze Casting";
  if (m.includes("metal") || m.includes("steel") || m.includes("forge")) return "Metal Forging";
  return "Studio Craft";
}

interface SavedReel {
  id: string;
  videoId: string;
  artistId: string;
  artistName: string;
  technique: string;
  caption: string;
  likes: number;
  thumbnail: string;
  avatarUrl: string;
}

interface ApiPost {
  id: string; caption: string; thumbnailUrl: string | null; videoUrl: string | null;
  likeCount: number; technique: string | null; authorName: string; authorAvatarUrl: string | null;
}

interface PriceAlert {
  id?: string;
  listingId: string;
  targetPrice?: number | null;
  createdAt?: string;
}

type Tab = "reels" | "works" | "alerts";

export default function Saved() {
  const { reelSaves, toggleReelSave } = useSocial();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [tab, setTab] = useState<Tab>("reels");

  const [apiSavedPosts, setApiSavedPosts] = useState<ApiPost[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/me/saves", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { posts?: ApiPost[] } | null) => {
        if (Array.isArray(data?.posts)) setApiSavedPosts(data.posts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== "alerts" || alertsLoaded) return;
    fetch("/api/me/price-alerts", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { alerts?: PriceAlert[] } | null) => {
        setPriceAlerts(data?.alerts ?? []);
        setAlertsLoaded(true);
      })
      .catch(() => { setAlertsLoaded(true); });
  }, [tab, alertsLoaded]);

  function removeAlert(listingId: string) {
    setPriceAlerts(prev => prev.filter(a => a.listingId !== listingId));
    fetch(`/api/me/price-alerts/${listingId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }

  const savedReels = useMemo<SavedReel[]>(() => {
    const allArtists = [...artists, ...seedArtists];
    const reels: SavedReel[] = [];
    for (const a of allArtists) {
      for (const v of a.videos) {
        const id = `${a.id}-${v.id}`;
        if (reelSaves[id]) {
          reels.push({
            id,
            videoId: v.id,
            artistId: a.id,
            artistName: a.name,
            technique: getTechnique(a.medium),
            caption: v.title,
            likes: statVal(a.id + v.id, 800, 28000),
            thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
            avatarUrl: a.images[0]?.url ?? `https://picsum.photos/seed/${a.id}-avatar/80/80`,
          });
        }
      }
    }
    return reels;
  }, [reelSaves]);

  const wishlistedListings = useMemo(() => {
    return listings.filter((l) => wishlistIds.includes(l.id));
  }, [wishlistIds]);

  // Enrich price alerts with static listing data
  const enrichedAlerts = useMemo(() => {
    return priceAlerts.map(a => {
      const listing = listings.find(l => l.id === a.listingId);
      return { ...a, listing };
    });
  }, [priceAlerts]);

  const allArtists = [...artists, ...seedArtists];
  function getArtistName(artistId: string) {
    return allArtists.find((a) => a.id === artistId)?.name ?? artistId;
  }

  const TABS: [Tab, string][] = [
    ["reels", "Reels"],
    ["works", "Works"],
    ["alerts", "Alerts"],
  ];

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15">
            <Bookmark size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Saved</h1>
            <p className="text-sm text-stone-500">
              {savedReels.length + apiSavedPosts.length} {savedReels.length + apiSavedPosts.length === 1 ? "reel" : "reels"} · {wishlistedListings.length} {wishlistedListings.length === 1 ? "work" : "works"} · {priceAlerts.length} {priceAlerts.length === 1 ? "alert" : "alerts"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-stone-900 p-1 mb-6 w-fit">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-stone-700 text-amber-100" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {label}
              {t === "alerts" && priceAlerts.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-400">
                  {priceAlerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reels tab */}
        {tab === "reels" && (
          savedReels.length === 0 && apiSavedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bookmark size={40} className="mb-4 text-stone-700" />
              <p className="mb-2 text-stone-400 font-medium">Nothing saved yet</p>
              <p className="mb-6 text-sm text-stone-600">Tap the bookmark icon on any reel to save it here</p>
              <Link href="/" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Browse Feed
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {savedReels.map((r) => (
                <div key={r.id} className="group relative overflow-hidden rounded-2xl bg-stone-900">
                  <Link href={`/artists/${r.artistId}`}>
                    <div className="relative aspect-[9/16] overflow-hidden">
                      <img
                        src={r.thumbnail}
                        alt={r.caption}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <Play size={20} className="text-white fill-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <img src={r.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover border border-white/20" />
                          <span className="text-xs font-medium text-white truncate">{r.artistName}</span>
                        </div>
                        <p className="text-xs text-stone-300 line-clamp-2 leading-tight">{r.caption}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-stone-400">{r.technique}</span>
                          <div className="flex items-center gap-1">
                            <Heart size={10} className="text-rose-400" />
                            <span className="text-[10px] text-stone-400">{r.likes >= 1000 ? (r.likes / 1000).toFixed(1) + "k" : r.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleReelSave(r.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-amber-400 hover:text-stone-400 transition-colors"
                    title="Remove from saved"
                  >
                    <Bookmark size={14} className="fill-current" />
                  </button>
                </div>
              ))}
              {apiSavedPosts.map((post) => (
                <div key={`api-${post.id}`} className="group relative overflow-hidden rounded-2xl bg-stone-900">
                  <Link href={`/post/${post.id}`}>
                    <div className="relative aspect-[9/16] overflow-hidden">
                      {post.thumbnailUrl ? (
                        <img src={post.thumbnailUrl} alt={post.caption} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full bg-stone-800 flex items-center justify-center">
                          <Play size={32} className="text-stone-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <img src={post.authorAvatarUrl ?? `https://picsum.photos/seed/${post.id}/80/80`} alt="" className="h-6 w-6 rounded-full object-cover border border-white/20" />
                          <span className="text-xs font-medium text-white truncate">{post.authorName}</span>
                        </div>
                        <p className="text-xs text-stone-300 line-clamp-2 leading-tight">{post.caption}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          {post.technique && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-stone-400">{post.technique}</span>}
                          <div className="flex items-center gap-1">
                            <Heart size={10} className="text-rose-400" />
                            <span className="text-[10px] text-stone-400">{post.likeCount >= 1000 ? (post.likeCount / 1000).toFixed(1) + "k" : post.likeCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {/* Works tab — wishlisted listings */}
        {tab === "works" && (
          wishlistedListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Heart size={40} className="mb-4 text-stone-700" />
              <p className="mb-2 text-stone-400 font-medium">No works saved yet</p>
              <p className="mb-6 text-sm text-stone-600">Tap the heart on any listing in the shop to wishlist it</p>
              <Link href="/shop" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Browse Shop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {wishlistedListings.map((l) => (
                <div key={l.id} className="group relative overflow-hidden rounded-2xl bg-stone-900 border border-stone-800">
                  <Link href={`/listings/${l.id}`}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {l.imageUrl ? (
                        <img
                          src={l.imageUrl}
                          alt={l.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-stone-800 flex items-center justify-center">
                          <ShoppingBag size={24} className="text-stone-600" />
                        </div>
                      )}
                      {!l.available && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white/70 text-[10px] uppercase tracking-wider">Sold</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-xs font-medium text-white line-clamp-1">{l.title}</p>
                        <p className="text-[11px] text-stone-400">{getArtistName(l.artistId)}</p>
                        <p className="text-xs font-bold text-amber-400 mt-0.5">{formatPrice(l.price)}</p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleWishlist(l.id)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-rose-400 hover:text-stone-400 transition-colors"
                    title="Remove from wishlist"
                  >
                    <Heart size={14} className="fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Alerts tab — price alerts */}
        {tab === "alerts" && (
          !alertsLoaded ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
            </div>
          ) : enrichedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bell size={40} className="mb-4 text-stone-700" />
              <p className="mb-2 text-stone-400 font-medium">No price alerts set</p>
              <p className="mb-6 text-sm text-stone-600">On any listing, tap "Notify me" to get alerted when the price drops</p>
              <Link href="/shop" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                Browse Shop
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedAlerts.map((a) => (
                <div key={a.listingId} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
                  {/* Thumbnail */}
                  <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-stone-800">
                    {a.listing?.imageUrl ? (
                      <img src={a.listing.imageUrl} alt={a.listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingBag size={20} className="text-stone-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-200 line-clamp-1">
                      {a.listing?.title ?? a.listingId}
                    </p>
                    {a.listing && (
                      <p className="text-xs text-stone-500 mt-0.5">{getArtistName(a.listing.artistId)}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-sm font-bold text-amber-400">
                        {a.listing ? formatPrice(a.listing.price) : "—"}
                      </span>
                      {a.targetPrice != null && (
                        <span className="text-xs text-stone-500">
                          Alert at {formatPrice(a.targetPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {a.listing && (
                      <Link href={`/listings/${a.listingId}`}>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors">
                          <ExternalLink size={13} />
                        </button>
                      </Link>
                    )}
                    <button
                      onClick={() => removeAlert(a.listingId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:border-red-500/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
