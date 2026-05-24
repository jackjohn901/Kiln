import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { RefreshCw, Plus, Star, Info, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface ResaleListing {
  id: string; artistId: string; artistName: string; title: string; description: string | null;
  price: number; imageUrl: string | null; medium: string | null; technique: string | null;
  originalArtistId: string | null; originalArtistName: string | null; royaltyPercent: number;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "", description: "", price: "", imageUrl: "",
  originalArtistName: "", originalArtistId: "", royaltyPercent: "10",
};

export default function ResaleMarket() {
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const { addItem } = useCart();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/resale")
      .then(r => r.json())
      .then(d => { setListings(d.listings ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price || !form.originalArtistId) {
      setError("Title, price, and original artist ID are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/resale", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          price: Number(form.price),
          imageUrl: form.imageUrl || null,
          originalArtistId: form.originalArtistId,
          originalArtistName: form.originalArtistName || form.originalArtistId,
          royaltyPercent: Number(form.royaltyPercent),
        }),
      });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = `/api/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return; }
        const d = await res.json(); setError(d.error ?? "Failed to list"); setSubmitting(false); return;
      }
      const created = await res.json();
      setListings(prev => [created, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch {
      setError("Network error, please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw size={18} className="text-amber-400" />
              <h1 className="text-2xl font-bold text-amber-100 font-serif">Secondary Market</h1>
            </div>
            <p className="text-stone-400 text-sm">Collector resales — original artists earn royalties on every sale</p>
          </div>
          {profile && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
            >
              <Plus size={15} /> List for Resale
            </button>
          )}
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
          <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            When you buy a resale piece, <strong>the original artist automatically receives a royalty</strong> (typically 10–15%). Kiln tracks provenance so artists benefit from their work appreciating in value.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-stone-900 border border-white/5 overflow-hidden animate-pulse">
                <div className="h-52 bg-stone-800" />
                <div className="p-3 space-y-2"><div className="h-3 bg-stone-800 rounded w-3/4" /><div className="h-3 bg-stone-800 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24">
            <RefreshCw size={32} className="mx-auto text-stone-700 mb-3" />
            <p className="text-stone-400">No resale listings yet</p>
            <p className="text-stone-600 text-sm mt-1">Be the first to list a piece from your collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((l, i) => (
              <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="rounded-2xl bg-stone-900 border border-white/5 overflow-hidden hover:border-amber-500/20 transition-colors group">
                  <Link href={`/listings/${l.id}`} className="block relative h-52 overflow-hidden bg-stone-800">
                    {l.imageUrl
                      ? <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-stone-600 text-xs">No image</div>
                    }
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/80 text-stone-950 text-[10px] font-bold">
                      <RefreshCw size={8} /> Resale
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link href={`/listings/${l.id}`}>
                      <h3 className="font-semibold text-stone-100 text-sm mb-0.5 line-clamp-1">{l.title}</h3>
                    </Link>
                    <p className="text-xs text-stone-500 mb-1">Listed by {l.artistName}</p>
                    {l.originalArtistName && (
                      <p className="text-xs text-amber-400/80 flex items-center gap-1 mb-2">
                        <Star size={9} fill="currentColor" /> Original: {l.originalArtistName} · {l.royaltyPercent}% royalty
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-stone-100">${l.price.toLocaleString()}</span>
                      <button onClick={() => addItem(l as any)}
                        className="px-3 py-1.5 rounded-full bg-stone-800 text-stone-300 text-xs font-medium hover:bg-amber-500 hover:text-stone-950 transition-colors">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* List for Resale Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/80"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-51 rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6 max-h-[90vh] overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-amber-100">List a Piece for Resale</h2>
                <button onClick={() => setShowModal(false)} className="rounded-full bg-white/10 p-1.5 text-stone-400 hover:text-stone-200">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Large Celadon Vessel"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Condition, provenance, why you're selling…" rows={2}
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Price ($) *</label>
                    <input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 450"
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Artist Royalty %</label>
                    <input type="number" min="0" max="30" value={form.royaltyPercent} onChange={e => setForm(f => ({ ...f, royaltyPercent: e.target.value }))}
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-amber-500/40" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Image URL</label>
                  <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://…"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Original Artist ID * <span className="text-stone-600">(e.g. seed-elena-vasquez)</span></label>
                  <input value={form.originalArtistId} onChange={e => setForm(f => ({ ...f, originalArtistId: e.target.value }))}
                    placeholder="seed-elena-vasquez"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Original Artist Name</label>
                  <input value={form.originalArtistName} onChange={e => setForm(f => ({ ...f, originalArtistName: e.target.value }))}
                    placeholder="Elena Vasquez"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400 hover:border-white/20 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60">
                    {submitting ? "Listing…" : "List for Resale"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
