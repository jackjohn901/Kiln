import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Folder, Flame, Check, ChevronRight, Loader2, BookOpen } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

interface Project {
  id: string; title: string; description: string | null; medium: string | null;
  status: string; postCount: number; startedAt: string | null; completedAt: string | null; createdAt: string;
}

export default function MyProjects() {
  const { profile } = useProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects/mine", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: { projects: Project[] }) => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-amber-100">My Projects</h1>
            <p className="text-xs text-stone-500 mt-0.5">Track each piece from first touch to final sale</p>
          </div>
          <Link href="/projects/create">
            <button className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors">
              <Plus size={14} /> New
            </button>
          </Link>
        </div>

        {!profile && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-8 text-center">
            <p className="text-stone-500 text-sm">Sign in to manage your projects</p>
          </div>
        )}

        {profile && loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-amber-400" />
          </div>
        )}

        {profile && !loading && projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-700 p-10 text-center space-y-3">
            <Folder size={28} className="text-stone-700 mx-auto" />
            <p className="text-sm text-stone-500 font-medium">No projects yet</p>
            <p className="text-xs text-stone-600 max-w-xs mx-auto">
              Create a project to document a piece's full journey — from raw material to finished work to sale.
            </p>
            <Link href="/projects/create">
              <button className="mt-2 flex items-center gap-2 mx-auto rounded-full border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
                <Plus size={13} /> Create your first project
              </button>
            </Link>
          </div>
        )}

        {profile && !loading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map((p, i) => {
              const isCompleted = p.status === "completed";
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Link href={`/projects/${p.id}`}>
                    <div className="group flex items-start gap-4 rounded-2xl border border-white/8 bg-stone-900/60 p-4 hover:border-amber-500/20 hover:bg-stone-900 transition-all cursor-pointer">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                        isCompleted ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"
                      }`}>
                        {isCompleted ? <Check size={16} className="text-emerald-400" /> : <Flame size={16} className="text-amber-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-stone-200 group-hover:text-amber-200 transition-colors truncate">{p.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                            isCompleted ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-400 bg-amber-500/10"}`}>
                            {isCompleted ? "Done" : "Active"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {p.medium && <span className="text-xs text-stone-600">{p.medium}</span>}
                          <span className="flex items-center gap-1 text-xs text-stone-600">
                            <BookOpen size={10} /> {p.postCount} chapter{p.postCount !== 1 ? "s" : ""}
                          </span>
                          {p.startedAt && (
                            <span className="text-xs text-stone-700">
                              Started {new Date(p.startedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">{p.description}</p>
                        )}
                      </div>
                      <ChevronRight size={15} className="shrink-0 text-stone-700 group-hover:text-stone-400 transition-colors mt-0.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <Folder size={15} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-stone-400 space-y-1">
              <p className="font-semibold text-amber-300/80">What's a Project?</p>
              <p>Each project is the permanent record of a single piece — every post you add becomes a chapter in its story. Collectors can follow the arc and purchase the final work.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
