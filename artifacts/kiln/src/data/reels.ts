import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { musicTracks } from "@/data/music";

export interface Reel {
  id: string;
  videoId: string;
  videoUrl?: string;
  muxPlaybackId?: string;
  artistId: string;
  artistName: string;
  technique: string;
  location: string;
  caption: string;
  tags?: string[];
  craftScore: number;
  likes: number;
  saves: number;
  thumbnail: string;
  avatarUrl: string;
  musicTrackId: string;
  available: boolean;
  patronOnly?: boolean;
  collabArtistName?: string;
  streak?: number;
  artistLevel?: "Emerging" | "Rising" | "Established" | "Master";
  beforeImageUrl?: string;
  listingIds?: string[];
}

const ARTIST_LEVELS = ["Emerging", "Rising", "Established", "Master"] as const;

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function craftScore(id: string) { return 78 + (hash(id) % 20); }
function statVal(seed: string, min: number, max: number) { return min + (hash(seed) % (max - min)); }
function isAvailable(id: string) { return hash(id) % 5 === 0; }

export function getTechnique(medium: string): string {
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
  if (m.includes("stone") || m.includes("marble") || m.includes("carv")) return "Stone Carving";
  if (m.includes("wood turn") || m.includes("lathe")) return "Wood Turning";
  if (m.includes("batik") || m.includes("resist")) return "Batik";
  if (m.includes("fiber") || m.includes("felt") || m.includes("weav") || m.includes("tapestry") || m.includes("loom")) return "Fiber Arts";
  if (m.includes("embroid") || m.includes("textile")) return "Textile";
  if (m.includes("glass")) return "Studio Glass";
  return "Studio Craft";
}

export const TECHNIQUE_COLORS: Record<string, string> = {
  "Glass Blowing": "bg-orange-500", "Flameworking": "bg-red-500", "Neon Glass": "bg-fuchsia-500",
  "Murrine": "bg-rose-500", "Glass Casting": "bg-amber-500", "Kiln Forming": "bg-yellow-600",
  "Studio Glass": "bg-teal-500", "Enamel": "bg-violet-500", "Raku": "bg-orange-700",
  "Wood-Fired": "bg-orange-800", "Porcelain": "bg-sky-400", "Ceramics": "bg-orange-400",
  "Blacksmithing": "bg-zinc-500", "Metal Forging": "bg-slate-400", "Welding": "bg-slate-500",
  "Cast Iron": "bg-zinc-700", "Bronze Casting": "bg-yellow-700", "Stone Carving": "bg-stone-500",
  "Wood Turning": "bg-lime-700", "Batik": "bg-indigo-500", "Fiber Arts": "bg-purple-500",
  "Textile": "bg-pink-500", "Studio Craft": "bg-amber-500",
};

function buildReels(): Reel[] {
  const allArtists = [...artists, ...seedArtists];
  const raw = allArtists.flatMap((a) =>
    a.videos.map((v) => ({
      id: `${a.id}-${v.id}`,
      videoId: v.id,
      artistId: a.id,
      artistName: a.name,
      technique: getTechnique(a.medium),
      location: a.location,
      caption: v.title,
      craftScore: craftScore(a.id),
      likes: statVal(a.id + v.id, 800, 28000),
      saves: statVal(a.id + v.id + "s", 200, 7500),
      thumbnail: `https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`,
      avatarUrl: a.images[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=150&h=150&fit=crop&seed=${a.id}-avatar`,
      musicTrackId: musicTracks[hash(a.id + v.id) % musicTracks.length].id,
      available: isAvailable(a.id + v.id),
      streak: statVal(a.id + "streak", 1, 120),
      artistLevel: ARTIST_LEVELS[hash(a.id) % 4],
    }))
  );
  const byArtist = new Map<string, typeof raw>();
  for (const r of raw) {
    if (!byArtist.has(r.artistId)) byArtist.set(r.artistId, []);
    byArtist.get(r.artistId)!.push(r);
  }
  const groups = Array.from(byArtist.values());
  const result: Reel[] = [];
  const maxLen = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (group[i]) result.push(group[i]);
    }
  }
  return result;
}

export const ALL_REELS = buildReels();

export function getReelById(id: string): Reel | undefined {
  return ALL_REELS.find((r) => r.id === id);
}

export function getReelsByArtist(artistId: string): Reel[] {
  return ALL_REELS.filter((r) => r.artistId === artistId);
}

export function getReelsByTechnique(technique: string): Reel[] {
  return ALL_REELS.filter((r) => r.technique === technique);
}
