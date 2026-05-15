import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Plus, Calendar, Clock, Image, Video, FileText,
  Edit2, Trash2, Send, CheckCircle, AlertCircle, ChevronRight, X
} from "lucide-react";
import Nav from "@/components/Nav";

type PostStatus = "draft" | "scheduled" | "published" | "failed";
type PostType = "reel" | "photo" | "journal";

interface ScheduledPost {
  id: string;
  type: PostType;
  title: string;
  caption: string;
  scheduledAt: string;
  status: PostStatus;
  hashtags: string[];
  thumbnailColor: string;
  technique?: string;
}

const STORAGE_KEY = "kiln_scheduled_posts_v1";
const COLORS = ["#7c3aed","#b45309","#047857","#1d4ed8","#be123c","#0e7490","#92400e","#3b0764"];

function readPosts(): ScheduledPost[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function savePosts(posts: ScheduledPost[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch {}
}

const SEED_POSTS: ScheduledPost[] = [
  {
    id: "seed-1", type: "reel", title: "Blowing the Vase Series ep.4",
    caption: "Getting the gather just right — took 14 attempts to nail this gather temperature. The color shift at 1800°F is everything.",
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "scheduled", hashtags: ["glassblowing", "kilncraft", "processvideo"], thumbnailColor: "#7c3aed", technique: "Glass Blowing"
  },
  {
    id: "seed-2", type: "photo", title: "Finished pieces from the annealing oven",
    caption: "After 18 hours in the annealing oven, pulling these out is always the best feeling. New series available in the shop.",
    scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: "scheduled", hashtags: ["glassart", "craftart", "studioglass"], thumbnailColor: "#b45309"
  },
  {
    id: "seed-3", type: "journal", title: "The chemistry of color in glass",
    caption: "A deep dive into what cobalt, copper, and gold actually do at the molecular level when they enter molten silica.",
    scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: "published", hashtags: ["glasschem", "craftscience"], thumbnailColor: "#047857"
  },
];

function formatRelative(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60000) return "just now";
  if (abs < 3600000) return `${Math.round(abs / 60000)}m ${diff > 0 ? "from now" : "ago"}`;
  if (abs < 86400000) return `${Math.round(abs / 3600000)}h ${diff > 0 ? "from now" : "ago"}`;
  return `${Math.round(abs / 86400000)}d ${diff > 0 ? "from now" : "ago"}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const TYPE_ICONS: Record<PostType, React.ElementType> = { reel: Video, photo: Image, journal: FileText };
const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-stone-500" },
  scheduled: { label: "Scheduled", color: "text-amber-400" },
  published: { label: "Published", color: "text-emerald-400" },
  failed: { label: "Failed", color: "text-red-400" },
};

export default function PostScheduler() {
  const [posts, setPosts] = useState<ScheduledPost[]>(() => {
    const stored = readPosts();
    return stored.length > 0 ? stored : SEED_POSTS;
  });
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ScheduledPost | null>(null);
  const [draft, setDraft] = useState<Partial<ScheduledPost>>({});

  const visible = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const counts = { draft: 0, scheduled: 0, published: 0, failed: 0 };
  posts.forEach((p) => { counts[p.status]++; });

  function openCompose() {
    setDraft({
      type: "reel", title: "", caption: "", hashtags: [],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      status: "scheduled",
      thumbnailColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    setEditing(null);
    setComposing(true);
  }

  function openEdit(post: ScheduledPost) {
    setDraft({ ...post, scheduledAt: post.scheduledAt.slice(0, 16) });
    setEditing(post);
    setComposing(true);
  }

  function savePost() {
    const now = new Date().toISOString();
    const isNew = !editing;
    const finalPost: ScheduledPost = {
      id: editing?.id ?? `post-${Date.now()}`,
      type: (draft.type ?? "reel") as PostType,
      title: draft.title ?? "",
      caption: draft.caption ?? "",
      scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : now,
      status: (draft.status ?? "scheduled") as PostStatus,
      hashtags: draft.hashtags ?? [],
      thumbnailColor: draft.thumbnailColor ?? COLORS[0],
      technique: draft.technique,
    };
    setPosts((prev) => {
      const next = isNew ? [finalPost, ...prev] : prev.map((p) => p.id === editing?.id ? finalPost : p);
      savePosts(next);
      return next;
    });
    setComposing(false);
    setEditing(null);
    setDraft({});
  }

  function deletePost(id: string) {
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePosts(next);
      return next;
    });
  }

  function publishNow(id: string) {
    setPosts((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, status: "published" as PostStatus, scheduledAt: new Date().toISOString() } : p);
      savePosts(next);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/create" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Calendar size={20} className="text-amber-400" /> Post Scheduler
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">Plan and schedule your content ahead</p>
          </div>
          <button
            onClick={openCompose}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Plus size={14} /> New post
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(["draft","scheduled","published","failed"] as PostStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="rounded-xl border border-white/8 bg-stone-900/40 p-3 text-center">
                <p className={`text-xl font-bold ${cfg.color}`}>{counts[s]}</p>
                <p className="text-xs text-stone-600 mt-0.5 capitalize">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {(["all","scheduled","draft","published","failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                filter === f ? "bg-amber-500 text-stone-950 font-bold" : "border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
              }`}
            >
              {f === "all" ? `All (${posts.length})` : f}
            </button>
          ))}
        </div>

        {/* Posts list */}
        <div className="space-y-3">
          <AnimatePresence>
            {visible.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                <Calendar size={36} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500">No posts here yet</p>
              </motion.div>
            )}
            {visible.map((post) => {
              const TypeIcon = TYPE_ICONS[post.type];
              const cfg = STATUS_CONFIG[post.status];
              return (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-3 rounded-2xl border border-white/8 bg-stone-900/60 p-4 hover:border-white/12 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="h-14 w-14 shrink-0 rounded-xl flex items-center justify-center" style={{ background: post.thumbnailColor + "33" }}>
                    <TypeIcon size={20} style={{ color: post.thumbnailColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-stone-200 line-clamp-1">{post.title || "Untitled"}</p>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-stone-600 line-clamp-1 mt-0.5">{post.caption}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-stone-600">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {post.status === "published" ? formatDate(post.scheduledAt) : formatRelative(post.scheduledAt)}
                      </span>
                      <span className="capitalize">{post.type}</span>
                      {post.technique && <span>{post.technique}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => openEdit(post)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <Edit2 size={12} className="text-stone-500" />
                    </button>
                    {post.status === "scheduled" && (
                      <button onClick={() => publishNow(post.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">
                        <Send size={12} className="text-emerald-500/60 hover:text-emerald-400" />
                      </button>
                    )}
                    <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 size={12} className="text-stone-700 hover:text-red-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Compose / Edit modal */}
      <AnimatePresence>
        {composing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setComposing(false); }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-stone-900 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="font-semibold text-stone-200">{editing ? "Edit post" : "Schedule a post"}</h2>
                <button onClick={() => setComposing(false)} className="p-1 rounded-full hover:bg-white/5 transition-colors">
                  <X size={16} className="text-stone-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Type */}
                <div>
                  <label className="text-xs text-stone-500 mb-2 block">Post type</label>
                  <div className="flex gap-2">
                    {(["reel","photo","journal"] as PostType[]).map((t) => {
                      const Icon = TYPE_ICONS[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setDraft((d) => ({ ...d, type: t }))}
                          className={`flex-1 flex flex-col items-center gap-1 rounded-xl border py-3 text-xs capitalize transition-colors ${
                            draft.type === t ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500 hover:border-white/20"
                          }`}
                        >
                          <Icon size={16} />
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Title</label>
                  <input
                    value={draft.title ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Give your post a working title"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                {/* Caption */}
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Caption</label>
                  <textarea
                    value={draft.caption ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                    placeholder="Write your caption…"
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Hashtags (comma-separated)</label>
                  <input
                    value={(draft.hashtags ?? []).join(", ")}
                    onChange={(e) => setDraft((d) => ({ ...d, hashtags: e.target.value.split(",").map((h) => h.trim()).filter(Boolean) }))}
                    placeholder="glassblowing, kilncraft, processvideo"
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                {/* Schedule time */}
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Schedule for</label>
                  <input
                    type="datetime-local"
                    value={draft.scheduledAt?.slice(0, 16) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Status</label>
                  <div className="flex gap-2">
                    {(["draft","scheduled"] as PostStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setDraft((d) => ({ ...d, status: s }))}
                        className={`flex-1 rounded-xl border py-2 text-xs capitalize transition-colors ${
                          draft.status === s ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500 hover:border-white/20"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setComposing(false)} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:border-white/20 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={savePost}
                    disabled={!draft.title && !draft.caption}
                    className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    {editing ? "Save changes" : "Schedule post"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
