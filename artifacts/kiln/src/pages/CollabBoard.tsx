import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Users, MapPin, Clock, Tag, X, Check, Flame, MessageCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

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

const SEED_COLLABS: CollabPost[] = [
  {
    id: "collab-001",
    authorId: "maya-chen",
    authorName: "Maya Chen",
    authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    title: "Ceramic artist seeking glassblower for joint exhibition",
    description: "I'm planning a show exploring the contrast between thrown forms and blown forms — both starting as molten or soft material and ending in totally different visual languages. Looking for a glassblower in the Pacific Northwest to split a gallery space and create companion pieces.",
    seeking: ["Glass Blowing", "Flamework"],
    offering: "50/50 gallery split, shared marketing, co-promotion to my 14k followers",
    location: "Seattle, WA",
    remote: false,
    tags: ["exhibition", "gallery", "pacific-northwest", "joint-show"],
    createdAt: "2026-05-13T10:00:00Z",
    responses: 4,
    interested: false,
  },
  {
    id: "collab-002",
    authorId: "james-okafor",
    authorName: "James Okafor",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Woodturner + metalsmith wanted for functional art series",
    description: "I'm a ceramics artist creating functional vessels and want to expand into furniture-scale functional art. Looking for a woodturner and a metalsmith to collaborate on a series of stools/tables with ceramic inlays and metal joinery. Remote collab possible for design, in-person for assembly.",
    seeking: ["Woodturning", "Blacksmithing", "Metalsmithing"],
    offering: "Equal credit, shared revenue, I'll handle gallery outreach",
    location: "Chicago, IL",
    remote: true,
    tags: ["functional", "furniture", "multi-medium", "revenue-share"],
    createdAt: "2026-05-11T14:30:00Z",
    responses: 7,
    interested: false,
  },
  {
    id: "collab-003",
    authorId: "elena-vasquez",
    authorName: "Elena Vasquez",
    authorAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Textile artist looking for a ceramicist for online course",
    description: "Creating a video course on surface decoration — I'll cover resist dyeing and wax batik on fabric, looking for a ceramicist to cover wax resist and underglaze on clay. We'd offer it as a bundle and split the revenue. Full remote collab, flexible timeline.",
    seeking: ["Ceramics", "Raku"],
    offering: "50/50 course revenue, I handle all video production and editing",
    location: "Remote",
    remote: true,
    tags: ["online-course", "education", "remote", "revenue-share", "surface-decoration"],
    createdAt: "2026-05-09T09:15:00Z",
    responses: 12,
    interested: false,
  },
  {
    id: "collab-004",
    authorId: "takeshi-mori",
    authorName: "Takeshi Mori",
    authorAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Seeking enamelist for jewelry collab",
    description: "I'm a silversmith and jewelry artist who wants to add enamel work to my pieces. Looking for an enamelist for a small 15-piece collection. You focus on the enamel elements, I handle the metalwork and setting. Looking for someone who works in vitreous or cloisonné.",
    seeking: ["Enamel", "Studio Jewelry"],
    offering: "60/40 split (your favor for enamel work), shared Etsy listing, cross-promotion",
    location: "Portland, OR",
    remote: false,
    tags: ["jewelry", "enamel", "silversmithing", "collection"],
    createdAt: "2026-05-08T16:00:00Z",
    responses: 3,
    interested: false,
  },
  {
    id: "collab-005",
    authorId: "sarah-thornton",
    authorName: "Sarah Thornton",
    authorAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    title: "Multi-artist residency application — need 2 more artists",
    description: "Found a 3-month group residency at a well-funded arts center in Vermont (stipend + housing + studio). They want a cohesive group of 3–4 artists working in related media. I'm a glass artist. Looking for 1–2 more craft artists to apply together. Application deadline June 15.",
    seeking: ["Ceramics", "Glass Blowing", "Flamework", "Metalsmithing"],
    offering: "Shared residency, group stipend, professional development",
    location: "Vermont (residency)",
    remote: false,
    tags: ["residency", "urgent", "stipend", "vermont", "group-application"],
    createdAt: "2026-05-07T11:00:00Z",
    responses: 9,
    interested: false,
  },
];

const MEDIUM_OPTIONS = [
  "Glass Blowing", "Flamework", "Ceramics", "Raku", "Woodturning",
  "Blacksmithing", "Metalsmithing", "Studio Jewelry", "Enamel", "Weaving",
  "Fiber Arts", "Printmaking", "Mixed Media",
];

const COLLAB_KEY = "kiln_collabs_v1";

function getCollabs(): CollabPost[] {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAB_KEY) ?? "[]") as CollabPost[];
    return [...stored, ...SEED_COLLABS];
  } catch {
    return SEED_COLLABS;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export default function CollabBoard() {
  const { profile } = useProfile();
  const [collabs, setCollabs] = useState<CollabPost[]>(getCollabs);
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

  function toggleInterest(id: string) {
    setCollabs(prev => prev.map(c => c.id === id ? { ...c, interested: !c.interested, responses: c.interested ? c.responses - 1 : c.responses + 1 } : c));
  }

  function submitPost() {
    if (!form.title.trim() || !profile) return;
    const newPost: CollabPost = {
      id: `collab-${Date.now()}`,
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
    const stored = collabs.filter(c => !SEED_COLLABS.find(s => s.id === c.id));
    const next = [newPost, ...stored];
    try { localStorage.setItem(COLLAB_KEY, JSON.stringify(next)); } catch {}
    setCollabs([newPost, ...collabs]);
    setShowForm(false);
    setForm({ title: "", description: "", seeking: [], offering: "", location: "", remote: false, tags: "" });
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
                  <p className="text-xs text-stone-600">{timeAgo(collab.createdAt)}</p>
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
