import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, Heart, Bookmark, Share2, MessageCircle,
  CheckCircle, Clock, ShoppingBag, Flame, ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import Comments from "@/components/Comments";
import { getReelById, ALL_REELS, TECHNIQUE_COLORS } from "@/data/reels";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const ALL_ARTISTS = [...artists, ...seedArtists];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

const CS_INFO: Record<string, { label: string; color: string; Icon: typeof CheckCircle }> = {
  open: { label: "Open", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle },
  waitlisted: { label: "Waitlisted", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", Icon: Clock },
  closed: { label: "Closed", color: "text-rose-400 bg-rose-500/10 border-rose-500/30", Icon: Clock },
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const {
    toggleReelLike, toggleReelSave, reelLikes, reelSaves,
    isFollowing, followArtist, unfollowArtist, getArtistCommissionStatus,
  } = useSocial();

  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const reel = getReelById(id ?? "");

  if (!reel) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <Flame size={32} className="text-stone-700" />
          <p className="text-stone-400">Post not found.</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">← Back to feed</Link>
        </div>
      </div>
    );
  }

  const liked = !!reelLikes[reel.id];
  const saved = !!reelSaves[reel.id];
  const following = isFollowing(reel.artistId);
  const commissionStatus = getArtistCommissionStatus(reel.artistId);
  const csInfo = CS_INFO[commissionStatus];
  const color = TECHNIQUE_COLORS[reel.technique] ?? "bg-amber-500";

  const artist = ALL_ARTISTS.find((a) => a.id === reel.artistId);

  const related = ALL_REELS
    .filter((r) => r.technique === reel.technique && r.id !== reel.id)
    .slice(0, 6);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1 as never)}
          className="mb-4 flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left: video + info */}
          <div>
            {/* Video embed */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${reel.videoId}?autoplay=0&rel=0&modestbranding=1`}
                title={reel.caption}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>

            {/* Post info */}
            <div className="mt-4 space-y-3">
              {/* Technique + craft score */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/tag/${encodeURIComponent(reel.technique)}`}>
                  <span className={`inline-flex items-center gap-1 rounded-full ${color} px-2.5 py-0.5 text-xs font-bold text-white`}>
                    🔥 {reel.technique}
                  </span>
                </Link>
                <span className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-amber-300">
                  <Flame size={10} className="text-amber-400" /> Craft {reel.craftScore}
                </span>
                {reel.available && (
                  <Link href="/shop">
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      <ShoppingBag size={9} /> Available
                    </span>
                  </Link>
                )}
              </div>

              {/* Caption */}
              <p className="text-base font-medium text-stone-100 leading-snug">{reel.caption}</p>

              {/* Location */}
              <p className="text-sm text-stone-500">{reel.location}</p>

              {/* Action bar */}
              <div className="flex items-center gap-4 pt-1 border-t border-white/8">
                <button
                  onClick={() => toggleReelLike(reel.id)}
                  className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-rose-400 transition-colors"
                >
                  <Heart size={18} className={liked ? "fill-rose-500 text-rose-500" : ""} />
                  <span>{fmt(reel.likes + (liked ? 1 : 0))}</span>
                </button>
                <button
                  onClick={() => setShowComments((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-amber-300 transition-colors"
                >
                  <MessageCircle size={18} />
                  <span>Comments</span>
                </button>
                <button
                  onClick={() => toggleReelSave(reel.id)}
                  className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-amber-300 transition-colors"
                >
                  <Bookmark size={18} className={saved ? "fill-amber-400 text-amber-400" : ""} />
                  <span>{fmt(reel.saves + (saved ? 1 : 0))}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-amber-300 transition-colors ml-auto"
                >
                  <Share2 size={18} />
                  <span>{copied ? "Copied!" : "Share"}</span>
                </button>
              </div>
            </div>

            {/* Comments */}
            {showComments && (
              <Comments
                postId={reel.id}
                artistName={reel.artistName}
                onClose={() => setShowComments(false)}
              />
            )}

            {/* Related posts */}
            {related.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-stone-400 mb-3 uppercase tracking-wider">More {reel.technique}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {related.map((r) => (
                    <Link key={r.id} href={`/posts/${r.id}`}>
                      <div className="group relative aspect-square overflow-hidden rounded-xl bg-stone-800 cursor-pointer">
                        <img
                          src={r.thumbnail}
                          alt={r.caption}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/300/300`; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white font-medium truncate">{r.artistName}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: artist card */}
          <div className="space-y-4">
            {/* Artist card */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Link href={`/artists/${reel.artistId}`}>
                  <img
                    src={reel.avatarUrl}
                    alt={reel.artistName}
                    className="h-14 w-14 rounded-full object-cover border-2 border-amber-500/30 hover:border-amber-400/60 transition-colors"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/artists/${reel.artistId}`}>
                    <p className="font-semibold text-amber-100 hover:text-amber-300 transition-colors truncate">{reel.artistName}</p>
                  </Link>
                  <p className="text-xs text-stone-500">{reel.location}</p>
                </div>
              </div>

              {artist?.bio && (
                <p className="text-sm text-stone-400 leading-relaxed mb-4 line-clamp-3">{artist.bio}</p>
              )}

              <div className="flex gap-2">
                {profile?.id !== reel.artistId && (
                  <button
                    onClick={() => following
                      ? unfollowArtist(reel.artistId)
                      : followArtist(reel.artistId, reel.artistName, reel.avatarUrl)
                    }
                    className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                      following
                        ? "border border-stone-600 text-stone-400 hover:border-rose-500 hover:text-rose-400"
                        : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                    }`}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                )}
                <Link
                  href={`/artists/${reel.artistId}`}
                  className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-sm text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
                >
                  <ExternalLink size={13} /> Profile
                </Link>
              </div>

              {/* Commission status */}
              <div className="mt-3 pt-3 border-t border-white/8">
                <Link href={`/artists/${reel.artistId}`}>
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${csInfo.color} hover:opacity-80 transition-opacity`}>
                    <csInfo.Icon size={11} />
                    Commissions {csInfo.label}
                  </div>
                </Link>
              </div>
            </div>

            {/* Artist's other reels */}
            {(() => {
              const artistReels = ALL_REELS.filter((r) => r.artistId === reel.artistId && r.id !== reel.id).slice(0, 4);
              if (!artistReels.length) return null;
              return (
                <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-4">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">More from {reel.artistName}</h3>
                  <div className="space-y-2">
                    {artistReels.map((r) => (
                      <Link key={r.id} href={`/posts/${r.id}`}>
                        <motion.div
                          whileHover={{ x: 2 }}
                          className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <img
                            src={r.thumbnail}
                            alt={r.caption}
                            className="h-12 w-12 rounded-lg object-cover shrink-0 bg-stone-800"
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/100/100`; }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-stone-200 truncate">{r.caption}</p>
                            <p className="text-xs text-stone-600">{fmt(r.likes)} likes</p>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
