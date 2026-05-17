import { useState } from "react";
import { useLocation } from "wouter";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { Target, Plus, Trash2, Loader2, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

interface Reward { title: string; description: string; amountCents: number; maxClaimed: number | null; }

export default function CreateCampaign() {
  const { profile } = useProfile();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ title: "", description: "", goalCents: "", category: "", imageUrl: "", endDate: "" });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newReward, setNewReward] = useState({ title: "", description: "", amountCents: "", maxClaimed: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!profile) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
      <div className="text-center"><p className="mb-4">Sign in to create a campaign</p><Link href="/setup" className="text-amber-400">Sign In</Link></div>
    </div>
  );

  function addReward() {
    if (!newReward.title || !newReward.amountCents) return;
    setRewards(r => [...r, { title: newReward.title, description: newReward.description, amountCents: Math.round(parseFloat(newReward.amountCents) * 100), maxClaimed: newReward.maxClaimed ? parseInt(newReward.maxClaimed) : null }]);
    setNewReward({ title: "", description: "", amountCents: "", maxClaimed: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.description || !form.goalCents || !form.endDate) { setError("All fields are required"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: form.title, description: form.description, goalCents: Math.round(parseFloat(form.goalCents) * 100), category: form.category || undefined, imageUrl: form.imageUrl || undefined, endDate: new Date(form.endDate).toISOString(), rewards }),
      });
      const data = await res.json();
      if (data.id) navigate(`/campaigns/${data.id}`);
      else { setError(data.error ?? "Failed to create campaign"); setSubmitting(false); }
    } catch { setError("Network error"); setSubmitting(false); }
  }

  const field = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }));
  const inputClass = "w-full bg-stone-900 border border-white/8 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/campaigns" className="flex items-center gap-1.5 text-stone-400 hover:text-amber-300 text-sm mb-6 transition-colors"><ChevronLeft size={15} /> Campaigns</Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Target size={20} className="text-amber-400" /></div>
          <div><h1 className="text-xl font-bold text-amber-100">Launch a Campaign</h1><p className="text-stone-500 text-sm">Rally your community behind your work</p></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Campaign Title *</label>
            <input value={form.title} onChange={e => field("title", e.target.value)} placeholder="e.g. New Anagama Kiln Build" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => field("description", e.target.value)} rows={5} placeholder="Tell your story. What are you funding and why?" className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Funding Goal ($) *</label>
              <input type="number" min="50" value={form.goalCents} onChange={e => field("goalCents", e.target.value)} placeholder="5000" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">End Date *</label>
              <input type="date" value={form.endDate} onChange={e => field("endDate", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Category</label>
              <select value={form.category} onChange={e => field("category", e.target.value)} className={`${inputClass} cursor-pointer`}>
                <option value="">Select…</option>
                {["Equipment", "Studio", "Collection", "Education", "Exhibition", "Materials", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Cover Image URL</label>
              <input value={form.imageUrl} onChange={e => field("imageUrl", e.target.value)} placeholder="https://…" className={inputClass} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Rewards (optional)</label>
            </div>
            <div className="space-y-2 mb-3">
              {rewards.map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-stone-900 border border-white/5 px-4 py-2.5">
                  <div className="flex-1 min-w-0"><p className="text-sm text-stone-200">{r.title}</p><p className="text-xs text-stone-500">${(r.amountCents / 100).toFixed(0)}+ pledge{r.maxClaimed ? ` · ${r.maxClaimed} max` : ""}</p></div>
                  <button type="button" onClick={() => setRewards(r => r.filter((_, j) => j !== i))} className="text-stone-600 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-stone-900 border border-white/8 p-4 space-y-3">
              <p className="text-xs text-stone-500">Add a reward tier</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={newReward.title} onChange={e => setNewReward(r => ({ ...r, title: e.target.value }))} placeholder="Reward title" className={inputClass} />
                <input type="number" value={newReward.amountCents} onChange={e => setNewReward(r => ({ ...r, amountCents: e.target.value }))} placeholder="Min pledge ($)" className={inputClass} />
              </div>
              <input value={newReward.description} onChange={e => setNewReward(r => ({ ...r, description: e.target.value }))} placeholder="What do backers receive?" className={inputClass} />
              <div className="flex items-center gap-3">
                <input type="number" value={newReward.maxClaimed} onChange={e => setNewReward(r => ({ ...r, maxClaimed: e.target.value }))} placeholder="Max (optional)" className={`${inputClass} flex-1`} />
                <button type="button" onClick={addReward} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 text-stone-300 text-sm hover:bg-stone-700 transition-colors">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-bold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={15} className="animate-spin" /> Launching…</> : <><Target size={15} /> Launch Campaign</>}
          </button>
        </form>
      </div>
    </div>
  );
}
