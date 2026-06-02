import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Heart, MessageCircle, Repeat2, Trash2, ChevronDown, ChevronUp, Send, ImagePlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

interface CommunityAuthor {
  id: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
}

interface CommunityPost {
  id: string;
  content: string;
  imageUrl: string | null;
  guildId: string | null;
  topic: string | null;
  parentId: string | null;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isPinned: boolean;
  createdAt: string;
  liked: boolean;
  author: CommunityAuthor;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function authorName(a: CommunityAuthor) {
  return a.displayName ?? (a.handle ? `@${a.handle}` : "Artist");
}

function Avatar({ author, size = 9 }: { author: CommunityAuthor; size?: number }) {
  const name = authorName(author);
  return author.avatarUrl ? (
    <img
      src={author.avatarUrl}
      alt={name}
      className={`h-${size} w-${size} rounded-full object-cover border border-white/10 shrink-0`}
    />
  ) : (
    <div
      className={`h-${size} w-${size} rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0`}
    >
      {name[0]}
    </div>
  );
}

// ---- Composer ----
function Composer({
  placeholder = "What's on your mind?",
  guildId,
  topic,
  parentId,
  onPosted,
  compact = false,
}: {
  placeholder?: string;
  guildId?: string;
  topic?: string;
  parentId?: string;
  onPosted: (post: CommunityPost) => void;
  compact?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = 1000 - text.length;

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 text-center">
        <p className="text-sm text-stone-400 mb-3">Sign in to join the conversation</p>
        <a href="/api/auth/login" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
          Sign in
        </a>
      </div>
    );
  }

  async function submit() {
    if (!text.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text.trim(), guildId, topic, parentId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to post");
      }
      const data = await res.json();
      setText("");
      onPosted(data.post);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  const me = profile;
  const meAvatar = me?.avatarUrl;
  const meName = me?.name ?? me?.handle ?? "You";

  return (
    <div className={`rounded-2xl border border-white/10 bg-stone-900/60 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex gap-3">
        {meAvatar ? (
          <img src={meAvatar} alt={meName} className="h-9 w-9 rounded-full object-cover border border-white/10 shrink-0 mt-0.5" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300 font-bold shrink-0 mt-0.5">
            {meName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={compact ? 2 : 3}
            maxLength={1000}
            className="w-full resize-none rounded-xl bg-stone-800 border border-white/8 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs ${remaining < 50 ? "text-rose-400" : "text-stone-600"}`}>
              {remaining} left
            </span>
            <button
              onClick={submit}
              disabled={posting || !text.trim()}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={11} />
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ---- PostCard ----
function PostCard({
  post,
  onLike,
  onDelete,
  showReplies = false,
}: {
  post: CommunityPost;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  showReplies?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const [expanded, setExpanded] = useState(showReplies);
  const [replies, setReplies] = useState<CommunityPost[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [localReplyCount, setLocalReplyCount] = useState(post.replyCount);
  const [localLiked, setLocalLiked] = useState(post.liked);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount);
  const isOwn = profile?.id === post.author.id;

  async function loadReplies() {
    setLoadingReplies(true);
    try {
      const res = await fetch(`/api/community/${post.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReplies(data.replies ?? []);
      }
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplies() {
    if (!expanded && replies.length === 0) loadReplies();
    setExpanded((v) => !v);
  }

  function handleReplyPosted(reply: CommunityPost) {
    setReplies((prev) => [reply, ...prev]);
    setLocalReplyCount((c) => c + 1);
    setShowComposer(false);
    if (!expanded) setExpanded(true);
  }

  async function toggleLike() {
    if (!isAuthenticated) return;
    const optimisticLiked = !localLiked;
    setLocalLiked(optimisticLiked);
    setLocalLikeCount((c) => c + (optimisticLiked ? 1 : -1));
    onLike(post.id);
    try {
      await fetch(`/api/community/${post.id}/like`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      setLocalLiked(!optimisticLiked);
      setLocalLikeCount((c) => c + (optimisticLiked ? -1 : 1));
    }
  }

  return (
    <div className={`rounded-2xl border ${post.isPinned ? "border-amber-500/30 bg-amber-500/5" : "border-white/8 bg-stone-900/60"} overflow-hidden`}>
      {post.isPinned && (
        <div className="px-4 pt-2.5 pb-0 flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold">
          📌 Pinned
        </div>
      )}

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-start gap-3 mb-3">
          <Link href={`/artists/${post.author.id}`}>
            <Avatar author={post.author} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link href={`/artists/${post.author.id}`} className="text-sm font-semibold text-stone-100 hover:text-amber-300 transition-colors">
                {authorName(post.author)}
              </Link>
              {post.author.handle && (
                <span className="text-xs text-stone-500">@{post.author.handle}</span>
              )}
              <span className="text-xs text-stone-600">· {relativeTime(post.createdAt)}</span>
              {post.topic && (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300/90">
                  {post.topic}
                </span>
              )}
            </div>
          </div>
          {isOwn && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-stone-700 hover:text-rose-400 transition-colors p-1"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>

        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="post image"
            className="w-full rounded-xl object-cover max-h-72 mb-3 border border-white/5"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 text-xs transition-colors ${localLiked ? "text-rose-400" : "text-stone-500 hover:text-rose-400"}`}
          >
            <Heart size={14} fill={localLiked ? "currentColor" : "none"} />
            {localLikeCount > 0 && localLikeCount}
          </button>

          <button
            onClick={() => {
              setShowComposer((v) => !v);
              if (!expanded && replies.length === 0) loadReplies();
              if (!expanded) setExpanded(true);
            }}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-sky-400 transition-colors"
          >
            <MessageCircle size={14} />
            {localReplyCount > 0 && localReplyCount}
          </button>

          {localReplyCount > 0 && (
            <button
              onClick={toggleReplies}
              className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-300 transition-colors ml-auto"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Hide" : `${localReplyCount} ${localReplyCount === 1 ? "reply" : "replies"}`}
            </button>
          )}
        </div>
      </div>

      {/* Reply composer */}
      {showComposer && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          <Composer
            placeholder="Write a reply…"
            parentId={post.id}
            onPosted={handleReplyPosted}
            compact
          />
        </div>
      )}

      {/* Replies */}
      {expanded && (
        <div className="border-t border-white/5">
          {loadingReplies ? (
            <div className="p-4 flex justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            </div>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="flex gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                <div className="mt-0.5">
                  <Link href={`/artists/${reply.author.id}`}>
                    <Avatar author={reply.author} size={7} />
                  </Link>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <Link href={`/artists/${reply.author.id}`} className="text-xs font-semibold text-stone-200 hover:text-amber-300 transition-colors">
                      {authorName(reply.author)}
                    </Link>
                    <span className="text-[10px] text-stone-600">{relativeTime(reply.createdAt)}</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main page ----
export default function Community() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (reset = false) => {
    const offset = reset ? 0 : offsetRef.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/community?limit=30&offset=${offset}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data: { posts: CommunityPost[]; hasMore: boolean } = await res.json();
      setPosts((prev) => reset ? data.posts : [...prev, ...data.posts]);
      offsetRef.current = offset + data.posts.length;
      setHasMore(data.hasMore);
    } catch {
      // silently show empty state
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    fetchPosts(true);
  }, [fetchPosts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts(false);
        }
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchPosts, hasMore, loadingMore, loading]);

  function handlePosted(post: CommunityPost) {
    setPosts((prev) => [post, ...prev]);
    offsetRef.current += 1;
  }

  function handleLike(id: string) {
    // optimistic update handled inside PostCard; no-op here
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/community/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-stone-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="font-serif text-xl text-amber-100">Community</h1>
          <p className="text-[11px] text-stone-500 mt-0.5">What craft artists are talking about</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-5 flex flex-col gap-4">
        {/* Composer */}
        <Composer placeholder="Share a thought, question, or update…" onPosted={handlePosted} />

        {/* Feed */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-stone-800 shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-32 bg-stone-800 rounded mb-2" />
                  <div className="h-3 w-20 bg-stone-800 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-stone-800 rounded w-full" />
                <div className="h-3 bg-stone-800 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-500 mb-2">Be the first to post in the community!</p>
            <p className="text-xs text-stone-600">Share a question, process update, or studio news.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))
        )}

        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// Export sub-components for reuse in GuildDetail
export { Composer, PostCard, type CommunityPost, type CommunityAuthor };
