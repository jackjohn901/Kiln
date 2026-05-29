import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, MessageSquare, Star, Send, ThumbsUp, X, Plus, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";

interface CritiquePost {
  id: string;
  artistId: string;
  artistName: string;
  avatarUrl: string;
  imageUrl: string;
  caption: string;
  medium: string;
  postedAt: string;
  critiqueCount: number;
  tags: string[];
  critiques: {
    id: string;
    fromName: string;
    fromAvatar: string;
    technique: number;
    concept: number;
    finish: number;
    originality: number;
    text: string;
    helpful: number;
    postedAt: string;
  }[];
}


function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-stone-500 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-stone-800">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-amber-300 w-4 text-right">{value}</span>
    </div>
  );
}

function avgRating(c: CritiquePost["critiques"][0]) {
  return ((c.technique + c.concept + c.finish + c.originality) / 4).toFixed(1);
}


export default function CritiqueFeed() {
  const { profile } = useProfile();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [critiqueForm, setCritiqueForm] = useState<{ postId: string; postArtistId: string; ratings: { technique: number; concept: number; finish: number; originality: number }; text: string } | null>(null);
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState<CritiquePost[]>([]);

  // Merge real posts that have [critique welcome] from DB
  useEffect(() => {
    fetch("/api/critique-posts")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.posts?.length) {
          setPosts(prev => {
            const dbIds = new Set(data.posts.map((p: CritiquePost) => p.id));
            const seeds = prev.filter(p => !dbIds.has(p.id));
            return [...data.posts, ...seeds];
          });
        }
      })
      .catch(() => {});
  }, []);

  async function submitCritique() {
    if (!critiqueForm || !profile || submitting) return;
    setSubmitting(true);
    // optimistic update
    const tempCritique = {
      id: `cr-new-${Date.now()}`,
      fromName: profile.name,
      fromAvatar: `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${profile.id}`,
      ...critiqueForm.ratings,
      text: critiqueForm.text,
      helpful: 0,
      postedAt: new Date().toISOString(),
    };
    setPosts(prev => prev.map(p =>
      p.id === critiqueForm.postId
        ? { ...p, critiques: [tempCritique, ...p.critiques], critiqueCount: p.critiqueCount + 1 }
        : p
    ));
    setCritiqueForm(null);
    try {
      const r = await fetch(`/api/critique-posts/${critiqueForm.postId}/critiques`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...critiqueForm.ratings, text: critiqueForm.text, postArtistId: critiqueForm.postArtistId }),
      });
      if (r.ok) {
        const saved = await r.json();
        // replace temp with server record
        setPosts(prev => prev.map(p =>
          p.id === (critiqueForm?.postId ?? "")
            ? { ...p, critiques: p.critiques.map(c => c.id === tempCritique.id ? { ...c, id: saved.id } : c) }
            : p
        ));
      }
    } catch {}
    setSubmitting(false);
  }

  function handleHelpful(postId: string, critiqueId: string) {
    if (helpfulClicked.has(critiqueId)) return;
    setHelpfulClicked(s => { const n = new Set(s); n.add(critiqueId); return n; });
    fetch(`/api/critique-posts/${postId}/critiques/${critiqueId}/helpful`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/discover" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Critique Circle</h1>
            <p className="text-xs text-stone-500 mt-0.5">Structured peer feedback for craft artists</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
          <Info size={14} className="text-sky-400 mt-0.5 shrink-0" />
          <p className="text-xs text-stone-400 leading-relaxed">
            Posts tagged <span className="text-amber-300 font-semibold">[critique welcome]</span> appear here. Critiques rate on Technique, Concept, Finish, and Originality (1–5). Be specific, constructive, and respectful.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <motion.div key={post.id} layout className="overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60">
              {/* Artist header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <img src={post.avatarUrl} alt={post.artistName} className="h-9 w-9 rounded-full object-cover border border-white/10"
                  onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${post.artistId}`; }} />
                <div className="flex-1 min-w-0">
                  <Link href={`/artists/${post.artistId}`} className="text-sm font-semibold text-stone-200 hover:text-amber-300 transition-colors">{post.artistName}</Link>
                  <p className="text-[11px] text-stone-600">{post.medium} · <RelativeTime since={post.postedAt} className="" /></p>
                </div>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <MessageSquare size={11} /> {post.critiqueCount}
                </span>
              </div>

              {/* Image */}
              <img src={post.imageUrl} alt="" className="w-full aspect-video object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=${post.id}`; }} />

              {/* Caption */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-sm text-stone-300 leading-relaxed">{post.caption}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.tags.map(t => (
                    <span key={t} className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">#{t}</span>
                  ))}
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8">
                <button
                  onClick={() => setExpanded(expanded === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-300 transition-colors"
                >
                  <Star size={12} /> {post.critiqueCount} critiques
                </button>
                {profile && (
                  <button
                    onClick={() => setCritiqueForm(critiqueForm?.postId === post.id ? null : { postId: post.id, postArtistId: post.artistId, ratings: { technique: 4, concept: 4, finish: 4, originality: 4 }, text: "" })}
                    className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus size={11} /> Give Critique
                  </button>
                )}
              </div>

              {/* Critique form */}
              <AnimatePresence>
                {critiqueForm?.postId === post.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-white/8 px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Your Critique</p>
                        <button onClick={() => setCritiqueForm(null)} className="text-stone-600 hover:text-stone-400"><X size={14} /></button>
                      </div>
                      <div className="space-y-2">
                        {(["technique", "concept", "finish", "originality"] as const).map(key => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-20 text-[11px] text-stone-500 capitalize">{key}</span>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(n => (
                                <button
                                  key={n}
                                  onClick={() => setCritiqueForm(f => f ? { ...f, ratings: { ...f.ratings, [key]: n } } : f)}
                                  className={`h-6 w-6 rounded text-xs font-bold transition-all ${critiqueForm.ratings[key] >= n ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-600"}`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <textarea
                        value={critiqueForm.text}
                        onChange={e => setCritiqueForm(f => f ? { ...f, text: e.target.value } : f)}
                        rows={4}
                        placeholder="Be specific about what's working, what could be stronger, and why. Reference the work directly."
                        className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
                      />
                      <button
                        disabled={!critiqueForm.text.trim() || submitting}
                        onClick={submitCritique}
                        className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={13} /> {submitting ? "Posting…" : "Post Critique"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Critiques list */}
              <AnimatePresence>
                {expanded === post.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-white/8">
                      {post.critiques.map(c => (
                        <div key={c.id} className="border-b border-white/5 last:border-b-0 px-4 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <img src={c.fromAvatar} alt={c.fromName} className="h-7 w-7 rounded-full object-cover border border-white/10"
                              onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=60&h=60&fit=crop&seed=${c.id}`; }} />
                            <div>
                              <span className="text-xs font-semibold text-stone-200">{c.fromName}</span>
                              <RelativeTime since={c.postedAt} className="ml-2 text-[11px] text-stone-600" />
                            </div>
                            <span className="ml-auto text-xs font-bold text-amber-300">{avgRating(c)} avg</span>
                          </div>
                          <div className="space-y-1 mb-3">
                            <RatingBar label="Technique" value={c.technique} />
                            <RatingBar label="Concept" value={c.concept} />
                            <RatingBar label="Finish" value={c.finish} />
                            <RatingBar label="Originality" value={c.originality} />
                          </div>
                          <p className="text-sm text-stone-400 leading-relaxed mb-3">{c.text}</p>
                          <button
                            onClick={() => handleHelpful(post.id, c.id)}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${helpfulClicked.has(c.id) ? "text-amber-400" : "text-stone-600 hover:text-stone-400"}`}
                          >
                            <ThumbsUp size={11} /> Helpful ({c.helpful + (helpfulClicked.has(c.id) ? 1 : 0)})
                          </button>
                        </div>
                      ))}
                      {post.critiques.length === 0 && (
                        <p className="py-8 text-center text-xs text-stone-600">No critiques yet — be the first.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
