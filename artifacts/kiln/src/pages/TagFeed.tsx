import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Play, Heart, Bookmark, Hash, Loader2, TrendingUp } from "lucide-react";
import Nav from "@/components/Nav";

interface TagPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  caption: string;
  technique: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  likeCount: number;
  saveCount: number;
  tags: string[];
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function TagFeed() {
  const { tag } = useParams<{ tag: string }>();
  const [posts, setPosts] = useState<TagPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const decodedTag = decodeURIComponent(tag ?? "");

  useEffect(() => {
    if (!decodedTag) return;
    setLoading(true);
    fetch(`/api/trending-posts?tag=${encodeURIComponent(decodedTag)}&limit=48`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [decodedTag]);

  const handleLike = async (postId: string) => {
    const isLiked = liked.has(postId);
    setLiked(prev => { const next = new Set(prev); isLiked ? next.delete(postId) : next.add(postId); return next; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: p.likeCount + (isLiked ? -1 : 1) } : p));
    try { await fetch(`/api/posts/${postId}/like`, { method: "POST", credentials: "include" }); }
    catch { setLiked(prev => { const next = new Set(prev); isLiked ? next.add(postId) : next.delete(postId); return next; }); }
  };

  const handleSave = async (postId: string) => {
    const isSaved = saved.has(postId);
    setSaved(prev => { const next = new Set(prev); isSaved ? next.delete(postId) : next.add(postId); return next; });
    try { await fetch(`/api/posts/${postId}/save`, { method: "POST", credentials: "include" }); }
    catch { setSaved(prev => { const next = new Set(prev); isSaved ? next.add(postId) : next.delete(postId); return next; }); }
  };

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Hash size={20} className="text-amber-400" />
            <h1 className="font-serif text-2xl text-amber-100">{decodedTag}</h1>
          </div>
          {!loading && (
            <p className="text-sm text-stone-500">
              {posts.length > 0 ? `${posts.length} post${posts.length !== 1 ? "s" : ""} tagged with #${decodedTag}` : `No posts tagged #${decodedTag} yet`}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <Hash size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No posts tagged #{decodedTag} yet.</p>
            <Link href="/create" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
              Create the first one
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {posts.map(post => (
              <Link key={post.id} href={`/posts/db-${post.id}`}>
                <div className="group relative aspect-square overflow-hidden rounded-xl bg-stone-800 cursor-pointer">
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt={post.caption} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-stone-800">
                      <Play size={24} className="text-stone-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center gap-3 text-white text-xs">
                        <button onClick={e => { e.preventDefault(); handleLike(post.id); }} className="flex items-center gap-1">
                          <Heart size={12} className={liked.has(post.id) ? "fill-rose-400 text-rose-400" : ""} />
                          {formatCount(post.likeCount + (liked.has(post.id) ? 1 : 0))}
                        </button>
                        <button onClick={e => { e.preventDefault(); handleSave(post.id); }} className="flex items-center gap-1">
                          <Bookmark size={12} className={saved.has(post.id) ? "fill-amber-400 text-amber-400" : ""} />
                          {formatCount(post.saveCount)}
                        </button>
                      </div>
                    </div>
                  </div>
                  {post.videoUrl && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={14} className="text-white drop-shadow" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <img src={post.authorAvatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=40&h=40&fit=crop&seed=${post.authorId}`} alt="" className="h-5 w-5 rounded-full object-cover border border-white/20" />
                    <span className="text-[10px] text-white/80 font-medium drop-shadow">{post.authorName.split(" ")[0]}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="mt-8 flex items-center gap-2 text-xs text-stone-600">
            <TrendingUp size={12} />
            <span>Sorted by most likes · #{decodedTag}</span>
          </div>
        )}
      </div>
    </div>
  );
}
