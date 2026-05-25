import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Bookmark, Share2, Volume2, VolumeX, Flame,
  Plus, Home, Users, ShoppingBag, User, Music2, Search,
  MessageCircle, Bell, CheckCircle, Clock, ShoppingCart, X, Repeat2, Flag, Check,
  SplitSquareHorizontal, Scissors, Lock, ThumbsUp, ThumbsDown, MoreHorizontal, Crown, GitBranch,
  Mic, MicOff, DollarSign, BadgeCheck, ArrowUp,
} from "lucide-react";
import TipModal from "@/components/TipModal";
import ReportModal from "@/components/ReportModal";
import BoardSavePicker from "@/components/BoardSavePicker";
import { ParsedCaption } from "@/lib/parseCaption";
import { getNextFeatureToSurface, markFeatureSurfaced, type DiscoveryFeature } from "@/lib/featureDiscovery";
import FeatureDiscoveryCard from "@/components/FeatureDiscoveryCard";
import { getTrackById } from "@/data/music";
import { getCommunityBeats } from "@/lib/communityBeats";
import { createBeatLooper } from "@/lib/beatSynth";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import Comments from "@/components/Comments";
import NotificationPanel from "@/components/NotificationPanel";
import Stories from "@/components/Stories";
import VideoAnnotations, { TECHNIQUE_ANNOTATIONS } from "@/components/VideoAnnotations";
import { SEED_KILN_STATUSES, getFiringETA } from "@/data/kilnStatuses";
import { resolveMediaUrl, isIdbUrl } from "@/lib/videoDB";
import MuxPlayer from "@mux/mux-player-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { ALL_REELS, TECHNIQUE_COLORS, type Reel } from "@/data/reels";
import { getPosts } from "@/data/posts";

const PREFS_KEY = "kiln_prefs_v1";
const INTERACTIONS_KEY = "kiln_interactions_v1";

interface FeedInteractions {
  likedTechniques: Record<string, number>;
  savedTechniques: Record<string, number>;
  watchedArtists: Record<string, number>;
}

function readInteractions(): FeedInteractions {
  try {
    const raw = JSON.parse(localStorage.getItem(INTERACTIONS_KEY) ?? "{}");
    return {
      likedTechniques: raw.likedTechniques ?? {},
      savedTechniques: raw.savedTechniques ?? {},
      watchedArtists: raw.watchedArtists ?? {},
    };
  } catch {
    return { likedTechniques: {}, savedTechniques: {}, watchedArtists: {} };
  }
}


const FEED_TECHNIQUE_MEDIUM_MAP: Record<string, string> = {
  "Glass Blowing": "glass", "Flameworking": "glass", "Kiln Forming": "glass",
  "Glass Casting": "glass", "Murrine": "glass", "Neon Glass": "glass", "Cold Working": "glass",
  "Raku": "ceramics", "Porcelain": "ceramics", "Ceramics": "ceramics", "Wood-Fired": "ceramics",
  "Stoneware": "ceramics", "Earthenware": "ceramics",
  "Metal Forging": "metal", "Bronze Casting": "metal", "Blacksmithing": "metal", "Welding": "metal",
  "Enamel": "enamel", "Fiber Arts": "fiber", "Textile": "fiber", "Tapestry": "fiber",
};

function readTasteWeights(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem("kiln_taste_graph_v1") ?? "{}"); } catch { return {}; }
}

const LINEAGE_GENERATION: Record<string, number> = {
  "harvey-littleton": 0, "dominick-labino": 0,
  "dale-chihuly": 1, "fritz-dreisbach": 1, "marvin-lipofsky": 1,
  "lino-tagliapietra": 2, "william-morris": 2, "richard-marquis": 2,
  "dante-marioni": 3, "richard-royal": 3, "john-kiley": 3,
  "alex-bernstein": 3, "caleb-siemon": 3, "erica-rosenfeld": 3,
};

function getArtistStudioHours(artistId: string): number {
  const SEED: Record<string, number> = {
    "alex-bernstein": 2400, "maya-chen": 1800, "james-okafor": 3200,
    "elena-vasquez": 1200, "takeshi-mori": 4100, "dale-chihuly": 8500,
    "lino-tagliapietra": 12000, "dante-marioni": 5600, "william-morris": 6200,
  };
  if (SEED[artistId]) return SEED[artistId];
  let h = 0;
  for (const c of artistId) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return 200 + (Math.abs(h) % 3800);
}

function scoreReel(
  reel: Reel,
  interactions: FeedInteractions,
  following: string[],
  quizTechniques: string[],
): number {
  let score = reel.craftScore;
  // Boost followed artists
  if (following.includes(reel.artistId)) score += 30;
  // Boost techniques the user has liked/saved
  score += (interactions.likedTechniques[reel.technique] ?? 0) * 8;
  score += (interactions.savedTechniques[reel.technique] ?? 0) * 12;
  // Boost artists the user has watched
  score += (interactions.watchedArtists[reel.artistId] ?? 0) * 5;
  // Boost quiz-selected techniques
  if (quizTechniques.includes(reel.technique)) score += 20;
  // Taste Graph: boost/suppress based on medium and aesthetic preferences
  const tasteWeights = readTasteWeights();
  const mediumKey = FEED_TECHNIQUE_MEDIUM_MAP[reel.technique];
  if (mediumKey && tasteWeights[mediumKey] != null) {
    score += ((tasteWeights[mediumKey] - 50) / 50) * 25;
  }
  if (tasteWeights.experimental != null && reel.craftScore > 90) {
    score += ((tasteWeights.experimental - 50) / 50) * 8;
  }
  if (tasteWeights.traditional != null && reel.craftScore < 85) {
    score += ((tasteWeights.traditional - 50) / 50) * 6;
  }
  // Add small random shuffle so it's not static
  score += Math.floor(Math.random() * 10);
  return score;
}

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n); }

function userPostsToReels(): Reel[] {
  try {
    const posts = getPosts();
    return posts.map((post) => ({
      id: post.id,
      videoId: "",
      videoUrl: post.type === "video" ? post.mediaUrl : undefined,
      muxPlaybackId: post.muxPlaybackId,
      artistId: post.artistId,
      artistName: post.artistName,
      technique: post.tags[0] ?? "Studio Craft",
      location: "",
      caption: post.caption,
      craftScore: 95,
      likes: post.likes,
      saves: post.saves,
      thumbnail: post.thumbnailUrl || post.mediaUrl,
      avatarUrl: post.artistAvatarUrl,
      musicTrackId: ALL_REELS[0]?.musicTrackId ?? "track-ambient-1",
      available: false,
      patronOnly: post.patronOnly,
      collabArtistName: (post as any).collaboratorName,
    }));
  } catch {
    return [];
  }
}

const CS_ICON: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  open: { icon: CheckCircle, color: "text-emerald-400", label: "Open for commissions" },
  waitlisted: { icon: Clock, color: "text-amber-400", label: "Waitlisted" },
  closed: { icon: CheckCircle, color: "text-stone-500", label: "Closed" },
};


// ─── Bottom tab bar ───────────────────────────────────────────────────────────

function BottomTab() {
  const [location] = useLocation();
  const { profile } = useProfile();
  const { unreadCount } = useSocial();
  const tabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/discover", icon: Users, label: "Discover" },
    { href: profile ? "/create" : "/setup", icon: null, label: "" },
    { href: "/shop", icon: ShoppingBag, label: "Shop" },
    { href: profile ? `/artists/${profile.id}` : "/setup", icon: User, label: "Profile" },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 bg-black/80 backdrop-blur-xl px-1 pb-5 pt-2">
      {tabs.map(({ href, icon: Icon, label }, i) => {
        if (i === 2) {
          return (
            <Link key={`tab-${i}`} href={href} className="flex flex-col items-center">
              <div className="flex h-9 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                <Plus size={20} className="font-bold text-stone-950" />
              </div>
            </Link>
          );
        }
        const isActive = href === "/" ? location === "/" : location.startsWith(href);
        return (
          <Link key={`tab-${i}`} href={href} className="relative flex min-w-[44px] flex-col items-center gap-0.5">
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

// ─── Streak badge ─────────────────────────────────────────────────────────────

function StreakBadge() {
  const { streak } = useSocial();
  if (streak.current === 0) return null;
  return (
    <div className="flex h-8 items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5">
      <Flame size={12} className="text-amber-400" />
      <span className="text-xs font-bold text-amber-300">{streak.current}</span>
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
  videoAudioOn,
  onToggleVideoAudio,
  musicUnlocked,
  onComment,
  onNotInterested,
  onMoreLikeThis,
}: {
  reel: Reel;
  isActive: boolean;
  musicMuted: boolean;
  onToggleMusic: () => void;
  videoAudioOn: boolean;
  onToggleVideoAudio: () => void;
  musicUnlocked: boolean;
  onComment: (reelId: string, artistName: string) => void;
  onNotInterested: () => void;
  onMoreLikeThis: () => void;
}) {
  const [showReport, setShowReport] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [showAlgoMenu, setShowAlgoMenu] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const { reelLikes, reelSaves, reelReposts, toggleReelLike, toggleReelSave, toggleReelRepost, getComments, getArtistCommissionStatus, isSubscribed, isFollowing, followArtist, unfollowArtist, isVerified, sendTip } = useSocial();
  const [showTip, setShowTip] = useState(false);
  const { profile: myProfile } = useProfile();
  const isPatronGated = reel.patronOnly && !isSubscribed(reel.artistId);
  const isOwnReel = !!myProfile && myProfile.id === reel.artistId;
  const isFollowingArtist = isFollowing(reel.artistId);
  const liked = reelLikes[reel.id] ?? false;
  const saved = reelSaves[reel.id] ?? false;
  const reposted = reelReposts[reel.id] ?? false;
  const commentCount = getComments(reel.id).length;
  const color = TECHNIQUE_COLORS[reel.technique] ?? "bg-amber-500";
  const commissionStatus = getArtistCommissionStatus(reel.artistId);
  const csInfo = CS_ICON[commissionStatus];

  const [playProgress, setPlayProgress] = useState(0);
  useEffect(() => {
    if (!isActive) { setPlayProgress(0); return; }
    const iv = setInterval(() => setPlayProgress((p) => (p >= 100 ? 0 : p + 0.4)), 400);
    return () => clearInterval(iv);
  }, [isActive]);

  // Track post view once per session when this reel enters the active slot
  useEffect(() => {
    if (!isActive) return;
    const key = `kiln_v_${reel.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/posts/${reel.id}/view`, { method: "POST" }).catch(() => {});
  }, [isActive, reel.id]);

  const reelAnnotations = TECHNIQUE_ANNOTATIONS[reel.technique] ?? [];

  // Resolve idb:// video URLs from IndexedDB
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(
    reel.videoUrl && !isIdbUrl(reel.videoUrl) ? reel.videoUrl : null
  );
  useEffect(() => {
    if (!reel.videoUrl) return;
    if (!isIdbUrl(reel.videoUrl)) { setResolvedVideoUrl(reel.videoUrl); return; }
    let objectUrl: string | null = null;
    resolveMediaUrl(reel.videoUrl).then((url) => {
      objectUrl = url;
      setResolvedVideoUrl(url);
    }).catch(() => setResolvedVideoUrl(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reel.videoUrl]);

  // Imperative play/pause — autoPlay={bool} doesn't retrigger after mount
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolvedVideoUrl) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive, resolvedVideoUrl]);

  // Original audio: browsers require muted for autoplay — unmute imperatively after user gesture
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Never unmute before the user has tapped (autoplay policy) or when not active
    if (!musicUnlocked || !isActive || !videoAudioOn) {
      v.muted = true;
      return;
    }
    v.muted = false;
    const hasMusicTrack = !!(reel.musicTrackId);
    // Duck original audio to 25% when a music layer is playing on top
    v.volume = (hasMusicTrack && !musicMuted) ? 0.25 : 1.0;
  }, [videoAudioOn, musicMuted, musicUnlocked, isActive, reel.musicTrackId]);

  return (
    <div className="relative h-[100svh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {/* Ken Burns keyframes for seed thumbnails */}
      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1.05) translate(0%,    0%);    }
          33%  { transform: scale(1.12) translate(-1.5%, -0.8%); }
          66%  { transform: scale(1.09) translate(1%,    0.5%);  }
          100% { transform: scale(1.05) translate(0%,    0%);    }
        }
        .kb-active { animation: kenBurns 10s ease-in-out infinite; }
      `}</style>

      {reel.muxPlaybackId ? (
        /* ── Mux player for transcoded uploads ── */
        <MuxPlayer
          playbackId={reel.muxPlaybackId}
          streamType="on-demand"
          autoPlay
          muted={!videoAudioOn || !musicUnlocked}
          loop
          playsInline
          paused={!isActive}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : resolvedVideoUrl ? (
        /* ── HTML5 video for user-uploaded content ── */
        <video
          ref={videoRef}
          key={resolvedVideoUrl}
          src={resolvedVideoUrl}
          muted
          loop
          playsInline
          poster={reel.thumbnail}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <img
            src={reel.thumbnail}
            alt={reel.caption}
            className={`absolute inset-0 h-full w-full object-cover ${isActive ? "kb-active" : ""}`}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${reel.id}/800/1200`;
            }}
          />
          {/* Vimeo background player — cleaner than YouTube in embedded contexts */}
          {isActive && reel.videoId && (
            <iframe
              key={reel.videoId}
              src={`https://www.youtube-nocookie.com/embed/${reel.videoId}?autoplay=1&mute=1&controls=0&loop=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&playlist=${reel.videoId}&enablejsapi=0`}
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
                opacity: 0.001, // hidden — Ken Burns thumbnail shows; iframe loads in background
              }}
              allow="autoplay; encrypted-media"
            />
          )}
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/40" />

      {/* Before/After reveal overlay */}
      {reel.beforeImageUrl && showBefore && (
        <div className="absolute inset-0 z-[15]">
          <img src={reel.beforeImageUrl} alt="Before" className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/40" />
        </div>
      )}
      {/* Before/After toggle pill */}
      {reel.beforeImageUrl && (
        <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 overflow-hidden rounded-full border border-white/20 bg-black/60 backdrop-blur-sm">
          <button
            onClick={(e) => { e.stopPropagation(); setShowBefore(false); }}
            className={`px-3 py-1 text-[10px] font-bold transition-colors ${!showBefore ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-white"}`}
          >AFTER</button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowBefore(true); }}
            className={`px-3 py-1 text-[10px] font-bold transition-colors ${showBefore ? "bg-stone-300 text-stone-950" : "text-stone-400 hover:text-white"}`}
          >BEFORE</button>
        </div>
      )}

      {/* Patron gate overlay */}
      {isPatronGated && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 backdrop-blur-xl bg-black/60">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40">
            <Lock size={24} className="text-amber-400" />
          </div>
          <div className="text-center px-8">
            <p className="font-semibold text-amber-100 mb-1">Patron-exclusive post</p>
            <p className="text-sm text-stone-400">Subscribe to {reel.artistName.split(" ")[0]} to unlock</p>
          </div>
          <Link href={`/artists/${reel.artistId}/patron`}>
            <button className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
              <Crown size={14} /> Become a Patron
            </button>
          </Link>
        </div>
      )}


      {/* ── Technique annotation overlay ── */}
      {reelAnnotations.length > 0 && isActive && !isPatronGated && (
        <VideoAnnotations annotations={reelAnnotations} progress={playProgress} />
      )}

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
          {LINEAGE_GENERATION[reel.artistId] != null && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 backdrop-blur-sm">
              <GitBranch size={9} className="text-purple-400" />
              <span className="text-[9px] font-bold text-purple-300">Gen {(LINEAGE_GENERATION[reel.artistId] ?? 0) + 1}</span>
            </span>
          )}
          {(() => {
            const hrs = getArtistStudioHours(reel.artistId);
            const label = hrs >= 1000 ? (hrs / 1000).toFixed(1) + "k" : String(hrs);
            return (
              <span className="flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 backdrop-blur-sm">
                <Clock size={9} className="text-teal-400" />
                <span className="text-[9px] font-bold text-teal-300">{label}h studio</span>
              </span>
            );
          })()}
          {(reel.streak ?? 0) >= 3 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 backdrop-blur-sm">
              <Flame size={9} className="text-rose-400" />
              <span className="text-[9px] font-bold text-rose-300">{reel.streak}d</span>
            </span>
          )}
          {reel.artistLevel && (
            <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 border backdrop-blur-sm ${
              reel.artistLevel === "Master" ? "bg-amber-500/20 border-amber-500/30" :
              reel.artistLevel === "Established" ? "bg-purple-500/20 border-purple-500/30" :
              reel.artistLevel === "Rising" ? "bg-sky-500/20 border-sky-500/30" :
              "bg-stone-500/20 border-stone-500/30"
            }`}>
              <span className="text-[9px]">
                {reel.artistLevel === "Master" ? "🔥" : reel.artistLevel === "Established" ? "⭐" : reel.artistLevel === "Rising" ? "⬆️" : "🌱"}
              </span>
              <span className={`text-[9px] font-bold ${
                reel.artistLevel === "Master" ? "text-amber-300" :
                reel.artistLevel === "Established" ? "text-purple-300" :
                reel.artistLevel === "Rising" ? "text-sky-300" : "text-stone-400"
              }`}>{reel.artistLevel}</span>
            </span>
          )}
        </div>

        <Link href={`/artists/${reel.artistId}`}>
          <h2 className="font-serif text-[22px] font-bold leading-tight text-white drop-shadow-lg hover:text-amber-200 transition-colors inline-flex items-center gap-1.5">
            {reel.artistName}
            {isVerified(reel.artistId) && <BadgeCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />}
          </h2>
        </Link>
        {reel.collabArtistName && (
          <div className="flex items-center gap-1.5">
            <Users size={10} className="text-amber-400/80" />
            <span className="text-[10px] text-amber-300 font-bold">with {reel.collabArtistName}</span>
          </div>
        )}

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

        <ParsedCaption
          text={reel.caption}
          className="line-clamp-2 max-w-[78vw] text-sm leading-snug text-stone-200 drop-shadow"
        />

        <div className="pt-1 flex items-center gap-2 flex-wrap">
          {/* Original audio toggle — only relevant when there's actual video content */}
          {resolvedVideoUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVideoAudio(); }}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] backdrop-blur-sm transition-all ${
                videoAudioOn
                  ? "bg-white/15 text-white/80 border border-white/10"
                  : "bg-black/40 text-white/30 border border-white/5"
              }`}
            >
              {videoAudioOn ? <Mic size={10} /> : <MicOff size={10} />}
              <span>Original</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Right side actions ── */}
      <div className="absolute bottom-[88px] right-3 z-10 flex flex-col items-center gap-3">
        {/* Avatar */}
        <div className="relative mb-1">
          <Link href={`/artists/${reel.artistId}`}>
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
          </Link>
          {!isOwnReel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isFollowingArtist) {
                  unfollowArtist(reel.artistId);
                } else {
                  followArtist(reel.artistId, reel.artistName, reel.avatarUrl);
                }
              }}
              className={`absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full shadow-md transition-colors ${
                isFollowingArtist
                  ? "bg-stone-600 border border-stone-400"
                  : "bg-amber-500 hover:bg-amber-400"
              }`}
            >
              {isFollowingArtist
                ? <Check size={10} className="text-white" strokeWidth={3} />
                : <Plus size={11} className="text-stone-950" strokeWidth={3} />
              }
            </button>
          )}
        </div>

        {/* More options (algo feedback + report) */}
        <button
          onClick={() => setShowAlgoMenu(true)}
          className="flex flex-col items-center gap-1 opacity-40 hover:opacity-70 transition-opacity"
        >
          <MoreHorizontal size={20} className="text-white" />
          <span className="text-[9px] text-white/60">More</span>
        </button>

        {/* Share */}
        <ShareButton artistId={reel.artistId} artistName={reel.artistName} />

        {/* Tip */}
        {!isOwnReel && (
          <button onClick={() => setShowTip(true)} className="flex flex-col items-center gap-1">
            <DollarSign size={22} className="text-white" />
            <span className="text-[9px] font-bold text-white drop-shadow">Tip</span>
          </button>
        )}

        {/* Stitch */}
        <Link href={`/stitch/${reel.id}`}>
          <button className="flex flex-col items-center gap-1">
            <Scissors size={20} className="text-white" />
            <span className="text-[9px] font-bold text-white drop-shadow">Stitch</span>
          </button>
        </Link>

        {/* Duet */}
        <Link href={`/duet/${reel.id}`}>
          <button className="flex flex-col items-center gap-1">
            <SplitSquareHorizontal size={22} className="text-white" />
            <span className="text-[9px] font-bold text-white drop-shadow">Duet</span>
          </button>
        </Link>

        {/* Repost / Amplify */}
        <button
          onClick={() => toggleReelRepost(reel.id, { artistId: reel.artistId, artistName: reel.artistName, caption: reel.caption, thumbnail: reel.thumbnail })}
          className="flex flex-col items-center gap-1"
        >
          <Repeat2
            size={24}
            className={reposted ? "text-emerald-400" : "text-white"}
            style={{ transition: "all 0.15s" }}
          />
          <span className="text-[9px] font-bold text-white drop-shadow">{reposted ? "On" : ""}</span>
        </button>

        {/* Save — opens board picker */}
        <button
          onClick={() => {
            if (!saved) {
              toggleReelSave(reel.id);
            }
            setShowBoardPicker(true);
            try {
              const data = readInteractions();
              data.savedTechniques[reel.technique] = Math.max(0, (data.savedTechniques[reel.technique] ?? 0) + 1);
              data.watchedArtists[reel.artistId] = (data.watchedArtists[reel.artistId] ?? 0) + 1;
              localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(data));
            } catch {}
          }}
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

        {/* Comment */}
        <button
          onClick={() => onComment(reel.id, reel.artistName)}
          className="flex flex-col items-center gap-1 p-1 -m-1"
        >
          <MessageCircle size={30} className="text-white" />
          <span className="text-[11px] font-bold text-white drop-shadow">
            {commentCount > 0 ? commentCount : ""}
          </span>
        </button>

        {/* Like */}
        <button
          onClick={() => {
            toggleReelLike(reel.id);
            // Record interaction for For You algorithm
            try {
              const data = readInteractions();
              const delta = liked ? -1 : 1;
              data.likedTechniques[reel.technique] = Math.max(0, (data.likedTechniques[reel.technique] ?? 0) + delta);
              data.watchedArtists[reel.artistId] = (data.watchedArtists[reel.artistId] ?? 0) + 1;
              localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(data));
            } catch {}
          }}
          className="flex flex-col items-center gap-1 p-1 -m-1"
        >
          <Heart
            size={32}
            fill={liked ? "#ef4444" : "none"}
            className={liked ? "text-red-500" : "text-white"}
            style={{ transition: "all 0.15s" }}
          />
          <span className="text-[11px] font-bold text-white drop-shadow">
            {fmt(reel.likes + (liked ? 1 : 0))}
          </span>
        </button>
      </div>

      {/* Algo menu */}
      <AnimatePresence>
        {showAlgoMenu && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAlgoMenu(false)}
          >
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-2xl bg-stone-900 border border-white/10 p-4 pb-10"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-stone-200">Post options</p>
                <button onClick={() => setShowAlgoMenu(false)} className="text-stone-500 hover:text-stone-300">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowAlgoMenu(false); onNotInterested(); }}
                  className="flex items-center gap-3 rounded-xl bg-stone-800/60 px-4 py-3 text-left hover:bg-stone-700/60 transition-colors"
                >
                  <ThumbsDown size={16} className="text-stone-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-200">Not interested</p>
                    <p className="text-[11px] text-stone-500">Hide this reel and see less like it</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowAlgoMenu(false); onMoreLikeThis(); }}
                  className="flex items-center gap-3 rounded-xl bg-stone-800/60 px-4 py-3 text-left hover:bg-stone-700/60 transition-colors"
                >
                  <ThumbsUp size={16} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-200">More like this</p>
                    <p className="text-[11px] text-stone-500">Boost {reel.technique} in your feed</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowAlgoMenu(false); setShowReport(true); }}
                  className="flex items-center gap-3 rounded-xl bg-stone-800/60 px-4 py-3 text-left hover:bg-stone-700/60 transition-colors"
                >
                  <Flag size={16} className="text-stone-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-200">Report</p>
                    <p className="text-[11px] text-stone-500">Flag this content for review</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showReport && (
        <ReportModal
          postId={reel.id}
          artistName={reel.artistName}
          onClose={() => setShowReport(false)}
        />
      )}

      {showBoardPicker && (
        <BoardSavePicker
          reelId={reel.id}
          thumbnailUrl={reel.thumbnail}
          onClose={() => setShowBoardPicker(false)}
          onSaved={() => setShowBoardPicker(false)}
        />
      )}

      {showTip && (
        <TipModal
          artistId={reel.artistId}
          artistName={reel.artistName}
          artistAvatarUrl={reel.avatarUrl ?? `https://picsum.photos/seed/${reel.artistId}/80/80`}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

export default function Feed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const beatLooperRef   = useRef<{ stop: () => void } | null>(null);
  const activeReelRef   = useRef<Reel | null>(null);
  const followingLoadedRef = useRef(false);
  const followingReelIdsRef = useRef<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPostReels, setUserPostReels] = useState<Reel[]>(() => userPostsToReels());
  const [followingApiReels, setFollowingApiReels] = useState<Reel[]>([]);
  const [pendingFollowingReels, setPendingFollowingReels] = useState<Reel[]>([]);
  const [newFollowingPostCount, setNewFollowingPostCount] = useState(0);
  const [apiPostOffset, setApiPostOffset] = useState(20);
  const [hasMoreApiPosts, setHasMoreApiPosts] = useState(true);
  const [musicMuted, setMusicMuted] = useState(false);
  const [videoAudioOn, setVideoAudioOn] = useState(true);
  const [musicUnlocked, setMusicUnlocked] = useState(false);
  const [feedTab, setFeedTab] = useState<"foryou" | "following">("foryou");
  const [techniqueFilter, setTechniqueFilter] = useState<string | null>(null);
  const [commentReel, setCommentReel] = useState<{ id: string; artistName: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const NOT_INTERESTED_KEY = "kiln_not_interested_v1";
  const [notInterested, setNotInterested] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(NOT_INTERESTED_KEY) ?? "[]") as string[]);
    } catch { return new Set<string>(); }
  });

  function handleNotInterested(reelId: string) {
    setNotInterested((prev) => {
      const next = new Set(prev);
      next.add(reelId);
      localStorage.setItem(NOT_INTERESTED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function handleMoreLikeThis(technique: string) {
    try {
      const data = readInteractions();
      data.likedTechniques[technique] = (data.likedTechniques[technique] ?? 0) + 15;
      localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(data));
    } catch {}
  }

  const { following, unreadCount } = useSocial();
  const { profile } = useProfile();
  const { settings: kilnSettings } = useSettings();
  const [, navigate] = useLocation(); // used by StreakBadge and other sub-components
  const followedFirings = SEED_KILN_STATUSES.filter((s) => following.includes(s.artistId));
  const [kilnBannerDismissed, setKilnBannerDismissed] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return !!localStorage.getItem("kiln_welcome_dismissed"); } catch { return false; }
  });
  const [discoveryFeature, setDiscoveryFeature] = useState<DiscoveryFeature | null>(null);
  const [discoveryShown, setDiscoveryShown] = useState(false);

  const [justPublishedCount, setJustPublishedCount] = useState(0);

  // Feature discovery: show a card after the 5th reel, once per session per feature
  useEffect(() => {
    if (discoveryShown || activeIndex < 4) return;
    const feature = getNextFeatureToSurface();
    if (!feature) return;
    markFeatureSurfaced(feature.id);
    setDiscoveryFeature(feature);
    setDiscoveryShown(true);
  }, [activeIndex, discoveryShown]);

  // Reload user posts on mount, when window regains focus, or immediately after posting
  useEffect(() => {
    setUserPostReels(userPostsToReels());
    const reload = () => setUserPostReels(userPostsToReels());
    window.addEventListener("focus", reload);
    window.addEventListener("kiln:post-added", reload);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener("kiln:post-added", reload);
    };
  }, []);

  // Fetch posts from users I follow — extracted so polling and WS can reuse it
  const fetchFollowingFeed = useCallback(() => {
    const defaultMusicId = ALL_REELS[0]?.musicTrackId ?? "track-ambient-1";
    fetch("/api/feed/following?limit=20", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data?.posts?.length) return;
        const apiReels: Reel[] = data.posts.map((p: any) => ({
          id: `db-${p.id}`,
          videoId: "",
          videoUrl: p.videoUrl ?? undefined,
          artistId: p.authorId ?? "unknown",
          artistName: p.authorName ?? "Artist",
          technique: p.technique ?? "Studio Craft",
          location: "",
          caption: p.caption ?? "",
          craftScore: Math.min(95, 75 + Math.floor((p.likeCount ?? 0) / 30)),
          likes: p.likeCount ?? 0,
          saves: p.saveCount ?? 0,
          thumbnail: p.thumbnailUrl ?? undefined,
          avatarUrl: p.authorAvatarUrl ?? undefined,
          musicTrackId: defaultMusicId,
          available: false,
          patronOnly: p.isPatronOnly ?? false,
          streak: (p.authorStreak ?? 0) >= 3 ? p.authorStreak : undefined,
          artistLevel: (p.authorLevel as Reel["artistLevel"]) ?? undefined,
          beforeImageUrl: p.beforeImageUrl ?? undefined,
        }));
        if (!followingLoadedRef.current) {
          // First load: apply immediately, no pill
          followingLoadedRef.current = true;
          followingReelIdsRef.current = new Set(apiReels.map((r) => r.id));
          setFollowingApiReels(apiReels);
        } else {
          // Background refresh: only show pill if there are genuinely new posts
          const newPosts = apiReels.filter((r) => !followingReelIdsRef.current.has(r.id));
          if (newPosts.length > 0) {
            setNewFollowingPostCount(newPosts.length);
            setPendingFollowingReels(apiReels);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Reset following pill state when leaving the Following tab so next entry is treated as first load
  useEffect(() => {
    if (feedTab !== "following") {
      followingLoadedRef.current = false;
      followingReelIdsRef.current = new Set();
      setPendingFollowingReels([]);
      setNewFollowingPostCount(0);
    }
  }, [feedTab]);

  // Apply pending following reels: update feed, scroll to top, clear pill
  const applyPendingFollowingReels = useCallback(() => {
    followingReelIdsRef.current = new Set(pendingFollowingReels.map((r) => r.id));
    setFollowingApiReels(pendingFollowingReels);
    setPendingFollowingReels([]);
    setNewFollowingPostCount(0);
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [pendingFollowingReels]);

  // Dismiss pill: keep current scroll and feed unchanged
  const dismissPendingFollowingReels = useCallback(() => {
    setPendingFollowingReels([]);
    setNewFollowingPostCount(0);
  }, []);

  // Fetch on tab switch
  useEffect(() => {
    if (feedTab !== "following") return;
    fetchFollowingFeed();
  }, [feedTab, fetchFollowingFeed]);

  // Poll every 60s while the Following tab is active
  useEffect(() => {
    if (feedTab !== "following") return;
    const POLL_MS = 60_000;
    const timerId = setInterval(fetchFollowingFeed, POLL_MS);
    return () => clearInterval(timerId);
  }, [feedTab, fetchFollowingFeed]);

  // Refresh immediately on WebSocket new-post events while Following tab is active
  const { subscribe: wsSubscribe } = useWebSocket();
  useEffect(() => {
    if (feedTab !== "following") return;
    return wsSubscribe("new-post", fetchFollowingFeed);
  }, [feedTab, wsSubscribe, fetchFollowingFeed]);

  // Fetch real posts from API and prepend to feed
  useEffect(() => {
    const defaultMusicId = ALL_REELS[0]?.musicTrackId ?? "track-ambient-1";
    fetch("/api/feed?limit=20")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data?.posts?.length) return;
        const apiReels: Reel[] = data.posts.map((p: any) => ({
          id: `db-${p.id}`,
          videoId: "",
          videoUrl: p.videoUrl ?? undefined,
          artistId: p.authorId ?? "unknown",
          artistName: p.authorName ?? "Artist",
          technique: p.technique ?? "Studio Craft",
          location: "",
          caption: p.caption ?? "",
          craftScore: Math.min(95, 75 + Math.floor((p.likeCount ?? 0) / 30)),
          likes: p.likeCount ?? 0,
          saves: p.saveCount ?? 0,
          thumbnail: p.thumbnailUrl ?? undefined,
          avatarUrl: p.authorAvatarUrl ?? undefined,
          musicTrackId: defaultMusicId,
          available: false,
          patronOnly: p.isPatronOnly ?? false,
          streak: (p.authorStreak ?? 0) >= 3 ? p.authorStreak : undefined,
          artistLevel: (p.authorLevel as Reel["artistLevel"]) ?? undefined,
          beforeImageUrl: p.beforeImageUrl ?? undefined,
        }));
        setUserPostReels((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const fresh = apiReels.filter((r) => !existingIds.has(r.id));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
      })
      .catch(() => {});
  }, []);


  // Detect and auto-publish any scheduled posts that are now past their scheduled time
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kiln_scheduled_posts_v1");
      if (!raw) return;
      const posts = JSON.parse(raw) as Array<{ id: string; status: string; scheduledAt: string }>;
      const now = Date.now();
      const goLive = posts.filter(p => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now);
      if (goLive.length === 0) return;
      const updated = posts.map(p => goLive.some(g => g.id === p.id) ? { ...p, status: "published" } : p);
      localStorage.setItem("kiln_scheduled_posts_v1", JSON.stringify(updated));
      setJustPublishedCount(goLive.length);
      setUserPostReels(userPostsToReels());
      setTimeout(() => setJustPublishedCount(0), 6000);
    } catch { /* ignore */ }
  }, []);

  // For You algorithm: score and sort based on user behaviour + settings
  // User's own posts always appear first (score 95)
  const baseReels = useMemo(() => {
    if (feedTab === "following") {
      return [
        ...followingApiReels,
        ...userPostReels,
        ...ALL_REELS.filter((r) => following.includes(r.artistId)),
      ];
    }
    // Read current interaction data and quiz prefs each time
    const interactions = readInteractions();
    const prefs = (() => {
      try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}"); } catch { return {}; }
    })();
    const quizTechniques: string[] = prefs.techniques ?? [];
    // Score every reel
    const scored = ALL_REELS.map((r) => ({
      reel: r,
      score: scoreReel(r, interactions, following, quizTechniques),
    }));
    // Respect settings (autoplay / sound etc wired in feed)
    void kilnSettings;
    return [
      ...userPostReels,
      ...scored.sort((a, b) => b.score - a.score).map((s) => s.reel),
    ];
  }, [feedTab, following, userPostReels, followingApiReels, kilnSettings]);

  const reels = useMemo(() => {
    const base = techniqueFilter ? baseReels.filter((r) => r.technique === techniqueFilter) : baseReels;
    return notInterested.size > 0 ? base.filter((r) => !notInterested.has(r.id)) : base;
  }, [baseReels, techniqueFilter, notInterested]);

  const availableTechniques = useMemo(() => {
    const set = new Set(baseReels.map((r) => r.technique));
    return Array.from(set).sort();
  }, [baseReels]);

  const activeReel = reels[activeIndex];

  // Load more API posts when nearing the end of the feed
  useEffect(() => {
    if (!hasMoreApiPosts || feedTab !== "foryou") return;
    if (activeIndex < reels.length - 5) return;
    const defaultMusicId = ALL_REELS[0]?.musicTrackId ?? "track-ambient-1";
    fetch(`/api/feed?limit=20&offset=${apiPostOffset}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!data?.posts?.length) { setHasMoreApiPosts(false); return; }
        const more: Reel[] = data.posts.map((p: any) => ({
          id: `db-${p.id}`,
          videoId: "",
          videoUrl: p.videoUrl ?? undefined,
          artistId: p.authorId ?? "unknown",
          artistName: p.authorName ?? "Artist",
          technique: p.technique ?? "Studio Craft",
          location: "",
          caption: p.caption ?? "",
          craftScore: Math.min(95, 75 + Math.floor((p.likeCount ?? 0) / 30)),
          likes: p.likeCount ?? 0,
          saves: p.saveCount ?? 0,
          thumbnail: p.thumbnailUrl ?? undefined,
          avatarUrl: p.authorAvatarUrl ?? undefined,
          musicTrackId: defaultMusicId,
          available: false,
          patronOnly: p.isPatronOnly ?? false,
          streak: (p.authorStreak ?? 0) >= 3 ? p.authorStreak : undefined,
          artistLevel: (p.authorLevel as Reel["artistLevel"]) ?? undefined,
          beforeImageUrl: p.beforeImageUrl ?? undefined,
        }));
        setUserPostReels((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const fresh = more.filter((r) => !existingIds.has(r.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        setApiPostOffset((o) => o + 20);
      })
      .catch(() => {});
  }, [activeIndex, reels.length, apiPostOffset, hasMoreApiPosts, feedTab]);

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

  // Keep activeReelRef in sync so mute effect can read it without a stale closure
  useEffect(() => { activeReelRef.current = activeReel ?? null; }, [activeReel]);

  // Music: switch track (or beat) when the active reel changes
  useEffect(() => {
    // Tear down whatever was playing before
    beatLooperRef.current?.stop();
    beatLooperRef.current = null;
    audioRef.current?.pause();

    if (!activeReel || !musicUnlocked) return;

    const tid = activeReel.musicTrackId ?? "";

    if (tid.startsWith("beat-")) {
      // ── Community beat: synthesise via Web Audio ──────────────────────────
      if (musicMuted) return;
      const beatId = tid.replace(/^beat-/, "");
      const beat   = getCommunityBeats().find((b) => b.id === beatId);
      if (!beat) return;
      beatLooperRef.current = createBeatLooper(beat);
      return () => {
        beatLooperRef.current?.stop();
        beatLooperRef.current = null;
      };
    }

    // ── Library track: HTML5 Audio ────────────────────────────────────────
    const track = getTrackById(tid);
    if (!track) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(track.url);
      audioRef.current.loop   = true;
      audioRef.current.volume = 0.65;
    } else {
      audioRef.current.pause();
      audioRef.current.src  = track.url;
      audioRef.current.load();
      audioRef.current.loop   = true;
      audioRef.current.volume = 0.65;
    }
    if (!musicMuted) audioRef.current.play().catch(() => {});
    return () => { audioRef.current?.pause(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, musicUnlocked, activeReel]);

  // Mute / unmute — handles both HTML5 audio and beat loopers
  useEffect(() => {
    if (!musicUnlocked) return;
    const tid = activeReelRef.current?.musicTrackId ?? "";

    if (tid.startsWith("beat-")) {
      if (musicMuted) {
        beatLooperRef.current?.stop();
        beatLooperRef.current = null;
      } else if (!beatLooperRef.current) {
        const beatId = tid.replace(/^beat-/, "");
        const beat   = getCommunityBeats().find((b) => b.id === beatId);
        if (beat) beatLooperRef.current = createBeatLooper(beat);
      }
    } else {
      if (!audioRef.current) return;
      if (musicMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [musicMuted, musicUnlocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      beatLooperRef.current?.stop();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      switch (e.key) {
        case "/":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("kiln:open-search"));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = Math.max(0, prev - 1);
            containerRef.current?.scrollTo({ top: next * (containerRef.current.clientHeight), behavior: "smooth" });
            return next;
          });
          break;
        case "ArrowDown":
        case "j":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = Math.min(reels.length - 1, prev + 1);
            containerRef.current?.scrollTo({ top: next * (containerRef.current.clientHeight), behavior: "smooth" });
            return next;
          });
          break;
        case "m":
        case "M":
          setMusicMuted((prev) => !prev);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reels.length]);

  const unlockMusic = useCallback(() => {
    // Step 1 — unlock Web Audio context (Chrome / Firefox / Android)
    try {
      const AC = (window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext);
      if (AC) { const c = new AC(); void c.resume().then(() => c.close()); }
    } catch { /* ignore */ }
    // Step 2 — iOS Safari requires a direct user-gesture play() on an HTML audio element.
    // A zero-length silent WAV satisfies that requirement and grants page-wide audio permission.
    try {
      const sil = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      void sil.play().then(() => sil.pause()).catch(() => {});
    } catch { /* ignore */ }
    // Setting state triggers the music useEffect which will start the real track now that
    // audio permission is granted — no audio created here to avoid the race condition.
    setMusicUnlocked(true);
  }, []);

  // Unlock video audio on first user interaction — scroll, touch, or tap.
  // Browsers block all audio until a gesture; this mirrors how TikTok/Reels
  // work: sound kicks in the moment you start scrolling, no button needed.
  // Music plays as soon as the user unlocks audio with their first interaction.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const unlock = () => unlockMusic();
    el.addEventListener("touchstart", unlock, { once: true, passive: true });
    el.addEventListener("pointerdown", unlock, { once: true, passive: true });
    el.addEventListener("scroll", unlock, { once: true, passive: true });
    return () => {
      el.removeEventListener("touchstart", unlock);
      el.removeEventListener("pointerdown", unlock);
      el.removeEventListener("scroll", unlock);
    };
  }, [unlockMusic]);

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
            <StreakBadge />
            <Link href="/discover" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm">
              <Search size={15} />
            </Link>
            <Link
              href={profile ? `/artists/${profile.id}` : "/setup"}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/10 text-white backdrop-blur-sm"
            >
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                : <User size={15} />
              }
            </Link>
          </div>
        </div>

        {/* Stories row */}
        <div className="pointer-events-auto border-b border-white/5">
          <Stories />
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

      {/* New posts pill — Following tab background refresh */}
      <AnimatePresence>
        {feedTab === "following" && newFollowingPostCount > 0 && (
          <motion.div
            className="pointer-events-auto absolute left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 overflow-hidden rounded-full border border-amber-500/40 bg-stone-950/90 shadow-xl shadow-black/40 backdrop-blur-md"
            style={{ top: "170px" }}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <button
              onClick={applyPendingFollowingReels}
              className="flex items-center gap-1.5 pl-3 pr-2 py-2"
            >
              <ArrowUp size={12} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-200 whitespace-nowrap">
                {newFollowingPostCount === 1 ? "1 new post" : `${newFollowingPostCount} new posts`}
              </span>
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={dismissPendingFollowingReels}
              className="flex items-center justify-center pl-2 pr-3 py-2 text-stone-500 hover:text-stone-300 transition-colors"
              aria-label="Dismiss"
            >
              <X size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scheduled posts auto-publish banner */}
      <AnimatePresence>
        {justPublishedCount > 0 && (
          <motion.div
            className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          >
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/90 backdrop-blur-sm px-5 py-2.5 shadow-lg shadow-emerald-900/40">
              <Check size={14} className="text-stone-950" />
              <span className="text-xs font-semibold text-stone-950">
                {justPublishedCount === 1 ? "1 scheduled post went live" : `${justPublishedCount} scheduled posts went live`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kiln firing banner ── */}
      <AnimatePresence>
        {followedFirings.length > 0 && !kilnBannerDismissed && (
          <motion.div
            className="pointer-events-auto fixed bottom-20 left-4 right-4 z-30 flex items-center gap-3 rounded-full border border-amber-500/30 bg-stone-950/95 px-4 py-2.5 shadow-xl backdrop-blur-sm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15">
              <Flame size={12} className="animate-pulse text-amber-400" />
            </div>
            <Link href="/kiln-status" className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-200 truncate">
                🔥 {followedFirings[0]!.artistName} is firing — {followedFirings[0]!.cone}
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">{getFiringETA(followedFirings[0]!)}</p>
            </Link>
            <button
              onClick={() => setKilnBannerDismissed(true)}
              className="shrink-0 text-stone-600 hover:text-stone-400 transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome banner for new users without a profile */}
      <AnimatePresence>
        {!profile && !welcomeDismissed && (
          <motion.div
            className="pointer-events-auto fixed bottom-20 left-4 right-4 z-30"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-stone-950/95 px-4 py-3 shadow-xl backdrop-blur-sm">
              <Flame size={20} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-100">Start your artist profile</p>
                <p className="text-[11px] text-stone-400 truncate">Free forever — no fees, no commission</p>
              </div>
              <Link
                href="/setup"
                className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                Get started
              </Link>
              <button
                onClick={() => {
                  setWelcomeDismissed(true);
                  try { localStorage.setItem("kiln_welcome_dismissed", "1"); } catch {}
                }}
                className="shrink-0 text-stone-600 hover:text-stone-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature discovery card */}
      <AnimatePresence>
        {discoveryFeature && (
          <FeatureDiscoveryCard
            feature={discoveryFeature}
            onDismiss={() => setDiscoveryFeature(null)}
          />
        )}
      </AnimatePresence>

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
              videoAudioOn={videoAudioOn}
              onToggleVideoAudio={() => setVideoAudioOn((v) => !v)}
              musicUnlocked={musicUnlocked}
              onComment={(id, name) => setCommentReel({ id, artistName: name })}
              onNotInterested={() => handleNotInterested(reel.id)}
              onMoreLikeThis={() => handleMoreLikeThis(reel.technique)}
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
