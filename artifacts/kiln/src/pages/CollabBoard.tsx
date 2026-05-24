import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Users, MapPin, Clock, Tag, X, Check, Flame, MessageCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { ALL_CRAFTS } from "@/data/craftCategories";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";

interface CollabPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  title: string;
  description: string;
  seeking: string[];
  offering: string;
  location: string;
  remote: boolean;
  tags: string[];
  createdAt: string;
  responses: number;
  interested: boolean;
}


const MEDIUM_OPTIONS = ALL_CRAFTS;

export default function CollabBoard() {
  const { profile } = useProfile();
  const [collabs, setCollabs] = useState<CollabPost[]>([]);
  const [collabsLoading, setCollabsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterMedium, setFilterMedium] = useState<string>("all");
  const [filterRemote, setFilterRemote] = useState<"all" | "remote" | "local">("all");

  const [form, setForm] = useState({
    title: "",
    description: "",
    seeking: [] as string[],
    offering: "",
    location: "",
    remote: false,
    tags: "",
  });

  useEffect(() => {
    fetch("/api/collab-board", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ posts: CollabPost[] }> : null)
      .then(data => { if (data?.posts) setCollabs(data.posts); })
      .catch(() => {})
      .finally(() => setCollabsLoading(false));
  }, []);

  async function toggleInterest(id: string) {
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, interested: !c.interested, responses: c.interested ? c.responses - 1 : c.responses + 1 } : c));
    try {
      await fetch(`/api/collab-board/${id}/interest`, { method: "POST", credentials: "include" });
    } catch { /* optimistic */ }
  }

  async function submitPost() {
    if (!form.title.trim() || !profile) return;
    const tempId = `collab-${Date.now()}`;
    const newPost: CollabPost = {
      id: tempId,
      authorId: profile.id,
      authorName: profile.name,
      authorAvatarUrl: profile.avatarUrl,
      title: form.title,
      description: form.description,
      seeking: form.seeking,
      offering: form.offering,
      location: form.remote ? "Remote" : form.location,
      remote: form.remote,
      tags: form.tags.split(/[\s,]+/).filter(Boolean).map(t => t.replace(/^#/, "").toLowerCase()),
      createdAt: new Date().toISOString(),
      responses: 0,
      interested: false,
    };
    setCollabs(prev => [newPost, ...prev]);
    setShowForm(false);
    setForm({ title: "", description: "", seeking: [], offering: "", location: "", remote: false, tags: "" });
    try {
      const res = await fetch("/api/collab-board", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPost.title, description: newPost.description,
          seeking: newPost.seeking, offering: newPost.offering,
          location: newPost.location, remote: newPost.remote,
          tags: newPost.tags,
        }),
      });
      if (res.ok) {
        const saved = await res.json() as CollabPost;
        setCollabs(prev => prev.map(c => c.id === tempId ? { ...saved, interested: false } : c));
      }
    } catch { /* optimistic stays */ }
  }

  const filtered = collabs.filter(c => {
    const mediumMatch = filterMedium === "all" || c.seeking.some(s => s === filterMedium);
    const remoteMatch = filterRemote === "all" || (filterRemote === "remote" ? c.remote : !c.remote);
    return mediumMatch && remoteMatch;
  });

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">

        <div className="mb-6 flex items-start gap-3">
          <Link href="/" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Collab Board</h1>
            <p className="text-sm text-stone-500 mt-0.5">Find craft artists to collaborate with on exhibitions, courses, and commissions</p>
          </div>
          {profile && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors shrink-0"
            >
              <Plus size={13} /> Post
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-5 flex gap-3 flex-wrap items-center">
          <select
            value={filterMedium}
            onChange={e => setFilterMedium(e.target.value)}
            className="rounded-full border border-white/10 bg-stone-900 px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500/40"
          >
            <option value="all">All mediums</option>
            {MEDIUM_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {(["all", "remote", "local"] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterRemote(v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${filterRemote === v ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/10 text-stone-500 hover:text-stone-300"}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4">
          {collabsLoading && (
            <div className="flex items-center justify-center py-12 text-stone-600 text-sm">Loading…</div>
          )}
          {!collabsLoading && filtered.length === 0 && collabs.length === 0 && (
            <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-8 text-center">
              <Users size={32} className="mx-auto mb-3 text-stone-700" />
              <p className="text-sm font-medium text-stone-400 mb-1">No collab posts yet</p>
              <p className="text-xs text-stone-600">Be the first to post a collaboration opportunity.</p>
            </div>
          )}
          {filtered.map(collab => (
            <motion.div
              key={collab.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/8 bg-stone-900/60 p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <Link href={`/artists/${collab.authorId}`}>
                  <img src={collab.authorAvatarUrl} alt={collab.authorName} className="h-9 w-9 rounded-full object-cover bg-stone-800 shrink-0" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/artists/${collab.authorId}`}>
                    <span className="text-sm font-semibold text-amber-100 hover:text-amber-300 transition-colors">{collab.authorName}</span>
                  </Link>
                  <p className="text-xs text-stone-600"><RelativeTime since={collab.createdAt} className="" /></p>
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-600">
                  <MapPin size={10} /> {collab.remote ? "Remote ok" : collab.location}
                </div>
              </div>

              <h3 className="text-sm font-bold text-amber-100 leading-snug mb-2">{collab.title}</h3>
              <p className="text-sm text-stone-400 leading-relaxed mb-3 line-clamp-3">{collab.description}</p>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {collab.seeking.map(s => (
                  <span key={s} className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    Seeking: {s}
                  </span>
                ))}
              </div>

              {collab.offering && (
                <p className="text-xs text-stone-500 mb-3">
                  <span className="text-stone-400 font-medium">Offering: </span>{collab.offering}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-stone-600">
                  <MessageCircle size={11} /> {collab.responses} {collab.responses === 1 ? "response" : "responses"}
                </div>
                <button
                  onClick={() => toggleInterest(collab.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    collab.interested
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-white/10 text-stone-500 hover:border-amber-500/30 hover:text-amber-400"
                  }`}
                >
                  {collab.interested ? <Check size={11} /> : <Flame size={11} />}
                  {collab.interested ? "Interested!" : "I'm interested"}
                </button>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center text-stone-600">
              <Users size={36} className="mx-auto mb-3 opacity-40" />
              <p>No collabs match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Post form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#1a1714] p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl text-amber-100">Post a collab</h2>
                <button onClick={() => setShowForm(false)} className="text-stone-500 hover:text-stone-300">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Glassblower seeking ceramicist for joint show"
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="What are you making, how will you collaborate, what's the goal?"
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">Seeking medium(s)</label>
                  <div className="flex flex-wrap gap-2">
                    {MEDIUM_OPTIONS.map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, seeking: f.seeking.includes(m) ? f.seeking.filter(s => s !== m) : [...f.seeking, m] }))}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${form.seeking.includes(m) ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/10 text-stone-500 hover:text-stone-300"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">What you're offering</label>
                  <input value={form.offering} onChange={e => setForm(f => ({ ...f, offering: e.target.value }))}
                    placeholder="e.g. 50/50 revenue split, co-promotion, gallery space"
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-stone-400 mb-1.5">Location</label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      disabled={form.remote} placeholder="City, State"
                      className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none disabled:opacity-40" />
                  </div>
                  <label className="flex items-end gap-2 pb-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.remote} onChange={e => setForm(f => ({ ...f, remote: e.target.checked }))} className="accent-amber-500" />
                    <span className="text-xs text-stone-400">Remote ok</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">Tags</label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="exhibition, revenue-share, urgent..."
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none" />
                </div>
                <button
                  onClick={submitPost}
                  disabled={!form.title.trim()}
                  className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post collab request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
