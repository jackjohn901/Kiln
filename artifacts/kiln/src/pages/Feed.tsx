import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Bookmark, Share2, Volume2, VolumeX, Flame,
  Plus, Home, Users, ShoppingBag, User, Music2, Search,
  MessageCircle, Bell, CheckCircle, Clock, ShoppingCart, X,
} from "lucide-react";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { musicTracks, getTrackById } from "@/data/music";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import Comments from "@/components/Comments";
import NotificationPanel from "@/components/NotificationPanel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function craftScore(id: string) { return 78 + (hash(id) % 20); }
function statVal(seed: string, min: number, max: number) { return min + (hash(seed) % (max - min)); }
function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n); }
function isAvailable(id: string) { return hash(id) % 5 === 0; }

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
  "Glass Blowing": "bg-orange-500", "Flameworking": "bg-red-500", "Neon Glass": "bg-fuchsia-500",
  "Murrine": "bg-rose-500", "Glass Casting": "bg-amber-500", "Kiln Forming": "bg-yellow-600",
  "Studio Glass": "bg-teal-500", "Enamel": "bg-violet-500", "Raku": "bg-orange-700",
  "Wood-Fired": "bg-orange-800", "Porcelain": "bg-sky-400", "Ceramics": "bg-orange-400",
  "Ceramic Sculpture": "bg-amber-700", "Blacksmithing": "bg-zinc-500", "Metal Forging": "bg-slate-400",
  "Welding": "bg-slate-500", "Cast Iron": "bg-zinc-700", "Bronze Casting": "bg-yellow-700",
  "Stone Carving": "bg-stone-500", "Wood Turning": "bg-lime-700", "Wood": "bg-green-800",
  "Batik": "bg-indigo-500", "Fiber Arts": "bg-purple-500", "Textile": "bg-pink-500",
  "Studio Craft": "bg-amber-500",
};

const CS_ICON: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  open: { icon: CheckCircle, color: "text-emerald-400", label: "Open for commissions" },
  waitlisted: { icon: Clock, color: "text-amber-400", label: "Waitlisted" },
  closed: { icon: CheckCircle, color: "text-stone-500", label: "Closed" },
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
  available: boolean;
}

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
      available: isAvailable(a.id + v.id),
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

const ALL_REELS = buildReels();

// ─── Bottom tab bar ───────────────────────────────────────────────────────────

function BottomTab() {
  const [location] = useLocation();
  const { profile } = useProfile();
  const { unreadCount } = useSocial();
  const tabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/discover", icon: Users, label: "Discover" },
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
          <Link key={href} href={href} className="relative flex min-w-[44px] flex-col items-center gap-0.5">
            {Icon && <Icon size={22} className={isActive ? "text-amber-400" : "text-stone-500"} />}
            {label === "Home" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] font-bold text-stone-950 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className={`text-[9px] font-medium ${isActive ? "text-amber-400" : "text-stone-600"}`}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton({ artistId, artistName }: { artistId: string; artistName: string }) {
  const [copied, setCopied] = useState(false);
  function handleShare() {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, "");
    const url = `${base}/artists/${artistId}`;
    if (navigator.share) {
      navigator.share({ title: artistName, text: `Check out ${artistName} on Kiln`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }
  return (
    <button onClick={handleShare} className="flex flex-col items-center gap-1">
      {copied ? (
        <>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
            <span className="text-[10px] text-white font-bold">✓</span>
          </div>
          <span className="text-[11px] font-bold text-green-400">Copied</span>
        </>
      ) : (
        <>
          <Share2 size={24} className="text-white" />
          <span className="text-[11px] font-bold text-white drop-shadow">Share</span>
        </>
      )}
    </button>
  );
}

// ─── Spinning music disc ───────────────────────────────────────────────────────

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
        <div className="overflow-hidden max-w-[44vw]">
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
  onComment,
}: {
  reel: Reel;
  isActive: boolean;
  musicMuted: boolean;
  onToggleMusic: () => void;
  onComment: (reelId: string, artistName: string) => void;
}) {
  const { reelLikes, reelSaves, toggleReelLike, toggleReelSave, getComments, getArtistCommissionStatus } = useSocial();
  const liked = reelLikes[reel.id] ?? false;
  const saved = reelSaves[reel.id] ?? false;
  const commentCount = getComments(reel.id).length;
  const color = TECHNIQUE_COLORS[reel.technique] ?? "bg-amber-500";
  const commissionStatus = getArtistCommissionStatus(reel.artistId);
  const csInfo = CS_ICON[commissionStatus];

  return (
    <div className="relative h-[100svh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      <img
        src={reel.thumbnail}
        alt={reel.caption}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${reel.id}/800/1200`;
        }}
      />

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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/40" />

      {/* ── Bottom-left: artist info ── */}
      <div className="absolute bottom-[88px] left-4 right-20 z-10 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/tag/${encodeURIComponent(reel.technique)}`} className={`inline-flex items-center gap-1 rounded-full ${color} px-2.5 py-0.5 text-[10px] font-bold text-white shadow`}>
            🔥 {reel.technique}
          </Link>
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
            <Flame size={9} className="text-amber-400" />
            <span className="text-[9px] font-bold text-amber-300">{reel.craftScore}</span>
          </span>
          {reel.available && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5">
              <ShoppingCart size={9} className="text-emerald-400" />
              <span className="text-[9px] font-bold text-emerald-300">Available</span>
            </span>
          )}
        </div>

        <Link href={`/artists/${reel.artistId}`}>
          <h2 className="font-serif text-[22px] font-bold leading-tight text-white drop-shadow-lg hover:text-amber-200 transition-colors">
            {reel.artistName}
          </h2>
        </Link>

        <div className="flex items-center gap-2">
          <p className="text-[11px] text-stone-400 drop-shadow">
            @{reel.artistId} · {reel.location.split(",")[0]}
          </p>
          {commissionStatus !== "closed" && (
            <span className={`flex items-center gap-1 text-[10px] font-medium ${csInfo.color}`}>
              <csInfo.icon size={9} />
              {commissionStatus === "open" ? "Open" : "Waitlisted"}
            </span>
          )}
        </div>

        <p className="line-clamp-2 max-w-[78vw] text-sm leading-snug text-stone-200 drop-shadow">
          {reel.caption}
        </p>

        <div className="pt-1">
          <MusicDisc trackId={reel.musicTrackId} spinning={isActive && !musicMuted} />
        </div>
      </div>

      {/* ── Right side actions ── */}
      <div className="absolute bottom-[88px] right-3 z-10 flex flex-col items-center gap-4">
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
        <button
          onClick={() => toggleReelLike(reel.id)}
          className="flex flex-col items-center gap-1"
        >
          <Heart
            size={28}
            fill={liked ? "#ef4444" : "none"}
            className={liked ? "text-red-500" : "text-white"}
            style={{ transition: "all 0.15s" }}
          />
          <span className="text-[11px] font-bold text-white drop-shadow">
            {fmt(reel.likes + (liked ? 1 : 0))}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={() => onComment(reel.id, reel.artistName)}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle size={26} className="text-white" />
          <span className="text-[11px] font-bold text-white drop-shadow">
            {commentCount > 0 ? commentCount : ""}
          </span>
        </button>

        {/* Save */}
        <button
          onClick={() => toggleReelSave(reel.id)}
          className="flex flex-col items-center gap-1"
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
        <ShareButton artistId={reel.artistId} artistName={reel.artistName} />

        {/* Music toggle */}
        <button onClick={onToggleMusic} className="flex flex-col items-center gap-1">
          {musicMuted ? (
            <VolumeX size={22} className="text-white/60" />
          ) : (
            <Volume2 size={22} className="text-amber-400" />
          )}
          <span className="text-[9px] text-white/60">{musicMuted ? "Off" : "Music"}</span>
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
  const [feedTab, setFeedTab] = useState<"foryou" | "following">("foryou");
  const [techniqueFilter, setTechniqueFilter] = useState<string | null>(null);
  const [commentReel, setCommentReel] = useState<{ id: string; artistName: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const { following, unreadCount } = useSocial();

  const baseReels = useMemo(
    () => feedTab === "following" ? ALL_REELS.filter((r) => following.includes(r.artistId)) : ALL_REELS,
    [feedTab, following]
  );

  const reels = useMemo(
    () => techniqueFilter ? baseReels.filter((r) => r.technique === techniqueFilter) : baseReels,
    [baseReels, techniqueFilter]
  );

  const availableTechniques = useMemo(() => {
    const set = new Set(baseReels.map((r) => r.technique));
    return Array.from(set).sort();
  }, [baseReels]);

  const activeReel = reels[activeIndex];

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
        setActiveIndex(Math.max(0, Math.min(idx, reels.length - 1)));
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [reels.length]);

  // Reset scroll when tab or technique filter changes
  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [feedTab, techniqueFilter]);

  // Music: switch track when active reel changes
  useEffect(() => {
    if (!activeReel || !musicUnlocked) return;
    const track = getTrackById(activeReel.musicTrackId);
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
    if (!musicMuted) audioRef.current.play().catch(() => {});
    return () => { audioRef.current?.pause(); };
  }, [activeIndex, musicUnlocked, activeReel]);

  useEffect(() => {
    if (!audioRef.current || !musicUnlocked) return;
    if (musicMuted) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [musicMuted, musicUnlocked]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const unlockMusic = useCallback(() => {
    setMusicUnlocked(true);
    if (!activeReel) return;
    const track = getTrackById(activeReel.musicTrackId);
    if (track) {
      const audio = new Audio(track.url);
      audio.loop = true;
      audio.volume = 0.65;
      audioRef.current = audio;
      if (!musicMuted) audio.play().catch(() => {});
    }
  }, [activeReel, musicMuted]);

  const handleToggleMusic = useCallback(() => {
    if (!musicUnlocked) {
      unlockMusic();
    } else {
      setMusicMuted((m) => !m);
    }
  }, [musicUnlocked, unlockMusic]);

  return (
    <div className="relative h-[100svh] overflow-hidden bg-black">
      {/* Fixed top gradient */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 h-36 bg-gradient-to-b from-black via-black/70 to-transparent" />

      {/* Fixed top bar */}
      <div className="absolute left-0 right-0 top-0 z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4">
          <Link href="/" className="pointer-events-auto flex items-center gap-1.5">
            <Flame size={18} className="text-amber-400" />
            <span className="font-serif text-xl font-bold tracking-tight text-white">Kiln</span>
          </Link>

          <div className="pointer-events-auto flex items-center gap-4">
            <button
              onClick={() => setFeedTab("foryou")}
              className={`pb-0.5 text-sm font-bold transition-colors ${feedTab === "foryou" ? "border-b-2 border-amber-400 text-white" : "text-white/40"}`}
            >
              For You
            </button>
            <button
              onClick={() => setFeedTab("following")}
              className={`pb-0.5 text-sm font-medium transition-colors relative ${feedTab === "following" ? "border-b-2 border-amber-400 text-white" : "text-white/40"}`}
            >
              Following
              {following.length > 0 && feedTab !== "following" && (
                <span className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-stone-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <Link href="/discover" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
              <Search size={15} />
            </Link>
          </div>
        </div>

        {/* Technique filter chips */}
        <div className="pointer-events-auto flex gap-2 overflow-x-auto px-4 pt-2 pb-1" style={{ scrollbarWidth: "none" }}>
          {techniqueFilter && (
            <button
              onClick={() => setTechniqueFilter(null)}
              className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-stone-950"
            >
              <X size={9} /> All
            </button>
          )}
          {availableTechniques.map((t) => (
            <button
              key={t}
              onClick={() => setTechniqueFilter(techniqueFilter === t ? null : t)}
              className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                techniqueFilter === t
                  ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                  : "border-white/15 bg-black/30 text-white/60 backdrop-blur-sm hover:border-white/30 hover:text-white/90"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Notification panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Reel scroll container */}
      {reels.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center px-8">
          <Users size={40} className="text-stone-700 mb-4" />
          <p className="text-stone-300 font-medium mb-2">No reels from followed artists</p>
          <p className="text-stone-500 text-sm mb-6">Follow some artists to see their work here</p>
          <Link
            href="/discover"
            onClick={() => setFeedTab("foryou")}
            className="px-5 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
          >
            Discover Artists
          </Link>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: "none" }}
          onClick={() => { if (!musicUnlocked) unlockMusic(); }}
        >
          {reels.map((reel, i) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              isActive={i === activeIndex}
              musicMuted={musicMuted}
              onToggleMusic={handleToggleMusic}
              onComment={(id, name) => setCommentReel({ id, artistName: name })}
            />
          ))}
        </div>
      )}

      {/* First-reel music nudge */}
      <AnimatePresence>
        {!musicUnlocked && activeIndex === 0 && reels.length > 0 && (
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
      {reels.length > 0 && (
        <div className="absolute right-3 top-[52px] z-50 rounded-full bg-black/40 px-2 py-0.5 text-[9px] text-stone-500 backdrop-blur-sm">
          {activeIndex + 1} / {reels.length}
        </div>
      )}

      {/* Comments sheet */}
      {commentReel && (
        <Comments
          postId={commentReel.id}
          artistName={commentReel.artistName}
          onClose={() => setCommentReel(null)}
        />
      )}

      <BottomTab />
    </div>
  );
}
