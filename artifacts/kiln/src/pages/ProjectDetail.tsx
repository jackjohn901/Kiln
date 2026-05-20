import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Plus, Check, Trash2, ExternalLink, Loader2,
  Camera, Flame, Scissors, BookOpen, Layers, Sparkles, Package,
  Flag, X, Edit2,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

interface Post {
  id: string; caption?: string | null; thumbnailUrl?: string | null;
  mediaUrl?: string | null; technique?: string | null; createdAt: string;
}
interface Chapter { id: string; projectId: string; postId: string; chapterNum: number; stage: string | null; addedAt: string; post: Post | null; }
interface Project {
  id: string; artistId: string; title: string; description: string | null;
  medium: string | null; status: string; postCount: number;
  startedAt: string | null; completedAt: string | null; linkedListingId: string | null; createdAt: string;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  Sketch: BookOpen, Sourcing: Package, Forming: Layers, Throwing: Flame,
  Carving: Scissors, Bisque: Flame, Glazing: Sparkles, Firing: Flame,
  Finishing: Check, Photography: Camera,
};
const STAGE_OPTIONS = ["Sketch", "Sourcing", "Forming", "Throwing", "Carving", "Bisque", "Glazing", "Firing", "Finishing", "Photography", "Other"];

function stageColor(stage: string | null) {
  const map: Record<string, string> = {
    Firing: "text-orange-400 bg-orange-500/15 border-orange-500/30",
    Glazing: "text-violet-400 bg-violet-500/15 border-violet-500/30",
    Finishing: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    Photography: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  };
  return map[stage ?? ""] ?? "text-amber-400 bg-amber-500/15 border-amber-500/30";
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();

  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedStage, setSelectedStage] = useState("Forming");
  const [adding, setAdding] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const isOwner = profile && project && profile.id === project.artistId;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: { project: Project; chapters: Chapter[] }) => {
        setProject(d.project);
        setChapters(d.chapters);
        setDraftTitle(d.project.title);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!showAdd || myPosts.length) return;
    fetch("/api/me/posts?limit=50", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: { posts: Post[] }) => setMyPosts(d.posts ?? []))
      .catch(() => {});
  }, [showAdd, myPosts.length]);

  async function addChapter() {
    if (!selectedPostId || !id) return;
    setAdding(true);
    await fetch(`/api/projects/${id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ postId: selectedPostId, stage: selectedStage }),
    });
    const r = await fetch(`/api/projects/${id}`, { credentials: "include" });
    const d = await r.json() as { project: Project; chapters: Chapter[] };
    setProject(d.project); setChapters(d.chapters);
    setShowAdd(false); setSelectedPostId(""); setAdding(false);
  }

  async function removeChapter(postId: string) {
    if (!id) return;
    await fetch(`/api/projects/${id}/posts/${postId}`, { method: "DELETE", credentials: "include" });
    setChapters((prev) => prev.filter((c) => c.postId !== postId));
    setProject((prev) => prev ? { ...prev, postCount: Math.max(0, prev.postCount - 1) } : prev);
  }

  async function markComplete() {
    if (!id) return;
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
    });
    setProject((prev) => prev ? { ...prev, status: "completed", completedAt: new Date().toISOString() } : prev);
  }

  async function saveTitle() {
    if (!id || !draftTitle.trim()) return;
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: draftTitle.trim() }),
    });
    setProject((prev) => prev ? { ...prev, title: draftTitle.trim() } : prev);
    setEditTitle(false);
  }

  async function deleteProject() {
    if (!id || !confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE", credentials: "include" });
    navigate("/projects/mine");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-4">
        <p className="text-stone-500">Project not found.</p>
        <Link href="/projects/mine"><button className="text-amber-400 text-sm underline">Back to Projects</button></Link>
      </div>
    );
  }

  const isCompleted = project.status === "completed";

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        {/* Back */}
        <div className="mb-5 flex items-center gap-3">
          <Link href="/projects/mine">
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
                  className="flex-1 rounded-lg bg-stone-800 border border-stone-600 px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60"
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                />
                <button onClick={saveTitle} className="text-amber-400 hover:text-amber-300"><Check size={16} /></button>
                <button onClick={() => setEditTitle(false)} className="text-stone-500 hover:text-stone-300"><X size={15} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-serif text-xl text-amber-100 truncate">{project.title}</h1>
                {isOwner && (
                  <button onClick={() => setEditTitle(true)} className="shrink-0 text-stone-600 hover:text-stone-400">
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
              isCompleted ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              : "border-amber-500/30 text-amber-400 bg-amber-500/10"}`}>
              {isCompleted ? "Completed" : "In Progress"}
            </span>
          </div>
        </div>

        {/* Meta */}
        {(project.description || project.medium) && (
          <div className="mb-5 rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-1">
            {project.description && <p className="text-sm text-stone-300">{project.description}</p>}
            <div className="flex flex-wrap gap-3 mt-1">
              {project.medium && <span className="text-xs text-stone-500">Medium: <span className="text-stone-300">{project.medium}</span></span>}
              {project.startedAt && <span className="text-xs text-stone-500">Started: <span className="text-stone-300">{new Date(project.startedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></span>}
              {project.completedAt && <span className="text-xs text-stone-500">Completed: <span className="text-emerald-300">{new Date(project.completedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></span>}
              <span className="text-xs text-stone-500">{project.postCount} chapter{project.postCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}

        {/* Chapter timeline */}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
          {chapters.length ? "Chapters" : "No chapters yet"}
        </h2>

        <div className="relative">
          {chapters.length > 0 && <div className="absolute left-5 top-0 bottom-0 w-px bg-stone-800" />}
          <div className="space-y-4">
            {chapters.map((ch, i) => {
              const StageIcon = STAGE_ICONS[ch.stage ?? ""] ?? Flame;
              const colorClass = stageColor(ch.stage);
              const post = ch.post;
              return (
                <motion.div key={ch.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }} className="relative flex gap-4 pl-14">
                  <div className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border ${colorClass}`}>
                    <StageIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0 rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                    <div className="flex gap-3 p-3">
                      {post?.thumbnailUrl && (
                        <img src={post.thumbnailUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Chapter {ch.chapterNum} {ch.stage && `· ${ch.stage}`}
                          </span>
                          {isOwner && (
                            <button onClick={() => removeChapter(ch.postId)}
                              className="shrink-0 text-stone-700 hover:text-rose-400 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        {post?.caption && <p className="text-sm text-stone-300 line-clamp-2">{post.caption}</p>}
                        {post?.technique && <p className="text-xs text-stone-600 mt-0.5">{post.technique}</p>}
                        {post && (
                          <Link href={`/posts/${post.id}`}>
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-300 transition-colors">
                              View post <ExternalLink size={10} />
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Finish milestone */}
            {isCompleted && (
              <div className="relative flex gap-4 pl-14">
                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                  <Flag size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-semibold text-emerald-300">Project complete</p>
                  {project.linkedListingId && (
                    <Link href={`/shop/${project.linkedListingId}`}>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                        View listing <ExternalLink size={11} />
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="mt-8 space-y-3">
            <button onClick={() => setShowAdd(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/8 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/15 transition-colors">
              <Plus size={15} /> Add Chapter
            </button>
            {!isCompleted && (
              <button onClick={markComplete}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/30 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/8 transition-colors">
                <Flag size={14} /> Mark Complete
              </button>
            )}
            <button onClick={deleteProject}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-800 py-2.5 text-xs text-stone-600 hover:text-rose-400 hover:border-rose-500/30 transition-colors">
              <Trash2 size={12} /> Delete Project
            </button>
          </div>
        )}

        {/* Add chapter drawer */}
        <AnimatePresence>
          {showAdd && (
            <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}>
              <motion.div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-700 p-5 space-y-4"
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-stone-200">Add Chapter</h3>
                  <button onClick={() => setShowAdd(false)} className="text-stone-500 hover:text-stone-300"><X size={17} /></button>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">Post</label>
                  <select value={selectedPostId} onChange={(e) => setSelectedPostId(e.target.value)}
                    className="w-full rounded-xl bg-stone-800 border border-stone-600 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60">
                    <option value="">Select a post…</option>
                    {myPosts.map((p) => (
                      <option key={p.id} value={p.id}>{p.caption?.slice(0, 50) ?? p.technique ?? p.id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">Stage</label>
                  <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}
                    className="w-full rounded-xl bg-stone-800 border border-stone-600 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500/60">
                    {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={addChapter} disabled={!selectedPostId || adding}
                  className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {adding ? "Adding…" : "Add Chapter"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
