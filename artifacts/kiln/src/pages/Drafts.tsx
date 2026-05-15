import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { FileVideo, FileImage, Trash2, Send, Plus, Clock } from "lucide-react";
import Nav from "@/components/Nav";
import { type Draft, getDrafts, deleteDraft, publishDraft } from "@/data/posts";
import { useProfile } from "@/contexts/ProfileContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

export default function Drafts() {
  const { profile } = useProfile();
  const [, navigate] = useLocation();
  const [drafts, setDrafts] = useState<Draft[]>(() => getDrafts());
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = useCallback((id: string) => {
    setDeleting(id);
    setTimeout(() => {
      deleteDraft(id);
      setDrafts(getDrafts());
      setDeleting(null);
    }, 300);
  }, []);

  const handlePublish = useCallback((id: string) => {
    setPublishing(id);
    setTimeout(() => {
      publishDraft(id);
      setDrafts(getDrafts());
      setPublishing(null);
    }, 800);
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="mb-4 text-stone-400">Sign in to view your drafts.</p>
          <Link href="/setup" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950">Set up profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-800 border border-white/8">
              <Clock size={18} className="text-stone-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-amber-100">Drafts</h1>
              <p className="text-sm text-stone-500">{drafts.length} saved {drafts.length === 1 ? "draft" : "drafts"}</p>
            </div>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Plus size={14} />
            New post
          </Link>
        </div>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Clock size={40} className="mb-4 text-stone-700" />
            <p className="mb-2 font-medium text-stone-400">No drafts saved</p>
            <p className="mb-6 text-sm text-stone-600">
              In the Create flow, tap "Save as draft" to keep your work for later.
            </p>
            <Link
              href="/create"
              className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Start creating
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => {
              const isVid = draft.type === "video";
              const Icon = isVid ? FileVideo : FileImage;
              const isPublishing = publishing === draft.id;
              const isDeleting = deleting === draft.id;

              return (
                <div
                  key={draft.id}
                  className={`flex gap-4 rounded-2xl border border-white/8 bg-stone-900/40 p-4 transition-opacity ${isDeleting ? "opacity-0" : "opacity-100"}`}
                  style={{ transition: "opacity 0.3s" }}
                >
                  {/* Thumbnail */}
                  <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-800 border border-white/5">
                    {draft.mediaUrl ? (
                      <img src={draft.mediaUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon size={20} className="text-stone-600" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5">
                      <Icon size={8} className="text-stone-400" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-200 line-clamp-2 leading-tight">
                      {draft.caption || <span className="italic text-stone-600">No caption</span>}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {draft.technique && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                          {draft.technique}
                        </span>
                      )}
                      {draft.seriesName && (
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
                          Series: {draft.seriesName}
                        </span>
                      )}
                      {draft.isDrop && (
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400">
                          Drop ${draft.dropPrice}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-stone-600">
                      <Clock size={9} />
                      Saved {timeAgo(draft.savedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePublish(draft.id)}
                      disabled={isPublishing}
                      className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      <Send size={11} />
                      {isPublishing ? "Publishing…" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
