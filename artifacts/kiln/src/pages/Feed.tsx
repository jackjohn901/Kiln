import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Bookmark, Share2, Volume2, VolumeX, Flame,
  Plus, Home, Users, ShoppingBag, User, Search,
} from "lucide-react";
import { artists } from "@/data/artists";
import { getPosts } from "@/data/posts";
import { useProfile } from "@/contexts/ProfileContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function craftScore(id: string) {
  return 78 + (hash(id) % 20);
}

function statVal(seed: string, min: number, max: number) {
  return min + (hash(seed) % (max - min));
}

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

function getTechnique(medium: string): string {
  const m = medium.toLowerCase();
  if (m.includes("blown") || m.includes("blow")) return "Glass Blowing";
  if (m.includes("flamework")) return "Flameworking";
  if (m.includes("cast")) return "Glass Casting";
  if (m.includes("fused") || m.includes("kiln")) return "Kiln Forming";
  if (m.includes("metal") || m.includes("steel") || m.includes("forge") || m.includes("weld")) return "Metal Forging";
  if (m.includes("sculpt") || m.includes("carv")) return "Sculpture";
  if (m.includes("fiber") || m.includes("thread") || m.includes("stitch")) return "Fiber Arts";
  if (m.includes("ceramic") || m.includes("clay") || m.includes("pottery")) return "Ceramics";
  if (m.includes("paint")) return "Painting";
  if (m.includes("glass")) return "Studio Glass";
  return "Studio Craft";
}

const TECHNIQUE_COLORS: Record<string, string> = {
  "Glass Blowing": "bg-orange-500",
  "Flameworking": "bg-red-500",
  "Glass Casting": "bg-amber-500",
  "Kiln Forming": "bg-yellow-500",
  "Metal Forging": "bg-slate-400",
  "Sculpture": "bg-stone-400",
  "Fiber Arts": "bg-purple-500",
  "Ceramics": "bg-orange-400",
  "Painting": "bg-blue-500",
  "Studio Glass": "bg-teal-500",
  "Studio Craft": "bg-amber-500",
};

// ─── Reel type ────────────────────────────────────────────────────────────────

interface Reel {
  id: string;
  videoId: string;
  artistId: string;
  artistName: string;
  technique: string;
  medium: string;
  location: string;
  caption: string;
  craftScore: number;
  likes: number;
  saves: number;
  thumbnail: string;
  avatarUrl: string;
}

// ─── Build reels data ─────────────────────────────────────────────────────────

function buildReels(): Reel[] {
  // Collect all process videos
  const raw = artists.flatMap((a) =>
    a.videos.map((v) => ({
      id: `${a.id}-${v.id}`,
      videoId: v.id,
      artistId: a.id,
      artistName: a.name,
      technique: getTechnique(a.medium),
      medium: a.medium,
      location: a.location,
      caption: v.title,
      craftScore: craftScore(a.id),
      likes: statVal(a.id + v.id, 800, 18000),
      saves: statVal(a.id + v.id + "s", 200, 4500),
      thumbnail: `https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`,
      avatarUrl: a.images[0]?.url ?? "",
    }))
  );

  // Interleave artists so you don't see the same artist back-to-back
  const byArtist = new Map<string, Reel[]>();
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

const REELS = buildReels();

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

function BottomTab() {
  const [location] = useLocation();
  const { profile } = useProfile();

  const tabs = [
    { href: "/", icon: Home, label: "Discover" },
    { href: "/artists", icon: Users, label: "Artists" },
    { href: "/create", icon: null, label: "" },
    { href: "/shop", icon: ShoppingBag, label: "Shop" },
    { href: profile ? `/artists/${profile.id}` : "/setup", icon: User, label: "Profile" },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 bg-black/80 backdrop-blur-xl px-1 pb-5 pt-2">
      {tabs.map(({ href, icon: Icon, label }, i) => {
        if (i === 2) {
          return (
            <Link key={href} href={href} className="flex flex-col items-center">
              <div className="flex h-9 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                <Plus size={20} className="text-stone-950 font-bold" />
              </div>
            </Link>
          );
        }
        const isActive = href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-w-[44px]">
            {Icon && (
              <Icon size={22} className={isActive ? "text-amber-400" : "text-stone-500"} />
            )}
            <span className={`text-[9px] font-medium ${isActive ? "text-amber-400" : "text-stone-600"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Single Reel Card ─────────────────────────────────────────────────────────

function ReelCard({
  reel,
  isActive,
  muted,
  onToggleMute,
}: {
  reel: Reel;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const techniqueColor = TECHNIQUE_COLORS[reel.technique] ?? "bg-amber-500";

  return (
    <div className="relative h-[100svh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {/* Thumbnail (always present as fallback/preload) */}
      <img
        src={reel.thumbnail}
        alt={reel.caption}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />

      {/* YouTube iframe — only mount for active reel to auto-play */}
      {isActive && (
        <iframe
          key={`${reel.videoId}-${muted ? "m" : "u"}`}
          src={`https://www.youtube.com/embed/${reel.videoId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`}
          style={{
            position: "absolute",
            width: "177.78vh",
            minWidth: "100%",
            height: "100svh",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            border: "none",
          }}
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
        />
      )}

      {/* Gradient overlays for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/35" />

      {/* ── Bottom-left: artist info ─── */}
      <div className="absolute bottom-24 left-4 right-20 z-10 space-y-1.5">
        {/* Technique badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full ${techniqueColor} px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg`}>
            🔥 {reel.technique}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
            <Flame size={9} className="text-amber-400" />
            <span className="text-[9px] font-bold text-amber-300">{reel.craftScore}</span>
          </span>
        </div>

        {/* Artist name */}
        <Link href={`/artists/${reel.artistId}`}>
          <h2 className="font-serif text-2xl font-bold leading-tight text-white drop-shadow-lg hover:text-amber-200 transition-colors">
            {reel.artistName}
          </h2>
        </Link>

        {/* Location */}
        <p className="text-xs text-stone-400 drop-shadow">
          @{reel.artistId} · {reel.location}
        </p>

        {/* Caption */}
        <p className="line-clamp-2 text-sm text-stone-200 leading-snug drop-shadow max-w-[78vw]">
          {reel.caption}
        </p>
      </div>

      {/* ── Right side: actions ─── */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-5">
        {/* Avatar + follow */}
        <Link href={`/artists/${reel.artistId}`} className="relative">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-stone-800 shadow-xl">
            {reel.avatarUrl && (
              <img src={reel.avatarUrl} alt={reel.artistName} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-amber-500 shadow-md">
            <Plus size={11} className="text-stone-950" strokeWidth={3} />
          </div>
        </Link>

        {/* Like */}
        <button
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1"
          aria-label="Like"
        >
          <Heart
            size={28}
            fill={liked ? "#ef4444" : "none"}
            className={liked ? "text-red-500 scale-110" : "text-white"}
            style={{ transition: "all 0.15s" }}
          />
          <span className="text-[11px] font-bold text-white drop-shadow">
            {fmt(reel.likes + (liked ? 1 : 0))}
          </span>
        </button>

        {/* Save */}
        <button
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center gap-1"
          aria-label="Save"
        >
          <Bookmark
            size={26}
            fill={saved ? "#f59e0b" : "none"}
            className={saved ? "text-amber-400" : "text-white"}
            style={{ transition: "all 0.15s" }}
          />
          <span className="text-[11px] font-bold text-white drop-shadow">
            {fmt(reel.saves + (saved ? 1 : 0))}
          </span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1" aria-label="Share">
          <Share2 size={24} className="text-white" />
          <span className="text-[11px] font-bold text-white drop-shadow">Share</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleMute}
          className="flex flex-col items-center gap-1"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX size={22} className="text-white/70" />
          ) : (
            <Volume2 size={22} className="text-amber-400" />
          )}
        </button>
      </div>

      {/* Scroll indicator on first reel */}
      <AnimatePresence>
        {reel === REELS[0] && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: [1, 0.4, 1], y: [0, 6, 0] }}
            transition={{ repeat: 3, duration: 1.2, delay: 2 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-[88px] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-stone-500"
          >
            <span className="text-[10px]">Scroll for more</span>
            <div className="h-5 w-0.5 rounded-full bg-stone-600" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export default function Feed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const activeReel = REELS[activeIndex];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setActiveIndex(Math.max(0, Math.min(idx, REELS.length - 1)));
        ticking = false;
      });
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative h-[100svh] overflow-hidden bg-black">
      {/* ── Fixed top bar ── */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 h-40 bg-gradient-to-b from-black via-black/80 to-transparent" />
      <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 pt-3">
        {/* Kiln wordmark */}
        <Link href="/" className="flex items-center gap-1.5 pointer-events-auto">
          <Flame size={18} className="text-amber-400" />
          <span className="font-serif text-xl font-bold text-white tracking-tight">Kiln</span>
        </Link>

        {/* For You / Following */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button className="text-sm font-bold text-white border-b-2 border-amber-400 pb-0.5">
            For You
          </button>
          <button className="text-sm font-medium text-white/50">
            Following
          </button>
        </div>

        {/* Search */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm pointer-events-auto">
          <Search size={16} />
        </button>
      </div>

      {/* ── Reel scroll container ── */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {REELS.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            isActive={i === activeIndex}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ))}
      </div>

      {/* ── Bottom tab bar ── */}
      <BottomTab />
    </div>
  );
}
