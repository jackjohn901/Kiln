import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Megaphone, Trash2, X, Users, CheckCircle, Loader2, Share2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface Collaborator {
  id: string;
  listingId: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorAvatarUrl: string | null;
  role: string | null;
  contributionPercent: number;
  socialPosted: boolean;
  addedAt: string;
}

const ROLES = [
  "Threw the form", "Glazed", "Fired", "Designed", "Carved",
  "Assembled", "Photographed", "Packaged", "Collaborated",
];

export default function ListingCollaborators() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const [announceResult, setAnnounceResult] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    collaboratorId: "", collaboratorName: "", collaboratorAvatarUrl: "",
    role: "", contributionPercent: "0",
  });

  useEffect(() => {
    if (!listingId) return;
    fetch(`/api/listings/${listingId}/collaborators`, { credentials: "include" })
      .then((r) => r.ok ? r.json() as Promise<{ collaborators: Collaborator[] }> : null)
      .then((data) => { if (data) setCollaborators(data.collaborators); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  const totalPercent = collaborators.reduce((s, c) => s + c.contributionPercent, 0);

  async function addCollaborator() {
    if (!form.collaboratorName.trim() || !listingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/collaborators`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId: form.collaboratorId.trim() || undefined,
          collaboratorName: form.collaboratorName,
          collaboratorAvatarUrl: form.collaboratorAvatarUrl || undefined,
          role: form.role || undefined,
          contributionPercent: parseInt(form.contributionPercent) || 0,
        }),
      });
      if (res.ok) {
        const collab = await res.json() as Collaborator;
        setCollaborators((prev) => [...prev, collab]);
        setForm({ collaboratorId: "", collaboratorName: "", collaboratorAvatarUrl: "", role: "", contributionPercent: "0" });
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeCollaborator(collabId: string) {
    if (!listingId) return;
    setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
    await fetch(`/api/listings/${listingId}/collaborators/${collabId}`, {
      method: "DELETE", credentials: "include",
    });
  }

  async function announce() {
    if (!listingId) return;
    setAnnouncing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/collaborators/announce`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json() as { posted: string[]; total: number };
        setAnnounceResult(data.posted);
        const ids = new Set(collaborators.filter((c) => data.posted.includes(c.collaboratorName)).map((c) => c.id));
        setCollaborators((prev) => prev.map((c) => ids.has(c.id) ? { ...c, socialPosted: true } : c));
      }
    } finally {
      setAnnouncing(false);
    }
  }

  const unposted = collaborators.filter((c) => !c.socialPosted).length;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/listings/${listingId}`}>
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Users size={20} className="text-amber-500" />
              Collaborators
            </h1>
            <p className="text-xs text-stone-500">Credit all hands that made this piece</p>
          </div>
        </div>

        {/* Attribution visualization */}
        {collaborators.length > 0 && (
          <div className="mb-5 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
            <p className="text-xs font-semibold text-stone-400 mb-3">Contribution split</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
              {collaborators.map((c, i) => {
                const colors = ["bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500"];
                const pct = c.contributionPercent || Math.round(100 / collaborators.length);
                return (
                  <div
                    key={c.id}
                    className={`${colors[i % colors.length]} h-full transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${c.collaboratorName}: ${pct}%`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {collaborators.map((c, i) => {
                const colors = ["text-amber-400", "text-sky-400", "text-emerald-400", "text-purple-400", "text-pink-400"];
                return (
                  <span key={c.id} className={`flex items-center gap-1 text-[11px] ${colors[i % colors.length]}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
                    {c.collaboratorName}
                    {c.contributionPercent > 0 && ` ${c.contributionPercent}%`}
                    {c.role && ` · ${c.role}`}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Announce button */}
        {collaborators.length > 0 && unposted > 0 && (
          <div className="mb-4">
            <button
              onClick={announce}
              disabled={announcing}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 py-3.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
            >
              {announcing ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
              Announce on all collaborators' social accounts
            </button>
            <p className="text-center text-[10px] text-stone-600 mt-1">Posts to each collaborator's connected Instagram, TikTok, etc.</p>
          </div>
        )}

        {announceResult && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3"
          >
            <CheckCircle size={18} className="text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              {announceResult.length > 0
                ? `Posted to ${announceResult.join(", ")}'s social accounts`
                : "No connected social accounts found for collaborators"}
            </p>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-amber-500" size={24} />
          </div>
        ) : collaborators.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 font-medium">No collaborators yet</p>
            <p className="text-stone-600 text-sm mt-1 max-w-xs mx-auto">
              Add everyone who contributed to this piece. Their social accounts will be cross-posted when you announce.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {collaborators.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center text-sm font-bold text-amber-300">
                  {c.collaboratorName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-100 text-sm">{c.collaboratorName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.role && <span className="text-[11px] text-stone-500">{c.role}</span>}
                    {c.contributionPercent > 0 && (
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">{c.contributionPercent}%</span>
                    )}
                    {c.socialPosted && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                        <Share2 size={9} /> Posted
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeCollaborator(c.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-600 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowForm(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3.5 text-sm text-stone-500 hover:border-white/20 hover:text-stone-300 transition-colors"
        >
          <Plus size={14} /> Add collaborator
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-amber-100">Add Collaborator</h2>
                <button onClick={() => setShowForm(false)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
              </div>
              <div className="space-y-3">
                <input
                  value={form.collaboratorName} onChange={(e) => setForm((f) => ({ ...f, collaboratorName: e.target.value }))}
                  placeholder="Name * (e.g. Elena Vasquez)"
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                />
                <input
                  value={form.collaboratorId} onChange={(e) => setForm((f) => ({ ...f, collaboratorId: e.target.value }))}
                  placeholder="Kiln user ID (optional — for auto-posting)"
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                />
                <select
                  value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-stone-300 focus:outline-none focus:border-amber-500/40"
                >
                  <option value="">Role (optional)</option>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1">Contribution %</label>
                  <input
                    value={form.contributionPercent}
                    onChange={(e) => setForm((f) => ({ ...f, contributionPercent: e.target.value }))}
                    type="number" min={0} max={100}
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                  />
                  {totalPercent + parseInt(form.contributionPercent || "0") > 100 && (
                    <p className="text-[10px] text-red-400 mt-1">Total exceeds 100%</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button
                  onClick={addCollaborator}
                  disabled={saving || !form.collaboratorName.trim()}
                  className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
