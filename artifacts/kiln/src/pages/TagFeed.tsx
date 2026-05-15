import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { Play, Heart, Bookmark, Hash } from "lucide-react";
import Nav from "@/components/Nav";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";

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
  if (m.includes("neon")) return "Neon Glass";
  if (m.includes("murrine") || m.includes("mosaic")) return "Murrine";
  if (m.includes("cast") && m.includes("iron")) return "Cast Iron";
  if (m.includes("bronze") || m.includes("lost-wax")) return "Bronze Casting";
  if (m.includes("cast")) return "Glass Casting";
  if (m.includes("fused") || m.includes("kiln-formed")) return "Kiln Forming";
  if (m.includes("enamel")) return "Enamel";
  if (m.includes("raku")) return "Raku";
  if (m.includes("anagama") || m.includes("wood-fired")) return "Wood-Fired";
  if (m.includes("porcelain") || m.includes("celadon")) return "Porcelain";
  if (m.includes("ceramic") || m.includes("clay") || m.includes("pottery")) return "Ceramics";
  if (m.includes("blacksmith") || m.includes("ironwork")) return "Blacksmithing";
  if (m.includes("metal") || m.includes("steel") || m.includes("forge")) return "Metal Forging";
  if (m.includes("weld")) return "Welding";
  if (m.includes("fiber") || m.includes("felt") || m.includes("weav")) return "Fiber Arts";
  if (m.includes("glass")) return "Studio Glass";
  return "Studio Craft";
}

interface TagReel {
  id: string;
  videoId: string;
  artistId: string;
  artistName: string;
  technique: string;
  caption: string;
  likes: number;
  saves: number;
  thumbnail: string;
  avatarUrl: string;
}

export default function TagFeed() {
  const { tag } = useParams<{ tag: string }>();
  const { reelSaves, toggleReelSave, reelLikes, toggleReelLike } = useSocial();

  const decodedTag = decodeURIComponent(tag ?? "");

  const reels = useMemo<TagReel[]>(() => {
    const allArtists = [...artists, ...seedArtists];
    const result: TagReel[] = [];
    for (const a of allArtists) {
      const technique = getTechnique(a.medium);
      if (technique.toLowerCase() !== decodedTag.toLowerCase()) continue;
      for (const v of a.videos) {
        result.push({
          id: `${a.id}-${v.id}`,
          videoId: v.id,
          artistId: a.id,
          artistName: a.name,
          technique,
          caption: v.title,
          likes: statVal(a.id + v.id, 800, 28000),
          saves: statVal(a.id + v.id + "s", 200, 7500),
          thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
          avatarUrl: a.images[0]?.url ?? `https://picsum.photos/seed/${a.id}-avatar/80/80`,
        });
      }
    }
    return result;
  }, [decodedTag]);

  const totalLikes = reels.reduce((s, r) => s + r.likes, 0);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20">
            <Hash size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">{decodedTag}</h1>
            <p className="text-sm text-stone-500">
              {reels.length} {reels.length === 1 ? "reel" : "reels"} · {totalLikes >= 1000 ? (totalLikes / 1000).toFixed(0) + "k" : totalLikes} total likes
            </p>
          </div>
        </div>

        {reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Hash size={36} className="mb-3 text-stone-700" />
            <p className="text-stone-500">No reels tagged with "{decodedTag}"</p>
            <Link href="/discover" className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">
              Browse Discover
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reels.map((r) => {
              const saved = !!reelSaves[r.id];
              const liked = !!reelLikes[r.id];
              return (
                <div key={r.id} className="group relative overflow-hidden rounded-2xl bg-stone-900">
                  <Link href={`/artists/${r.artistId}`}>
                    <div className="relative aspect-[9/16] overflow-hidden">
                      <img
                        src={r.thumbnail}
                        alt={r.caption}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Hover play */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <Play size={20} className="text-white fill-white" />
                        </div>
                      </div>

                      {/* Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <img src={r.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover border border-white/20" />
                          <span className="text-xs font-medium text-white truncate">{r.artistName}</span>
                        </div>
                        <p className="text-xs text-stone-300 line-clamp-2 leading-tight">{r.caption}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Heart size={10} className={liked ? "text-rose-400 fill-rose-400" : "text-stone-400"} />
                            <span className="text-[10px] text-stone-400">{(r.likes + (liked ? 1 : 0) >= 1000 ? ((r.likes + (liked ? 1 : 0)) / 1000).toFixed(1) + "k" : (r.likes + (liked ? 1 : 0)))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Save */}
                  <button
                    onClick={() => toggleReelSave(r.id)}
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors ${
                      saved ? "text-amber-400" : "text-stone-400 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Bookmark size={13} className={saved ? "fill-current" : ""} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Related tags */}
        <div className="mt-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-600">Related techniques</p>
          <div className="flex flex-wrap gap-2">
            {["Glass Blowing", "Flameworking", "Raku", "Blacksmithing", "Ceramics", "Kiln Forming", "Metal Forging", "Fiber Arts", "Enamel", "Bronze Casting"]
              .filter((t) => t.toLowerCase() !== decodedTag.toLowerCase())
              .slice(0, 8)
              .map((t) => (
                <Link
                  key={t}
                  href={`/tag/${encodeURIComponent(t)}`}
                  className="rounded-full border border-stone-700 px-3 py-1.5 text-xs text-stone-500 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                >
                  # {t}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
