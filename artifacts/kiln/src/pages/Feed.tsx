import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Bookmark, Share2, Volume2, VolumeX, Flame,
  Plus, Home, Users, ShoppingBag, User, Music2, Search,
} from "lucide-react";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { musicTracks, getTrackById } from "@/data/music";
import { useProfile } from "@/contexts/ProfileContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function craftScore(id: string) { return 78 + (hash(id) % 20); }
function statVal(seed: string, min: number, max: number) { return min + (hash(seed) % (max - min)); }
function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n); }

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
  if (m.includes("figure") && m.includes("ceramic")) return "Ceramic Sculpture";
  if (m.includes("blacksmith") || m.includes("ironwork")) return "Blacksmithing";
  if (m.includes("metal") || m.includes("steel") || m.includes("forge")) return "Metal Forging";
  if (m.includes("weld")) return "Welding";
  if (m.includes("stone") || m.includes("marble") || m.includes("carv")) return "Stone Carving";
  if (m.includes("wood turn") || m.includes("lathe")) return "Wood Turning";
  if (m.includes("wood")) return "Wood";
  if (m.includes("batik") || m.includes("resist")) return "Batik";
  if (m.includes("fiber") || m.includes("felt") || m.includes("weav") || m.includes("tapestry") || m.includes("loom")) return "Fiber Arts";
  if (m.includes("embroid") || m.includes("textile")) return "Textile";
  if (m.includes("glass")) return "Studio Glass";
  return "Studio Craft";
}

const TECHNIQUE_COLORS: Record<string, string> = {
  "Glass Blowing": "bg-orange-500",
  "Flameworking": "bg-red-500",
  "Neon Glass": "bg-fuchsia-500",
  "Murrine": "bg-rose-500",
  "Glass Casting": "bg-amber-500",
  "Kiln Forming": "bg-yellow-600",
  "Studio Glass": "bg-teal-500",
  "Enamel": "bg-violet-500",
  "Raku": "bg-orange-700",
  "Wood-Fired": "bg-orange-800",
  "Porcelain": "bg-sky-400",
  "Ceramics": "bg-orange-400",
  "Ceramic Sculpture": "bg-amber-700",
  "Blacksmithing": "bg-zinc-500",
  "Metal Forging": "bg-slate-400",
  "Welding": "bg-slate-500",
  "Cast Iron": "bg-zinc-700",
  "Bronze Casting": "bg-yellow-700",
  "Stone Carving": "bg-stone-500",
  "Wood Turning": "bg-lime-700",
  "Wood": "bg-green-800",
  "Batik": "bg-indigo-500",
  "Fiber Arts": "bg-purple-500",
  "Textile": "bg-pink-500",
  "Studio Craft": "bg-amber-500",
};

// ─── Reel type ────────────────────────────────────────────────────────────────

interface Reel {
  id: string;
  videoId: string;
  artistId: string;
  artistName: string;
  technique: string;
  location: string;
  caption: string;
  craftScore: number;
  likes: number;
  saves: number;
  thumbnail: string;
  avatarUrl: string;
  musicTrackId: string;
}

// ─── Build reel list ──────────────────────────────────────────────────────────

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
      avatarUrl: a.images[0]?.url ?? `https://picsum.photos/seed/${a.id}-avatar/150/150`,
      musicTrackId: musicTracks[hash(a.id + v.id) % musicTracks.length].id,
    }))
  );

  // Interleave artists for variety
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
                <Plus size={20} className="font-bold text-stone-950" />
              </div>
            </Link>
          );
        }
        const isActive = href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link key={href} href={href} className="flex min-w-[44px] flex-col items-center gap-0.5">
            {Icon && <Icon size={22} className={isActive ? "text-amber-400" : "text-stone-500"} />}
            <span className={`text-[9px] font-medium ${isActive ? "text-amber-400" : "text-stone-600"}`}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Spinning music disc (TikTok-style) ───────────────────────────────────────

function MusicDisc({ trackId, spinning }: { trackId: string; spinning: boolean }) {
  const track = getTrackById(trackId);
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={spinning ? { rotate: 360 } : {}}
        transition={spinning ? { repeat: Infinity, duration: 4, ease: "linear" } : {}}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-stone-500 bg-stone-900"
      >
        <Music2 size={12} className="text-amber-400" />
      </motion.div>
      {track && (
        <div className="overflow-hidden">
          <motion.p
            animate={spinning ? { x: ["0%", "-100%"] } : { x: "0%" }}
            transition={spinning ? { repeat: Infinity, duration: 8, ease: "linear" } : {}}
            className="whitespace-nowrap text-[11px] text-stone-300"
          >
            {track.title} — {track.artist}
          </motion.p>
        </div>
      )}
    </div>
  );
}

// ─── Reel Card ────────────────────────────────────────────────────────────────

function ReelCard({
  reel,
  isActive,
  musicMuted,
  onToggleMusic,
}: {
  reel: Reel;
  isActive: boolean;
  musicMuted: boolean;
  onToggleMusic: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const color = TECHNIQUE_COLORS[reel.technique] ?? "bg-amber-500";

  return (
    <div className="relative h-[100svh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {/* Thumbnail — always present */}
      <img
        src={reel.thumbnail}
        alt={reel.caption}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${reel.id}/800/1200`;
        }}
      />

      {/* YouTube iframe — only for active reel */}
      {isActive && (
        <iframe
          key={reel.videoId}
          src={`https://www.youtube.com/embed/${reel.videoId}?autoplay=1&mute=1&controls=0&loop=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&playlist=${reel.videoId}`}
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
        />
      )}

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/40" />

      {/* ── Bottom-left: artist info ── */}
      <div className="absolute bottom-[88px] left-4 right-20 z-10 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full ${color} px-2.5 py-0.5 text-[10px] font-bold text-white shadow`}>
            🔥 {reel.technique}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
            <Flame size={9} className="text-amber-400" />
            <span className="text-[9px] font-bold text-amber-300">{reel.craftScore}</span>
          </span>
        </div>

        <Link href={`/artists/${reel.artistId}`}>
          <h2 className="font-serif text-[22px] font-bold leading-tight text-white drop-shadow-lg hover:text-amber-200 transition-colors">
            {reel.artistName}
          </h2>
        </Link>

        <p className="text-[11px] text-stone-400 drop-shadow">
          @{reel.artistId} · {reel.location.split(",")[0]}
        </p>

        <p className="line-clamp-2 max-w-[78vw] text-sm leading-snug text-stone-200 drop-shadow">
          {reel.caption}
        </p>

        {/* Music disc */}
        <div className="pt-1">
          <MusicDisc trackId={reel.musicTrackId} spinning={isActive && !musicMuted} />
        </div>
      </div>

      {/* ── Right side actions ── */}
      <div className="absolute bottom-[88px] right-3 z-10 flex flex-col items-center gap-5">
        {/* Avatar */}
        <Link href={`/artists/${reel.artistId}`} className="relative">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-stone-800 shadow-xl">
            <img
              src={reel.avatarUrl}
              alt={reel.artistName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${reel.artistId}/150/150`;
              }}
            />
          </div>
          <div className="absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-amber-500 shadow-md">
            <Plus size={11} className="text-stone-950" strokeWidth={3} />
          </div>
        </Link>

        {/* Like */}
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-1">
          <Heart size={28} fill={liked ? "#ef4444" : "none"} className={liked ? "text-red-500" : "text-white"} style={{ transition: "all 0.15s" }} />
          <span className="text-[11px] font-bold text-white drop-shadow">{fmt(reel.likes + (liked ? 1 : 0))}</span>
        </button>

        {/* Save */}
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-1">
          <Bookmark size={26} fill={saved ? "#f59e0b" : "none"} className={saved ? "text-amber-400" : "text-white"} style={{ transition: "all 0.15s" }} />
          <span className="text-[11px] font-bold text-white drop-shadow">{fmt(reel.saves + (saved ? 1 : 0))}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <Share2 size={24} className="text-white" />
          <span className="text-[11px] font-bold text-white drop-shadow">Share</span>
        </button>

        {/* Music toggle */}
        <button onClick={onToggleMusic} className="flex flex-col items-center gap-1">
          {musicMuted ? (
            <VolumeX size={22} className="text-white/60" />
          ) : (
            <Volume2 size={22} className="text-amber-400" />
          )}
          <span className="text-[9px] text-white/60">{musicMuted ? "Music off" : "Music on"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export default function Feed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicUnlocked, setMusicUnlocked] = useState(false);

  // Scroll detection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setActiveIndex(Math.max(0, Math.min(idx, REELS.length - 1)));
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Music: switch track when active reel changes
  useEffect(() => {
    const reel = REELS[activeIndex];
    if (!reel || !musicUnlocked) return;
    const track = getTrackById(reel.musicTrackId);
    if (!track) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(track.url);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.65;
    } else {
      audioRef.current.pause();
      audioRef.current.src = track.url;
      audioRef.current.load();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.65;
    }

    if (!musicMuted) {
      audioRef.current.play().catch(() => {});
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [activeIndex, musicUnlocked]);

  // Music mute toggle
  useEffect(() => {
    if (!audioRef.current || !musicUnlocked) return;
    if (musicMuted) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [musicMuted, musicUnlocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const unlockMusic = useCallback(() => {
    setMusicUnlocked(true);
    const reel = REELS[activeIndex];
    const track = getTrackById(reel?.musicTrackId ?? "");
    if (track) {
      const audio = new Audio(track.url);
      audio.loop = true;
      audio.volume = 0.65;
      audioRef.current = audio;
      if (!musicMuted) audio.play().catch(() => {});
    }
  }, [activeIndex, musicMuted]);

  const handleToggleMusic = useCallback(() => {
    if (!musicUnlocked) {
      unlockMusic();
    } else {
      setMusicMuted((m) => !m);
    }
  }, [musicUnlocked, unlockMusic]);

  const activeReel = REELS[activeIndex];

  return (
    <div className="relative h-[100svh] overflow-hidden bg-black">
      {/* Fixed top gradient */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 h-36 bg-gradient-to-b from-black via-black/70 to-transparent" />

      {/* Fixed top bar */}
      <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 pt-4">
        <Link href="/" className="pointer-events-auto flex items-center gap-1.5">
          <Flame size={18} className="text-amber-400" />
          <span className="font-serif text-xl font-bold tracking-tight text-white">Kiln</span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-4">
          <button className="border-b-2 border-amber-400 pb-0.5 text-sm font-bold text-white">For You</button>
          <button className="text-sm font-medium text-white/40">Following</button>
        </div>
        <button className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
          <Search size={15} />
        </button>
      </div>

      {/* Reel scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
        onClick={() => { if (!musicUnlocked) unlockMusic(); }}
      >
        {REELS.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            isActive={i === activeIndex}
            musicMuted={musicMuted}
            onToggleMusic={handleToggleMusic}
          />
        ))}
      </div>

      {/* First-reel music nudge */}
      <AnimatePresence>
        {!musicUnlocked && activeIndex === 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.5 }}
            onClick={unlockMusic}
            className="absolute bottom-[148px] left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 border border-white/15 px-4 py-2 backdrop-blur-md text-sm text-white"
          >
            <Music2 size={14} className="text-amber-400" />
            Tap to enable music
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reel counter */}
      <div className="absolute right-3 top-[52px] z-50 rounded-full bg-black/40 px-2 py-0.5 text-[9px] text-stone-500 backdrop-blur-sm">
        {activeIndex + 1} / {REELS.length}
      </div>

      {/* Bottom tab bar */}
      <BottomTab />
    </div>
  );
}
