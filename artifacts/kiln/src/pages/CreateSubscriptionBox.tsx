import { useState } from "react";
import { Link, useLocation } from "wouter";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { Package, ChevronLeft, Loader2 } from "lucide-react";

export default function CreateSubscriptionBox() {
  const { profile } = useProfile();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ title: "", description: "", imageUrl: "", priceCents: "", frequency: "monthly", maxSubscribers: "", nextShipDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!profile) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
      <Link href="/setup" className="text-amber-400">Sign in to create a box</Link>
    </div>
  );

  const inputClass = "w-full bg-stone-900 border border-white/8 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 outline-none focus:ring-1 focus:ring-amber-500";
  const field = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.priceCents) { setError("Title and price are required"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/subscription-boxes", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: form.title, description: form.description || undefined, imageUrl: form.imageUrl || undefined, priceCents: Math.round(parseFloat(form.priceCents) * 100), frequency: form.frequency, maxSubscribers: form.maxSubscribers ? parseInt(form.maxSubscribers) : undefined, nextShipDate: form.nextShipDate || undefined }),
      });
      const data = await res.json();
      if (data.id) navigate("/subscription-boxes");
      else { setError(data.error ?? "Failed"); setSubmitting(false); }
    } catch { setError("Network error"); setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link href="/subscription-boxes" className="flex items-center gap-1.5 text-stone-400 hover:text-amber-300 text-sm mb-6 transition-colors"><ChevronLeft size={15} /> Subscription Boxes</Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Package size={20} className="text-amber-400" /></div>
          <div><h1 className="text-xl font-bold text-amber-100">Create a Subscription Box</h1><p className="text-stone-500 text-sm">Offer curated materials and work to your community</p></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Box Name *</label><input value={form.title} onChange={e => field("title", e.target.value)} placeholder="e.g. Monthly Studio Bundle" className={inputClass} /></div>
          <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Description</label><textarea value={form.description} onChange={e => field("description", e.target.value)} rows={4} placeholder="What's inside? What makes it special?" className={`${inputClass} resize-none`} /></div>
          <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Image URL</label><input value={form.imageUrl} onChange={e => field("imageUrl", e.target.value)} placeholder="https://…" className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Price ($) *</label><input type="number" min="1" step="0.01" value={form.priceCents} onChange={e => field("priceCents", e.target.value)} placeholder="45.00" className={inputClass} /></div>
            <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={e => field("frequency", e.target.value)} className={`${inputClass} cursor-pointer`}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">Max Subscribers</label><input type="number" value={form.maxSubscribers} onChange={e => field("maxSubscribers", e.target.value)} placeholder="Unlimited" className={inputClass} /></div>
            <div><label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">First Ship Date</label><input type="date" value={form.nextShipDate} onChange={e => field("nextShipDate", e.target.value)} className={inputClass} /></div>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-bold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : <><Package size={15} /> Create Box</>}
          </button>
        </form>
      </div>
    </div>
  );
}
