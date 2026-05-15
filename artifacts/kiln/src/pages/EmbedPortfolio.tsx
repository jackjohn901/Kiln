import { useState } from "react";
import { useParams } from "wouter";
import { Flame, ExternalLink, Heart, Grid, Film } from "lucide-react";
import { getArtistById, artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { getPosts } from "@/data/posts";
import { ALL_REELS } from "@/data/reels";

const ALL_ARTISTS = [...artists, ...seedArtists];

function findArtist(id: string) {
  return getArtistById(id) ?? ALL_ARTISTS.find((a) => a.id === id);
}

interface GridItem {
  id: string;
  thumbnailUrl: string;
  caption: string;
  type: "image" | "video" | "reel";
  likes: number;
}

function buildGrid(artistId: string): GridItem[] {
  const posts = getPosts().filter((p) => p.artistId === artistId);
  const reels = ALL_REELS.filter((r) => r.artistId === artistId);

  const postItems: GridItem[] = posts.map((p) => ({
    id: p.id,
    thumbnailUrl: p.mediaUrl,
    caption: p.caption,
    type: p.type,
    likes: p.likes,
  }));

  const reelItems: GridItem[] = reels.map((r) => ({
    id: r.id,
    thumbnailUrl: r.thumbnail,
    caption: r.caption,
    type: "reel",
    likes: r.likes,
  }));

  return [...postItems, ...reelItems].slice(0, 30);
}

function GridThumbnail({ item }: { item: GridItem }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative aspect-square overflow-hidden bg-stone-900 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={item.thumbnailUrl}
        alt={item.caption}
        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/400/400`; }}
      />
      {item.type !== "image" && (
        <div className="absolute top-1.5 right-1.5">
          <Film size={12} className="text-white drop-shadow" />
        </div>
      )}
      {hovered && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="flex items-center gap-1 text-white font-bold text-sm">
            <Heart size={14} fill="white" />
            <span>{item.likes >= 1000 ? (item.likes / 1000).toFixed(1) + "k" : item.likes}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmbedPortfolio() {
  const { artistId } = useParams<{ artistId: string }>();
  const artist = findArtist(artistId ?? "");
  const grid = buildGrid(artistId ?? "");
  const [tab, setTab] = useState<"grid" | "reels">("grid");

  const gridItems = tab === "grid" ? grid : grid.filter((g) => g.type !== "image");
  const baseUrl = window.location.origin + import.meta.env.BASE_URL;

  if (!artist) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#12100e] text-stone-500 text-sm">
        Artist not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] font-sans">
      {/* Minimal top bar */}
      <div className="border-b border-white/8 bg-[#12100e]/90 backdrop-blur-md px-4 py-3 flex items-center gap-2">
        <Flame size={14} className="text-amber-400" />
        <span className="text-xs font-bold text-amber-400">Kiln</span>
        <span className="text-stone-700">·</span>
        <span className="text-xs text-stone-500">Portfolio</span>
        <div className="flex-1" />
        <a
          href={`${baseUrl}artists/${artistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-stone-950 hover:bg-amber-400 transition-colors"
        >
          <ExternalLink size={9} /> Follow on Kiln
        </a>
      </div>

      {/* Artist header */}
      <div className="px-4 py-5 flex items-center gap-4 border-b border-white/8">
        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-amber-500/30 bg-stone-800 shrink-0">
          <img
            src={artist.images?.[0]?.url ?? `https://picsum.photos/seed/${artistId}/150/150`}
            alt={artist.name}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artistId}/150/150`; }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl font-bold text-amber-100 truncate">{artist.name}</h1>
          <p className="text-xs text-stone-400 mt-0.5">{artist.medium}</p>
          <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-1">
            📍 {artist.location}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-amber-100">{grid.length}</p>
          <p className="text-[10px] text-stone-600">Works</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-white/8">
        <button
          onClick={() => setTab("grid")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${tab === "grid" ? "border-b-2 border-amber-400 text-amber-400" : "text-stone-600 hover:text-stone-400"}`}
        >
          <Grid size={12} /> All Works
        </button>
        <button
          onClick={() => setTab("reels")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${tab === "reels" ? "border-b-2 border-amber-400 text-amber-400" : "text-stone-600 hover:text-stone-400"}`}
        >
          <Film size={12} /> Videos
        </button>
      </div>

      {/* Grid */}
      {gridItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <p className="text-stone-600 text-sm">No works yet</p>
          <a
            href={`${baseUrl}artists/${artistId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <ExternalLink size={11} /> View profile on Kiln
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {gridItems.map((item) => <GridThumbnail key={item.id} item={item} />)}
        </div>
      )}

      {/* Footer CTA */}
      <div className="border-t border-white/8 px-4 py-4 text-center">
        <a
          href={`${baseUrl}artists/${artistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-5 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          <Flame size={11} /> View full profile on Kiln
        </a>
        <p className="mt-2 text-[10px] text-stone-700">Powered by Kiln — Creator Platform for Craft Artists</p>
      </div>
    </div>
  );
}
