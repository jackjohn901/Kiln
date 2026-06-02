import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, Heart, Bookmark, Share2, MessageCircle,
  CheckCircle, Clock, Flame, ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import MuxPlayer from "@mux/mux-player-react";
import Nav from "@/components/Nav";
import Comments from "@/components/Comments";
import ShareStoryModal from "@/components/ShareStoryModal";
import PollBlock, { type Poll } from "@/components/PollBlock";
import { getReelById, ALL_REELS, TECHNIQUE_COLORS } from "@/data/reels";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useMeta } from "@/hooks/useMeta";

const ALL_ARTISTS = [...artists, ...seedArtists];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

const CS_INFO: Record<string, { label: string; color: string; Icon: typeof CheckCircle }> = {
  open: { label: "Open", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle },
  waitlisted: { label: "Waitlisted", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", Icon: Clock },
  closed: { label: "Closed", color: "text-rose-400 bg-rose-500/10 border-rose-500/30", Icon: Clock },
};

interface DbPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  caption: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  technique: string | null;
  tags: string[];
  likeCount: number;
  saveCount: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

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
  const [showShare, setShowShare] = useState(false);

  const [dbPost, setDbPost] = useState<DbPost | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbLiked, setDbLiked] = useState(false);

  useMeta({
    title: dbPost?.caption ? dbPost.caption.slice(0, 80) : undefined,
    description: dbPost?.caption ?? undefined,
    image: dbPost?.thumbnailUrl ?? undefined,
  });
  const [dbSaved, setDbSaved] = useState(false);
  const [dbLikeCount, setDbLikeCount] = useState(0);
  const [dbSaveCount, setDbSaveCount] = useState(0);
  const [poll, setPoll] = useState<{ poll: Poll; pollId: string; initialVoteOptionId: string | null } | null>(null);

  const isDbPost = id ? id.startsWith("db-") : false;
  const rawPostId = isDbPost ? id!.slice(3) : id ?? "";

  useEffect(() => {
    if (!isDbPost) return;
    setDbLoading(true);
    fetch(`/api/posts/${rawPostId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        const p: DbPost = data.post;
        setDbPost(p);
        setDbLiked(p.isLiked ?? false);
        setDbSaved(p.isSaved ?? false);
        setDbLikeCount(p.likeCount ?? 0);
        setDbSaveCount(p.saveCount ?? 0);
      })
      .catch(() => setDbPost(null))
      .finally(() => setDbLoading(false));

    fetch(`/api/posts/${rawPostId}/poll`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.poll) return;
        const ap = data.poll;
        const options = (ap.options as string[]).map((text: string, i: number) => ({
          id: String(i),
          text,
          votes: (ap.voteCounts as number[])[i] ?? 0,
        }));
        setPoll({
          poll: {
            id: ap.id,
            question: ap.question,
            options,
            endsAt: ap.endsAt ?? new Date(Date.now() + 86400000 * 7).toISOString(),
          },
          pollId: ap.id,
          initialVoteOptionId: ap.userVote !== null && ap.userVote !== undefined ? String(ap.userVote) : null,
        });
      })
      .catch(() => {});
  }, [rawPostId, isDbPost]);

  async function handleDbLike() {
    const res = await fetch(`/api/posts/${rawPostId}/like`, { method: "POST", credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setDbLiked(data.liked);
      setDbLikeCount(data.likeCount);
    }
  }

  async function handleDbSave() {
    const res = await fetch(`/api/posts/${rawPostId}/save`, { method: "POST", credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setDbSaved(data.saved);
      setDbSaveCount(data.saveCount);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isDbPost) {
    if (dbLoading) {
      return (
        <div className="min-h-screen bg-[#12100e]">
          <Nav />
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        </div>
      );
    }
    if (!dbPost) {
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

    const following = isFollowing(dbPost.authorId);
    const color = dbPost.technique ? (TECHNIQUE_COLORS[dbPost.technique] ?? "bg-amber-500") : "bg-amber-500";

    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-5xl px-4 py-6">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/"))}
            className="mb-4 flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div>
              {dbPost.muxPlaybackId ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
                  <MuxPlayer
                    playbackId={dbPost.muxPlaybackId}
                    streamType="on-demand"
                    poster={dbPost.thumbnailUrl ?? undefined}
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : dbPost.videoUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
                  <video
                    src={dbPost.videoUrl}
                    controls
                    className="h-full w-full object-cover"
                    poster={dbPost.thumbnailUrl ?? undefined}
                  />
                </div>
              ) : dbPost.thumbnailUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-stone-900">
                  <img src={dbPost.thumbnailUrl} alt={dbPost.caption} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-stone-900 flex items-center justify-center">
                  <Flame size={48} className="text-stone-700" />
                </div>
              )}

              <div className="mt-4 space-y-3">
                {dbPost.technique && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/tag/${encodeURIComponent(dbPost.technique)}`}>
                      <span className={`inline-flex items-center gap-1 rounded-full ${color} px-2.5 py-0.5 text-xs font-bold text-white`}>
                        🔥 {dbPost.technique}
                      </span>
                    </Link>
                  </div>
                )}

                <p className="text-base font-medium text-stone-100 leading-snug">{dbPost.caption}</p>

                {dbPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {dbPost.tags.map((t) => (
                      <Link key={t} href={`/tag/${encodeURIComponent(t)}`}>
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-stone-400 hover:text-amber-300 transition-colors">#{t}</span>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1 border-t border-white/8">
                  <button
                    onClick={handleDbLike}
                    className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-rose-400 transition-colors"
                  >
                    <Heart size={18} className={dbLiked ? "fill-rose-500 text-rose-500" : ""} />
                    <span>{fmt(dbLikeCount)}</span>
                  </button>
                  <button
                    onClick={() => setShowComments((v) => !v)}
                    className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-amber-300 transition-colors"
                  >
                    <MessageCircle size={18} />
                    <span>Comments</span>
                  </button>
                  <button
                    onClick={handleDbSave}
                    className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-amber-300 transition-colors"
                  >
                    <Bookmark size={18} className={dbSaved ? "fill-amber-400 text-amber-400" : ""} />
                    <span>{fmt(dbSaveCount)}</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-amber-300 transition-colors ml-auto"
                  >
                    <Share2 size={18} />
                    <span>{copied ? "Copied!" : "Share"}</span>
                  </button>
                  <button
                    onClick={() => setShowShare(true)}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-300 hover:bg-amber-500/25 transition-colors"
                  >
                    <Flame size={16} />
                    <span>Story</span>
                  </button>
                </div>
              </div>

              <ShareStoryModal
                open={showShare}
                onClose={() => setShowShare(false)}
                imageUrl={dbPost.thumbnailUrl ?? undefined}
                title={dbPost.caption || "New work"}
                eyebrow={dbPost.technique ?? undefined}
                badge="NEW WORK"
                handle={dbPost.authorName}
              />

              {poll && (
                <div className="mt-4">
                  <PollBlock
                    poll={poll.poll}
                    pollId={poll.pollId}
                    initialVoteOptionId={poll.initialVoteOptionId}
                  />
                </div>
              )}

              {showComments && (
                <Comments
                  postId={rawPostId}
                  artistName={dbPost.authorName}
                  onClose={() => setShowComments(false)}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-stone-900/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/artists/${dbPost.authorId}`}>
                    <img
                      src={dbPost.authorAvatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${dbPost.authorId}`}
                      alt={dbPost.authorName}
                      className="h-14 w-14 rounded-full object-cover border-2 border-amber-500/30 hover:border-amber-400/60 transition-colors"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/artists/${dbPost.authorId}`}>
                      <p className="font-semibold text-amber-100 hover:text-amber-300 transition-colors truncate">{dbPost.authorName}</p>
                    </Link>
                    <p className="text-xs text-stone-500">{new Date(dbPost.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {profile?.id !== dbPost.authorId && (
                    <button
                      onClick={() => following
                        ? unfollowArtist(dbPost.authorId)
                        : followArtist(dbPost.authorId, dbPost.authorName, dbPost.authorAvatarUrl ?? "")
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
                    href={`/artists/${dbPost.authorId}`}
                    className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-sm text-stone-400 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
                  >
                    <ExternalLink size={13} /> Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reel = getReelById(rawPostId);

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

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <button
          onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/"))}
          className="mb-4 flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${reel.videoId}?autoplay=0&rel=0&modestbranding=1`}
                title={reel.caption}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/tag/${encodeURIComponent(reel.technique)}`}>
                  <span className={`inline-flex items-center gap-1 rounded-full ${color} px-2.5 py-0.5 text-xs font-bold text-white`}>
                    🔥 {reel.technique}
                  </span>
                </Link>
                <span className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-amber-300">
                  <Flame size={10} className="text-amber-400" /> Craft {reel.craftScore}
                </span>
              </div>

              <p className="text-base font-medium text-stone-100 leading-snug">{reel.caption}</p>
              <p className="text-sm text-stone-500">{reel.location}</p>

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
                <button
                  onClick={() => setShowShare(true)}
                  className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-300 hover:bg-amber-500/25 transition-colors"
                >
                  <Flame size={16} />
                  <span>Story</span>
                </button>
              </div>
            </div>

            <ShareStoryModal
              open={showShare}
              onClose={() => setShowShare(false)}
              imageUrl={reel.thumbnail}
              title={reel.caption}
              eyebrow={reel.technique}
              badge="NEW WORK"
              handle={reel.artistName}
            />

            {showComments && (
              <Comments
                postId={reel.id}
                artistName={reel.artistName}
                onClose={() => setShowComments(false)}
              />
            )}

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
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&h=300&fit=crop&seed=${r.id}`; }}
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

          <div className="space-y-4">
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

              <div className="mt-3 pt-3 border-t border-white/8">
                <Link href={`/artists/${reel.artistId}`}>
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${csInfo.color} hover:opacity-80 transition-opacity`}>
                    <csInfo.Icon size={11} />
                    Commissions {csInfo.label}
                  </div>
                </Link>
              </div>
            </div>

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
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=100&h=100&fit=crop&seed=${r.id}`; }}
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
