import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Bookmark, Play, Heart, ShoppingBag } from "lucide-react";
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

type Tab = "reels" | "works";

export default function Saved() {
  const { reelSaves, toggleReelSave } = useSocial();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [tab, setTab] = useState<Tab>("reels");

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

  const allArtists = [...artists, ...seedArtists];
  function getArtistName(artistId: string) {
    return allArtists.find((a) => a.id === artistId)?.name ?? artistId;
  }

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
              {savedReels.length} {savedReels.length === 1 ? "reel" : "reels"} · {wishlistedListings.length} {wishlistedListings.length === 1 ? "work" : "works"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-stone-900 p-1 mb-6 w-fit">
          {([["reels", "Reels"], ["works", "Works"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-stone-700 text-amber-100" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Reels tab */}
        {tab === "reels" && (
          savedReels.length === 0 ? (
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
      </div>
    </div>
  );
}
