import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QABlock from "@/components/QABlock";
import { useParams, Link, useLocation } from "wouter";
import {
  ChevronLeft, ExternalLink, Heart, Bookmark, Share2, Ban, BellOff, Bell, MoreHorizontal,
  Play, Flame, MapPin, Grid3x3, Video, ShoppingBag,
  BookOpen, X, Plus, CheckCircle, Clock, Lock, Hammer,
  Heart as HeartIcon, BarChart2, MessageSquare, Zap, Check,
  Users, MessageCircle, Radio, Image, Star, Crown, Printer, CalendarDays, Award,
} from "lucide-react";
import { ALL_ACHIEVEMENTS, SEED_UNLOCKED, RARITY_COLORS, getXpLevel } from "@/data/achievements";
import { getArtistCV, EXHIBITION_TYPE_LABELS, EXHIBITION_TYPE_COLORS } from "@/data/exhibitions";
import Nav from "@/components/Nav";
import { getArtistById, artists, type Artist } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { getListingsByArtist, formatPrice } from "@/data/listings";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial, CommissionStatus, type ShopReview } from "@/contexts/SocialContext";
import { getWorkshopsByArtist } from "@/data/workshops";
import { getDropsByArtist, getTimeUntilDrop, type Drop } from "@/data/drops";
import CommissionModal from "@/components/CommissionModal";
import TipModal from "@/components/TipModal";
import DropModal from "@/components/DropModal";

function findArtist(id: string): Artist | undefined {
  return getArtistById(id) ?? seedArtists.find((a) => a.id === id);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function craftScore(id: string): number { return 78 + (hash(id) % 20); }

function getStats(id: string) {
  const h = hash(id);
  return { followers: 3000 + (h % 47000), following: 80 + (h % 400) };
}

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bg: string; Icon: typeof CheckCircle }> = {
  open: { label: "Open for commissions", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle },
  waitlisted: { label: "Waitlisted", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", Icon: Clock },
  closed: { label: "Closed", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", Icon: Lock },
};

// ─── Grid item ────────────────────────────────────────────────────────────────

interface GridItem {
  id: string;
  imageUrl: string;
  caption: string;
  isVideo: boolean;
  videoId?: string;
  isProcess: boolean;
}

function buildGrid(artist: Artist): GridItem[] {
  const items: GridItem[] = [];
  for (const v of artist.videos) {
    items.push({ id: `v-${v.id}`, imageUrl: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`, caption: v.title, isVideo: true, videoId: v.id, isProcess: true });
  }
  for (const img of artist.images) {
    items.push({ id: `img-${img.url.slice(-16)}`, imageUrl: img.url, caption: img.caption, isVideo: false, isProcess: false });
  }
  return items;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ item, onClose }: { item: GridItem; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <X size={15} />
        </button>
        {item.isVideo && item.videoId ? (
          <div className="aspect-video overflow-hidden rounded-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`}
              className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-stone-900">
            <img src={item.imageUrl} alt={item.caption} className="max-h-[75vh] w-full object-contain" />
          </div>
        )}
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-sm text-stone-300 line-clamp-2 flex-1">{item.caption}</p>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <button className="text-stone-400 hover:text-red-400 transition-colors"><Heart size={18} /></button>
            <button className="text-stone-400 hover:text-amber-400 transition-colors"><Bookmark size={18} /></button>
            <button className="text-stone-400 hover:text-stone-200 transition-colors"><Share2 size={18} /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Commission Status Selector (own profile) ─────────────────────────────────

function CommissionStatusSelector() {
  const { myCommissionStatus, setMyCommissionStatus } = useSocial();
  const statuses: CommissionStatus[] = ["open", "waitlisted", "closed"];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500">Commission:</span>
      <div className="flex gap-1">
        {statuses.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const active = myCommissionStatus === s;
          return (
            <button
              key={s}
              onClick={() => setMyCommissionStatus(s)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                active ? `${cfg.bg} ${cfg.color}` : "border-stone-700 text-stone-500 hover:border-stone-500"
              }`}
            >
              <cfg.Icon size={10} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type Tab = "posts" | "process" | "portfolio" | "shop" | "workshops" | "drops" | "bio" | "cv" | "sold";

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { isFollowing, followArtist, unfollowArtist, getArtistCommissionStatus, isVerified, isSubscribed, subscribe, unsubscribe, sendDirectMessage, blockArtist, unblockArtist, isBlocked, muteArtist, unmuteArtist, isMuted, hasArtistAlert, toggleArtistAlert } = useSocial();

  const artist = findArtist(id ?? "");
  const isOwn = profile?.id === id;

  const [tab, setTab] = useState<Tab>("posts");
  const [lightbox, setLightbox] = useState<GridItem | null>(null);
  const [showCommission, setShowCommission] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitSlot, setVisitSlot] = useState("Morning (10am–12pm)");
  const [visitNote, setVisitNote] = useState("");
  const [visitRequested, setVisitRequested] = useState(false);

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="text-stone-400 mb-4">Artist not found.</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">← Back to Discover</Link>
        </div>
      </div>
    );
  }

  const allGridItems = buildGrid(artist);
  const processItems = allGridItems.filter((g) => g.isVideo);
  const artworkItems = allGridItems.filter((g) => !g.isVideo);
  const listings = getListingsByArtist(artist.id);
  const workshops = getWorkshopsByArtist(artist.id);
  const drops = getDropsByArtist(artist.id);
  const stats = getStats(artist.id);
  const score = craftScore(artist.id);
  const following = isFollowing(artist.id);
  const verified = isVerified(artist.id);
  const subscribed = isSubscribed(artist.id);
  const commissionStatus = getArtistCommissionStatus(artist.id);

  const statusCfg = STATUS_CONFIG[commissionStatus];

  function handleShare() {
    const url = window.location.href;
    const name = artist!.name;
    if (navigator.share) {
      navigator.share({ title: name, text: `${name} on Kiln`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch(() => {});
    }
  }

  // When viewing own profile, overlay any custom edits from ProfileContext on top of static artist data
  const displayName     = (isOwn && profile?.name)     ? profile.name     : artist.name;
  const displayBio      = (isOwn && profile?.bio)      ? profile.bio      : artist.bio;
  const displayLocation = (isOwn && profile?.location) ? profile.location : artist.location;
  const displayMedium   = (isOwn && profile?.mediums?.length) ? profile.mediums.join(", ") : artist.medium;
  const displayWebsite  = (isOwn && profile?.website !== undefined) ? profile.website : artist.website;
  const displayInstagram = (isOwn && profile?.instagram !== undefined) ? profile.instagram : (artist.instagram ?? "");

  const coverImg = (isOwn && profile?.coverUrl)
    ? profile.coverUrl
    : (artist.images[0]?.url ?? (artist.videos[0] ? `https://img.youtube.com/vi/${artist.videos[0].id}/hqdefault.jpg` : ""));

  const avatarImg = (isOwn && profile?.avatarUrl)
    ? profile.avatarUrl
    : (artist.images[0]?.url ?? `https://picsum.photos/seed/${artist.id}/200/200`);

  const tabItems = tab === "posts" ? allGridItems : tab === "process" ? processItems : [];

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />

      {/* Cover strip */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-900">
        {coverImg && (
          <img src={coverImg} alt="" className="h-full w-full object-cover opacity-60"
            style={{ filter: "blur(2px)", transform: "scale(1.06)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#12100e]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12100e]/40 to-transparent" />
        <Link
          href="/"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={16} />
        </Link>
      </div>

      {/* Profile section */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative -mt-12 flex items-end gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[#12100e] bg-stone-800 shadow-xl">
            {avatarImg ? (
              <img src={avatarImg} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-serif text-stone-500">
                {artist.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-2 pb-1 flex-wrap justify-end">
            {isOwn ? (
              <>
                <Link href="/analytics" className="flex items-center gap-1.5 rounded-full border border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors">
                  <BarChart2 size={13} /> Analytics
                </Link>
                <Link href="/create" className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                  <Plus size={14} /> Post
                </Link>
                <Link href="/edit-profile" className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-stone-300 hover:border-amber-400/40 transition-colors">
                  Edit Profile
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (following) {
                      unfollowArtist(artist.id);
                    } else {
                      followArtist(artist.id, artist.name, avatarImg);
                    }
                  }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    following
                      ? "border border-white/15 bg-transparent text-stone-300 hover:border-red-400/40 hover:text-red-400"
                      : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                  }`}
                >
                  {following ? "Following" : "Follow"}
                </button>
                <button
                  onClick={() => setShowTip(true)}
                  className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <HeartIcon size={12} fill="currentColor" /> Support
                </button>
                <button
                  onClick={() => navigate(`/subscribe/${artist.id}`)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    subscribed
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                      : "border-stone-600 text-stone-400 hover:border-purple-500/40 hover:text-purple-400"
                  }`}
                >
                  <Users size={11} /> {subscribed ? "Supporting" : "Support"}
                </button>
                <button
                  onClick={() => { sendDirectMessage(artist.id, artist.name, avatarImg, "Hey! Love your work."); navigate("/messages"); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-stone-400 hover:border-blue-400/40 hover:text-blue-400 transition-colors"
                  title="Send message"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={() => toggleArtistAlert(artist.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${hasArtistAlert(artist.id) ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-white/15 text-stone-400 hover:border-amber-400/40 hover:text-amber-400"}`}
                  title={hasArtistAlert(artist.id) ? "Turn off new-post alerts" : "Get alerts for new posts"}
                >
                  {hasArtistAlert(artist.id) ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <button
                  onClick={handleShare}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-stone-400 hover:border-white/30 transition-colors"
                  title={shareCopied ? "Copied!" : "Share profile"}
                >
                  {shareCopied ? <Check size={13} className="text-green-400" /> : <Share2 size={14} />}
                </button>
                {!isOwn && (
                  <div className="relative">
                    <button
                      onClick={() => setShowOverflow((v) => !v)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-stone-400 hover:border-white/30 transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {showOverflow && (
                      <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-white/10 bg-stone-900 shadow-xl overflow-hidden">
                        <button
                          onClick={() => { isMuted(artist.id) ? unmuteArtist(artist.id) : muteArtist(artist.id); setShowOverflow(false); }}
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-stone-300 hover:bg-white/5 transition-colors"
                        >
                          <BellOff size={13} className="text-stone-500" />
                          {isMuted(artist.id) ? "Unmute" : "Mute"} posts
                        </button>
                        <div className="h-px bg-white/8" />
                        <button
                          onClick={() => { isBlocked(artist.id) ? unblockArtist(artist.id) : blockArtist(artist.id); setShowOverflow(false); }}
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Ban size={13} />
                          {isBlocked(artist.id) ? "Unblock" : "Block"} artist
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Name + handle + commission status */}
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-amber-100">{displayName}</h1>
            {verified && (
              <span title="Verified studio" className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shrink-0">
                <Check size={11} className="text-white" />
              </span>
            )}
            <div className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5">
              <Flame size={11} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{score}</span>
            </div>
          </div>
          <p className="text-sm text-stone-500">@{artist.id}</p>

          {isOwn ? (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <CommissionStatusSelector />
              <Link href={`/live/${artist.id}`}>
                <button className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors">
                  <Radio size={11} className="animate-pulse" /> Go Live
                </button>
              </Link>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                <statusCfg.Icon size={11} />
                {statusCfg.label}
              </span>
              {commissionStatus !== "closed" && (
                <Link href={`/commission/${artist.id}`}>
                  <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 border border-stone-600 text-xs font-medium text-stone-200 hover:border-amber-500/40 hover:text-amber-300 transition-colors">
                    <Hammer size={11} /> Request commission
                  </button>
                </Link>
              )}
              <Link href={`/artists/${artist.id}/rates`}>
                <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-700 text-xs text-stone-500 hover:border-stone-500 hover:text-stone-300 transition-colors">
                  View rates
                </button>
              </Link>
              <button
                onClick={() => setShowVisitModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-700 text-xs text-stone-500 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
              >
                <CalendarDays size={11} /> Book studio visit
              </button>
            </div>
          )}
        </div>

        {/* Bio */}
        <p className="mt-2 text-sm text-stone-400 leading-relaxed max-w-xl">
          {displayBio.length > 220 ? displayBio.slice(0, 220) + "…" : displayBio}
        </p>

        {/* Location + medium */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
          <span className="flex items-center gap-1"><MapPin size={11} /> {displayLocation}</span>
          <span>{displayMedium}</span>
          {displayWebsite && (
            <a href={displayWebsite} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-amber-600 hover:text-amber-400 transition-colors"
            >
              <ExternalLink size={10} /> Website
            </a>
          )}
          {displayInstagram && (
            <a href={`https://instagram.com/${displayInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-pink-500/70 hover:text-pink-400 transition-colors"
            >
              @{displayInstagram.replace("@", "")}
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6 border-t border-white/8 pt-4">
          <div className="text-center">
            <p className="font-bold text-white">{allGridItems.length}</p>
            <p className="text-xs text-stone-500">posts</p>
          </div>
          <Link href={`/artists/${artist.id}/followers`} className="text-center hover:opacity-80 transition-opacity">
            <p className="font-bold text-white">{stats.followers.toLocaleString()}</p>
            <p className="text-xs text-stone-500">followers</p>
          </Link>
          <Link href={`/artists/${artist.id}/following`} className="text-center hover:opacity-80 transition-opacity">
            <p className="font-bold text-white">{stats.following}</p>
            <p className="text-xs text-stone-500">following</p>
          </Link>
          {workshops.length > 0 && (
            <div className="text-center">
              <p className="font-bold text-white">{workshops.length}</p>
              <p className="text-xs text-stone-500">workshops</p>
            </div>
          )}
        </div>

        {/* Story highlights (series) */}
        {artist.series.length > 0 && (
          <div className="mt-5 overflow-x-auto pb-1">
            <div className="flex gap-4" style={{ width: "max-content" }}>
              {artist.series.map((s) => (
                <div key={s.name} className="flex flex-col items-center gap-1.5 w-16">
                  <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-amber-500/50 bg-stone-800 p-0.5">
                    <div className="h-full w-full overflow-hidden rounded-full bg-stone-700">
                      {coverImg && <img src={coverImg} alt={s.name} className="h-full w-full object-cover opacity-80" />}
                    </div>
                  </div>
                  <p className="line-clamp-1 text-center text-[10px] text-stone-400">{s.name.split(" ")[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="mt-5 flex border-b border-white/10">
          {(
            [
              { key: "posts", icon: Grid3x3, label: "Posts" },
              { key: "process", icon: Video, label: "Process" },
              { key: "portfolio", icon: Image, label: "Portfolio" },
              { key: "shop", icon: ShoppingBag, label: "Shop" },
              ...(workshops.length > 0 ? [{ key: "workshops", icon: Hammer, label: "Workshops" }] : []),
              ...(drops.length > 0 ? [{ key: "drops", icon: Zap, label: "Drops" }] : []),
              { key: "sold", icon: CheckCircle, label: "Sold" },
              { key: "bio", icon: BookOpen, label: "Bio" },
              { key: "cv", icon: Award, label: "CV" },
            ] as { key: Tab; icon: React.ElementType; label: string }[]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === key ? "border-amber-400 text-amber-300" : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="py-4">
          {/* Posts / Process grid */}
          {(tab === "posts" || tab === "process") && (
            <>
              {tabItems.length === 0 ? (
                <div className="py-16 text-center text-stone-600 text-sm">
                  {tab === "process" ? "No process videos yet." : "No posts yet."}
                  {isOwn && (
                    <div className="mt-4">
                      <Link href="/create" className="text-amber-400 hover:text-amber-300 text-sm">Share your first process →</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5">
                  {tabItems.map((item) => {
                    const thumb = (
                      <div className="group relative aspect-square overflow-hidden bg-stone-900">
                        <img
                          src={item.imageUrl} alt={item.caption}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30 flex items-center justify-center">
                          {item.isVideo && <Play size={20} fill="white" className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />}
                        </div>
                        {item.isVideo && <div className="absolute right-1.5 top-1.5"><Video size={11} className="text-white drop-shadow" /></div>}
                      </div>
                    );
                    if (item.isVideo && item.videoId) {
                      return (
                        <Link key={item.id} href={`/posts/${artist.id}-${item.videoId}`} className="block">
                          {thumb}
                        </Link>
                      );
                    }
                    return (
                      <button key={item.id} onClick={() => setLightbox(item)} className="block w-full text-left">
                        {thumb}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Portfolio */}
          {tab === "portfolio" && (
            <div>
              <p className="mb-4 text-sm text-stone-500 leading-relaxed">
                Selected works — the pieces {artist.name.split(" ")[0]} considers most representative of their practice.
              </p>
              {artist.images.length === 0 && artist.videos.length === 0 ? (
                <div className="py-16 text-center text-stone-600 text-sm">No portfolio pieces yet.</div>
              ) : (
                <div className="columns-2 gap-2 sm:columns-3">
                  {[
                    ...artist.images.map((img, i) => ({ key: `img-${i}`, src: img.url, caption: img.caption ?? artist.medium, isVideo: false })),
                    ...artist.videos.slice(0, 6).map((v, i) => ({
                      key: `vid-${i}`,
                      src: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
                      caption: v.title,
                      isVideo: true,
                    })),
                    // Pad with picsum for visual richness
                    ...Array.from({ length: Math.max(0, 9 - artist.images.length - Math.min(artist.videos.length, 6)) }, (_, i) => ({
                      key: `gen-${i}`,
                      src: `https://picsum.photos/seed/${artist.id}-portfolio-${i}/600/${400 + i * 60}`,
                      caption: artist.medium,
                      isVideo: false,
                    })),
                  ].map((item) => (
                    <div key={item.key} className="mb-2 break-inside-avoid overflow-hidden rounded-xl border border-white/8 bg-stone-900/60 group relative">
                      <img
                        src={item.src}
                        alt={item.caption}
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}${item.key}/600/400`; }}
                      />
                      {item.isVideo && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60">
                          <Play size={11} fill="white" className="text-white" />
                        </div>
                      )}
                      <div className="px-2.5 py-2">
                        <p className="text-[11px] text-stone-500 truncate">{item.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reviews section */}
              <div className="mt-8 border-t border-white/8 pt-6">
                <h3 className="mb-4 font-serif text-lg text-amber-100">Collector Reviews</h3>
                <ReviewSection artistId={artist.id} />
              </div>
            </div>
          )}

          {/* Shop */}
          {tab === "shop" && (
            <div>
              {listings.length === 0 ? (
                <div className="py-16 text-center text-stone-600 text-sm">No works available in the shop.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {listings.map((l) => (
                    <div key={l.id} className="group overflow-hidden rounded-xl border border-white/8 bg-stone-900/60">
                      <div className="aspect-square overflow-hidden">
                        <img src={l.imageUrl ?? undefined} alt={l.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-stone-200 text-sm line-clamp-1">{l.title}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{l.medium}</p>
                        <p className="mt-2 font-bold text-amber-400">{formatPrice(l.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Workshops */}
          {tab === "workshops" && (
            <div className="space-y-4">
              {workshops.map((w) => (
                <div key={w.id} className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden flex gap-4 p-4">
                  <img src={w.imageUrl} alt={w.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-stone-200 text-sm leading-snug">{w.title}</p>
                      <span className="text-sm font-bold text-amber-400 shrink-0">${w.price}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{w.startDate} · {w.location}</p>
                    <p className="text-xs text-stone-500">{w.duration} · {w.level}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-stone-400">{w.spotsLeft > 0 ? `${w.spotsLeft} spots left` : "Sold out"}</span>
                      <button
                        onClick={() => setShowCommission(true)}
                        className="text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/workshops" className="block text-center text-xs text-amber-400 hover:text-amber-300 py-2">
                Browse all workshops →
              </Link>
            </div>
          )}

          {/* Drops */}
          {tab === "drops" && (
            <div className="space-y-4">
              {drops.length === 0 ? (
                <div className="py-16 text-center text-stone-600 text-sm">No drops yet.</div>
              ) : (
                drops.map((drop) => (
                  <div
                    key={drop.id}
                    onClick={() => drop.status !== "sold" && setSelectedDrop(drop)}
                    className={`rounded-2xl border border-white/10 bg-stone-900/60 overflow-hidden ${drop.status !== "sold" ? "cursor-pointer hover:border-amber-500/30" : "opacity-60"} transition-all`}
                  >
                    <div className="flex gap-4 p-4">
                      <img src={drop.imageUrl} alt={drop.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-amber-100">{drop.title}</p>
                          {drop.status === "live" && (
                            <span className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Live
                            </span>
                          )}
                          {drop.status === "upcoming" && (
                            <span className="text-xs text-amber-300 font-medium shrink-0">{getTimeUntilDrop(drop.dropDate)}</span>
                          )}
                          {drop.status === "sold" && (
                            <span className="text-xs text-stone-500 shrink-0">Sold out</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mb-2">{drop.technique}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-amber-300">${drop.price.toLocaleString()}</p>
                          <p className="text-xs text-stone-500">{drop.spotsTotal === 1 ? "Unique" : `${drop.spotsLeft}/${drop.spotsTotal} left`}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sold Works / Provenance */}
          {tab === "sold" && (
            <div className="space-y-4">
              <div className="mb-2">
                <p className="text-xs text-stone-500 leading-relaxed">
                  Sold works by {artist.name.split(" ")[0]} — each piece with provenance and acquisition detail.
                </p>
              </div>
              {(() => {
                const sold = [
                  ...artist.images.slice(0, 3).map((img, i) => ({
                    id: `sold-${i}`,
                    title: img.caption ?? `${artist.medium} Study No. ${i + 1}`,
                    imageUrl: img.url,
                    collectorRegion: ["New York, NY", "London, UK", "Tokyo, JP", "Los Angeles, CA", "Chicago, IL"][i % 5]!,
                    soldDate: ["Jan 2024", "Mar 2024", "Sep 2023", "Nov 2023", "Apr 2024"][i % 5]!,
                    salePrice: [3200, 5800, 4100, 7600, 2900][i % 5]!,
                  })),
                  ...Array.from({ length: Math.max(0, 4 - artist.images.length) }, (_, i) => ({
                    id: `sold-gen-${i}`,
                    title: `${artist.medium} Piece, ${2022 + i}`,
                    imageUrl: `https://picsum.photos/seed/${artist.id}-sold-${i}/600/400`,
                    collectorRegion: ["San Francisco, CA", "Miami, FL", "Seattle, WA", "Boston, MA"][i % 4]!,
                    soldDate: ["Feb 2024", "Jun 2023", "Oct 2023", "Dec 2023"][i % 4]!,
                    salePrice: [4500, 6200, 3800, 5100][i % 4]!,
                  })),
                ];
                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {sold.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden group">
                        <div className="aspect-[4/3] overflow-hidden relative">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 brightness-75"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/600/400`; }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="rounded-full border border-white/30 bg-black/50 px-4 py-1.5 text-xs font-bold tracking-widest text-white/80 uppercase">Sold</span>
                          </div>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <p className="font-medium text-stone-200 text-sm line-clamp-1">{item.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-500">{item.collectorRegion}</span>
                            <span className="text-xs font-bold text-amber-400">${item.salePrice.toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-stone-700">Acquired {item.soldDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="rounded-xl bg-stone-900/40 border border-white/5 p-4 text-center">
                <p className="text-xs text-stone-600">Provenance records are maintained by Kiln for all verified sales.</p>
              </div>
            </div>
          )}

          {/* Bio */}
          {tab === "bio" && (
            <div className="max-w-2xl space-y-6 py-2">
              <div>
                <h3 className="mb-2 font-serif text-lg text-amber-100">About</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{displayBio}</p>
              </div>

              {artist.artistStatement && (
                <div>
                  <h3 className="mb-2 font-serif text-lg text-amber-100">Artist Statement</h3>
                  <blockquote className="border-l-2 border-amber-500/40 pl-4 italic text-sm text-stone-400 leading-relaxed">
                    {artist.artistStatement}
                  </blockquote>
                </div>
              )}

              {!isOwn && (
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setShowCommission(true)}
                    className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-sm text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    <Hammer size={14} /> Request commission
                  </button>
                  <button
                    onClick={() => setShowTip(true)}
                    className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-5 py-2 text-sm text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <HeartIcon size={14} fill="currentColor" /> Support
                  </button>
                  <Link href={`/artists/${artist.id}/patron`}
                    className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-400 hover:bg-purple-500/20 transition-colors"
                  >
                    <Crown size={14} /> Become a Patron
                  </Link>
                </div>
              )}
              {isOwn && (
                <div className="flex gap-3 flex-wrap">
                  <Link href={`/artists/${artist.id}/press-kit`}
                    className="flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm text-stone-400 hover:text-stone-200 hover:border-white/20 transition-colors"
                  >
                    <Printer size={14} /> Press Kit
                  </Link>
                </div>
              )}

              {artist.series.length > 0 && (
                <div>
                  <h3 className="mb-3 font-serif text-lg text-amber-100">Series</h3>
                  <div className="space-y-3">
                    {artist.series.map((s) => (
                      <div key={s.name} className="rounded-xl border border-white/8 bg-stone-900/40 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-stone-200">{s.name}</p>
                          <span className="text-xs text-stone-600">{s.years}</span>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {(() => {
                const unlocked = SEED_UNLOCKED;
                const earned = ALL_ACHIEVEMENTS.filter(a => unlocked.includes(a.id));
                const totalXp = earned.reduce((s, a) => s + a.xp, 0);
                const { level, title: lvTitle } = getXpLevel(totalXp);
                if (earned.length === 0) return null;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-serif text-lg text-amber-100">Achievements</h3>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-amber-400 font-bold">Lv.{level} {lvTitle}</span>
                        <span>{totalXp.toLocaleString()} XP</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {earned.map(a => (
                        <div key={a.id} title={`${a.title}: ${a.description}`}
                          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-default ${RARITY_COLORS[a.rarity]}`}>
                          <span>{a.emoji}</span>
                          <span className="font-medium">{a.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {artist.collections.length > 0 && (
                <div>
                  <h3 className="mb-2 font-serif text-lg text-amber-100">Collections</h3>
                  <ul className="space-y-1">
                    {artist.collections.map((c) => (
                      <li key={c} className="text-sm text-stone-400 flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500/60" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                {artist.website && (
                  <a href={artist.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-sm text-stone-300 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
                  >
                    <ExternalLink size={13} /> Website
                  </a>
                )}
                <a href={artist.habatat} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-sm text-stone-300 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
                >
                  <ExternalLink size={13} /> Habatat Gallery
                </a>
              </div>
            </div>
          )}

          {/* CV / Exhibition history */}
          {tab === "cv" && (() => {
            const cv = getArtistCV(artist.id);
            return (
              <div className="max-w-2xl space-y-8 py-2">
                {/* Education */}
                <div>
                  <h3 className="mb-3 font-serif text-lg text-amber-100">Education</h3>
                  <div className="space-y-2">
                    {cv.education.map((e, i) => (
                      <div key={i} className="flex gap-4 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3">
                        <span className="shrink-0 text-xs font-mono text-stone-600 w-20 pt-0.5">{e.year}</span>
                        <div>
                          <p className="text-sm font-medium text-stone-200">{e.degree}</p>
                          <p className="text-xs text-stone-500">{e.institution}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exhibitions */}
                <div>
                  <h3 className="mb-3 font-serif text-lg text-amber-100">Exhibitions & Fairs</h3>
                  <div className="space-y-2">
                    {cv.exhibitions.map((ex, i) => (
                      <div key={i} className="flex gap-4 items-start rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3">
                        <span className="shrink-0 text-xs font-mono text-stone-600 w-10 pt-0.5">{ex.year}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-semibold text-stone-200">{ex.title}</p>
                            <span className={`rounded-full border px-1.5 py-0 text-[10px] font-medium ${EXHIBITION_TYPE_COLORS[ex.type]}`}>
                              {EXHIBITION_TYPE_LABELS[ex.type]}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500">{ex.venue} · {ex.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Awards */}
                {cv.awards.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-serif text-lg text-amber-100">Awards & Grants</h3>
                    <div className="space-y-2">
                      {cv.awards.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3">
                          <Award size={14} className="text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-stone-300">{a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collections */}
                {cv.collections.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-serif text-lg text-amber-100">Public Collections</h3>
                    <div className="space-y-1.5">
                      {cv.collections.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-1">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500/60" />
                          <p className="text-sm text-stone-400">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Publications */}
                {cv.publications.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-serif text-lg text-amber-100">Publications</h3>
                    <div className="space-y-1.5">
                      {cv.publications.map((p, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-1">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-600" />
                          <p className="text-sm text-stone-400">{p}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Q&A / AMA Section */}
        <div className="mt-6 border-t border-white/8 pt-6">
          <QABlock artistId={artist.id} artistName={artist.name.split(" ")[0]} isOwner={isOwn} />
        </div>
      </div>

      {/* Similar Artists */}
      {(() => {
        const ALL_FOR_SIMILAR = [...artists, ...seedArtists];
        const currentMediums = artist.medium.toLowerCase().split(/[,/]/).map((m: string) => m.trim());
        const similar = ALL_FOR_SIMILAR
          .filter((a) => a.id !== artist.id)
          .map((a) => {
            const aMediums = a.medium.toLowerCase().split(/[,/]/).map((m: string) => m.trim());
            const overlap = aMediums.filter((m: string) => currentMediums.some((cm: string) => cm.includes(m) || m.includes(cm))).length;
            return { artist: a, score: overlap };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((x) => x.artist);
        if (similar.length === 0) return null;
        return (
          <div className="bg-[#12100e] border-t border-white/5 px-4 py-6 pb-28">
            <div className="mx-auto max-w-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-3">Similar artists</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                {similar.map((a) => {
                  const avatar = a.images?.[0]?.url ?? `https://picsum.photos/seed/${a.id}/160/160`;
                  const followed = isFollowing(a.id);
                  return (
                    <div key={a.id} className="shrink-0 w-32 flex flex-col items-center gap-1.5">
                      <Link href={`/artists/${a.id}`}>
                        <img
                          src={avatar}
                          alt={a.name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-white/10 hover:border-amber-500/40 transition-colors"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${a.id}/160/160`; }}
                        />
                      </Link>
                      <Link href={`/artists/${a.id}`}>
                        <p className="text-xs font-medium text-stone-300 text-center line-clamp-1 hover:text-amber-300 transition-colors">{a.name}</p>
                      </Link>
                      <p className="text-[10px] text-stone-600 text-center line-clamp-1">{a.medium.split(",")[0]}</p>
                      <button
                        onClick={() => followed ? unfollowArtist(a.id) : followArtist(a.id, a.name, avatar)}
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors ${
                          followed
                            ? "border-stone-700 text-stone-500 hover:border-rose-500/40 hover:text-rose-400"
                            : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                        }`}
                      >
                        {followed ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>

      {/* Studio visit booking modal */}
      <AnimatePresence>
        {showVisitModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowVisitModal(false); setVisitRequested(false); }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-700 p-6 space-y-4"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {visitRequested ? (
                <div className="text-center py-4 space-y-3">
                  <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-amber-500/15">
                    <CheckCircle size={28} className="text-amber-400" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-amber-100">Request sent!</h3>
                  <p className="text-sm text-stone-400">{artist.name} will confirm your studio visit for {visitDate || "your selected date"}.</p>
                  <button
                    onClick={() => { setShowVisitModal(false); setVisitRequested(false); }}
                    className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-amber-100">Book Studio Visit</h3>
                    <button onClick={() => setShowVisitModal(false)} className="text-stone-500 hover:text-stone-300">
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-stone-400">
                    Request an in-person visit to {artist.name}'s studio. Visits are by appointment and coordinated directly with the artist.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-stone-400 uppercase tracking-wider mb-1.5 block">Preferred date</label>
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full rounded-xl bg-stone-800 border border-stone-600 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-stone-400 uppercase tracking-wider mb-1.5 block">Time slot</label>
                      <select
                        value={visitSlot}
                        onChange={(e) => setVisitSlot(e.target.value)}
                        className="w-full rounded-xl bg-stone-800 border border-stone-600 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60"
                        style={{ background: "hsl(20 8% 12%)" }}
                      >
                        {["Morning (10am–12pm)", "Afternoon (1pm–4pm)", "Evening (5pm–7pm)"].map((s) => (
                          <option key={s} value={s} style={{ background: "hsl(20 8% 12%)" }}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-400 uppercase tracking-wider mb-1.5 block">Message (optional)</label>
                      <textarea
                        value={visitNote}
                        onChange={(e) => setVisitNote(e.target.value)}
                        placeholder="Tell the artist what you're hoping to see or discuss…"
                        rows={3}
                        className="w-full rounded-xl bg-stone-800 border border-stone-600 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60 resize-none"
                      />
                    </div>
                  </div>
                  <button
                    disabled={!visitDate}
                    onClick={() => setVisitRequested(true)}
                    className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Send visit request
                  </button>
                  <p className="text-[11px] text-stone-600 text-center">All arrangements are made directly with the artist.</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commission modal */}
      {showCommission && (
        <CommissionModal
          artistId={artist.id}
          artistName={artist.name}
          artistAvatarUrl={avatarImg}
          commissionStatus={commissionStatus}
          onClose={() => setShowCommission(false)}
        />
      )}

      {/* Tip modal */}
      {showTip && (
        <TipModal
          artistId={artist.id}
          artistName={artist.name}
          artistAvatarUrl={avatarImg}
          onClose={() => setShowTip(false)}
        />
      )}

      {/* Drop modal */}
      {selectedDrop && (
        <DropModal drop={selectedDrop} onClose={() => setSelectedDrop(null)} />
      )}
    </div>
  );
}

// ─── Review Section ────────────────────────────────────────────────────────────

const SEED_REVIEWS: Record<string, ShopReview[]> = {};

function ReviewSection({ artistId }: { artistId: string }) {
  const { getReviews, addReview } = useSocial();
  const { profile } = useProfile();
  const contextReviews = getReviews(artistId);
  const seedRevs = SEED_REVIEWS[artistId] ?? [
    { id: `seed-r1-${artistId}`, listingId: artistId, fromName: "Margaret T.", fromAvatarUrl: `https://picsum.photos/seed/${artistId}-r1/60/60`, rating: 5, text: "Absolutely stunning work. The piece arrived beautifully packed and exceeded every expectation. I've already commissioned a second piece.", createdAt: "2026-03-18" },
    { id: `seed-r2-${artistId}`, listingId: artistId, fromName: "James K.", fromAvatarUrl: `https://picsum.photos/seed/${artistId}-r2/60/60`, rating: 5, text: "Working with this artist was a pleasure from start to finish. Clear communication, exquisite craftsmanship, and delivered on time.", createdAt: "2026-01-22" },
    { id: `seed-r3-${artistId}`, listingId: artistId, fromName: "Priya M.", fromAvatarUrl: `https://picsum.photos/seed/${artistId}-r3/60/60`, rating: 4, text: "The technique is extraordinary — you can see the years of practice in every detail. Highly recommend.", createdAt: "2025-12-05" },
  ];

  const allReviews = [...contextReviews, ...seedRevs];
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, text: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!form.text.trim()) return;
    addReview({
      listingId: artistId,
      fromName: profile?.name ?? "Anonymous",
      fromAvatarUrl: `https://picsum.photos/seed/${profile?.id ?? "anon"}/60/60`,
      rating: form.rating,
      text: form.text,
    });
    setSubmitted(true);
    setShowForm(false);
    setForm({ rating: 5, text: "" });
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 mb-5">
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-100">{avgRating.toFixed(1)}</p>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} className={i < Math.round(avgRating) ? "text-amber-400" : "text-stone-700"} fill="currentColor" />
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-1">{allReviews.length} reviews</p>
        </div>
        {profile && !submitted && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="ml-auto rounded-full border border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            {showForm ? "Cancel" : "+ Write a review"}
          </button>
        )}
        {submitted && (
          <p className="ml-auto text-xs text-emerald-400">Review submitted — thank you!</p>
        )}
      </div>

      {/* Write review form */}
      {showForm && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 mb-4">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Your Review</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setForm((f) => ({ ...f, rating: i + 1 }))}>
                <Star size={20} className={i < form.rating ? "text-amber-400" : "text-stone-700"} fill="currentColor" />
              </button>
            ))}
          </div>
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            rows={3}
            placeholder="Describe your experience with this artist's work…"
            className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
          />
          <button
            disabled={!form.text.trim()}
            onClick={handleSubmit}
            className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Submit Review
          </button>
        </div>
      )}

      {/* Review cards */}
      {allReviews.map((r, i) => (
        <div key={i} className="rounded-xl border border-white/8 bg-stone-900/40 p-4">
          <div className="flex items-start gap-3">
            <img src={r.fromAvatarUrl} alt={r.fromName} className="h-8 w-8 rounded-full object-cover border border-white/10" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${i}/60/60`; }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-200">{r.fromName}</span>
                <span className="text-[11px] text-stone-600">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={10} className={j < r.rating ? "text-amber-400" : "text-stone-700"} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">{r.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
