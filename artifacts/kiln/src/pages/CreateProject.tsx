import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Folder, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

const STAGES = ["Sketch", "Sourcing", "Forming", "Throwing", "Carving", "Bisque", "Glazing", "Firing", "Finishing", "Photography"];

export default function CreateProject() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [startedAt, setStartedAt] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <p className="text-stone-500">Sign in to create a project</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Give your project a title."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), description, medium, startedAt }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { project: { id: string } };
      navigate(`/projects/${data.project.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/projects/mine">
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">New Project</h1>
            <p className="text-xs text-stone-500">Track a piece's full journey from start to sale</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Project Title <span className="text-rose-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Anagama Wood-fire Series 2026"
              className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this piece about? What are you exploring?"
              className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">Medium</label>
            <input
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="e.g. Stoneware, Copper, White Oak"
              className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">Started</label>
            <input
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <Folder size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-stone-400 space-y-1">
                <p className="font-semibold text-amber-300">What is a Project?</p>
                <p>A Project is the permanent story of a single piece — from raw material to finished work to sale. Each post you add becomes a chapter. Collectors follow the arc and can purchase when it's done.</p>
                <p className="text-stone-500">Think: a 6-month Anagama firing, a year-long tapestry, or a custom commission from sketch to delivery.</p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full rounded-full bg-amber-500 py-3.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
