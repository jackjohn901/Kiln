import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Heart, Bookmark, Eye, Flame, ChevronRight, Play } from "lucide-react";
import Nav from "@/components/Nav";
import { artists, Artist, getYoutubeThumbnail, getAllImages } from "@/data/artists";

const MEDIUMS = ["All", "Glass", "Metal", "Sculpture", "Fiber"];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function getCraftScore(artist: Artist): number {
  return 78 + (hash(artist.id) % 20);
}

function getStats(artist: Artist) {
  const h = hash(artist.id);
  const views = 12000 + (h % 88000);
  const likes = Math.floor(views * 0.07 + (h % 400));
  const saves = Math.floor(views * 0.04 + (h % 200));
  return { views, likes, saves };
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function matchMedium(artist: Artist, filter: string): boolean {
  if (filter === "All") return true;
  const m = artist.medium.toLowerCase();
  if (filter === "Glass") return m.includes("glass");
  if (filter === "Metal") return m.includes("metal") || m.includes("steel") || m.includes("forged");
  if (filter === "Sculpture") return m.includes("sculpt") || m.includes("cast") || m.includes("form");
  if (filter === "Fiber") return m.includes("thread") || m.includes("fiber") || m.includes("filet");
  return true;
}

interface FeedCardProps {
  artist: Artist;
  imageUrl: string;
  caption: string;
  index: number;
}

function FeedCard({ artist, imageUrl, caption, index }: FeedCardProps) {
  const score = getCraftScore(artist);
  const stats = getStats(artist);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <motion.div
      data-testid={`feed-card-${artist.id}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="group relative bg-card rounded-lg overflow-hidden border border-card-border hover:border-primary/30 transition-all duration-300"
    >
      <Link href={`/artists/${artist.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden cursor-pointer">
          <img
            src={imageUrl}
            alt={caption}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute top-3 right-3">
            <div
              data-testid={`craft-score-${artist.id}`}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
              style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}
            >
              <Flame size={10} />
              {score}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">
              {artist.nationality} · {artist.medium.split(" &")[0].split(",")[0]}
            </p>
            <p className="text-sm font-medium text-white leading-tight">{artist.name}</p>
          </div>

          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Play size={12} fill="white" className="text-white ml-0.5" />
            </div>
          </div>
        </div>
      </Link>

      <div className="px-3 py-2.5 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Eye size={11} />
          {formatNum(stats.views)}
        </p>
        <div className="flex items-center gap-2">
          <button
            data-testid={`like-btn-${artist.id}`}
            onClick={() => setLiked((v) => !v)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${liked ? "text-red-400" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Heart size={12} fill={liked ? "currentColor" : "none"} />
            {formatNum(stats.likes + (liked ? 1 : 0))}
          </button>
          <button
            data-testid={`save-btn-${artist.id}`}
            onClick={() => setSaved((v) => !v)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${saved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Bookmark size={12} fill={saved ? "currentColor" : "none"} />
            {formatNum(stats.saves + (saved ? 1 : 0))}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Feed() {
  const [filter, setFilter] = useState("All");
  const [heroIndex, setHeroIndex] = useState(0);

  const featuredArtist = artists[heroIndex % artists.length];
  const heroImage = getAllImages(featuredArtist)[0];

  useEffect(() => {
    const t = setInterval(() => setHeroIndex((i) => i + 1), 8000);
    return () => clearInterval(t);
  }, []);

  const filtered = artists.filter((a) => matchMedium(a, filter));

  const feedItems: Array<{ artist: Artist; imageUrl: string; caption: string }> = [];
  for (const artist of artists) {
    const images = getAllImages(artist);
    const picks = images.slice(0, 2);
    for (const img of picks) {
      feedItems.push({ artist, imageUrl: img.url, caption: img.caption });
    }
  }

  const filteredFeed = feedItems.filter((item) => matchMedium(item.artist, filter));

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <AnimatePresence mode="wait">
        <motion.section
          key={heroIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="relative h-[55vh] overflow-hidden"
          data-testid="hero-section"
        >
          {heroImage && (
            <img
              src={heroImage.url}
              alt={featuredArtist.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />

          <div className="absolute bottom-0 left-0 p-8 max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-3">
              Featured Artist
            </p>
            <h1 className="font-serif text-4xl font-normal text-white mb-3 leading-tight">
              {featuredArtist.name}
            </h1>
            {featuredArtist.quote && (
              <p className="text-sm text-white/65 italic font-light leading-relaxed mb-4 line-clamp-2">
                "{featuredArtist.quote}"
              </p>
            )}
            <Link href={`/artists/${featuredArtist.id}`} data-testid="hero-explore-btn">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer"
                style={{ background: "hsl(28 68% 52%)", color: "hsl(20 8% 9%)" }}>
                Explore Artist <ChevronRight size={13} />
              </span>
            </Link>
          </div>

          <div className="absolute bottom-4 right-6 flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "hsl(28 68% 52% / 0.2)", border: "1px solid hsl(28 68% 52% / 0.4)", color: "hsl(28 68% 62%)" }}
            >
              <Flame size={11} />
              Craft Score {getCraftScore(featuredArtist)}
            </div>
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1" data-testid="medium-filters">
            {MEDIUMS.map((m) => (
              <button
                key={m}
                data-testid={`filter-${m.toLowerCase()}`}
                onClick={() => setFilter(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === m
                    ? "text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
                style={filter === m ? { background: "hsl(28 68% 52%)" } : {}}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{filteredFeed.length} works</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFeed.map((item, i) => (
            <FeedCard
              key={`${item.artist.id}-${i}`}
              artist={item.artist}
              imageUrl={item.imageUrl}
              caption={item.caption}
              index={i}
            />
          ))}
        </div>

        {filteredFeed.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-muted-foreground text-sm">No works found for this medium.</p>
          </div>
        )}
      </div>
    </div>
  );
}
