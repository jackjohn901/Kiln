import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { Package, Plus, Loader2, X, CheckCircle, MapPin } from "lucide-react";

interface Box {
  id: string; artistId: string; artistName: string; title: string; description: string | null;
  imageUrl: string | null; priceCents: number; frequency: string; subscriberCount: number;
  maxSubscribers: number | null; isActive: boolean; nextShipDate: string | null; createdAt: string;
}

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

interface SubscribeModalProps { box: Box; onClose: () => void; onSuccess: () => void; }

function SubscribeModal({ box, onClose, onSuccess }: SubscribeModalProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    if (!address.trim()) { setError("Shipping address is required"); return; }
    setLoading(true); setError("");
    const res = await fetch(`/api/subscription-boxes/${box.id}/subscribe`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ shippingAddress: address }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setError(data.error ?? "Something went wrong"); setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-stone-900 rounded-2xl overflow-hidden border border-white/8"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            {box.imageUrl && <img src={box.imageUrl} alt={box.title} className="w-10 h-10 rounded-lg object-cover" />}
            <div>
              <p className="font-semibold text-stone-100 text-sm">{box.title}</p>
              <p className="text-xs text-stone-500">{box.artistName} · {fmt(box.priceCents)}/{box.frequency === "quarterly" ? "quarter" : "month"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <MapPin size={11} /> Shipping Address
            </label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} placeholder="123 Main St&#10;Portland, OR 97201&#10;United States"
              className="w-full bg-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 resize-none outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button onClick={handleSubscribe} disabled={loading || !address.trim()}
            className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-bold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</> : <><Package size={14} /> Subscribe — {fmt(box.priceCents)}/{box.frequency === "quarterly" ? "qtr" : "mo"}</>}
          </button>
          <p className="text-[10px] text-stone-600 text-center">Recurring subscription via Stripe. Cancel anytime.</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function SubscriptionBoxes() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Box | null>(null);
  const { profile } = useProfile();
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const justSubscribed = search?.get("subscribed") === "1";

  useEffect(() => {
    fetch("/api/subscription-boxes").then(r => r.json()).then(d => { setBoxes(d.boxes ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {justSubscribed && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle size={15} /> Subscribed! Your first box will ship on the next ship date.
          </motion.div>
        )}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package size={18} className="text-amber-400" />
              <h1 className="text-2xl font-bold text-amber-100 font-serif">Subscription Boxes</h1>
            </div>
            <p className="text-stone-400 text-sm">Monthly curation of craft materials, tools, and original work</p>
          </div>
          {profile && (
            <Link href="/subscription-boxes/create" className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
              <Plus size={15} /> Create Box
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="rounded-2xl bg-stone-900 border border-white/5 overflow-hidden animate-pulse"><div className="h-48 bg-stone-800" /><div className="p-4 space-y-2"><div className="h-4 bg-stone-800 rounded w-3/4" /></div></div>)}
          </div>
        ) : boxes.length === 0 ? (
          <div className="text-center py-24">
            <Package size={32} className="mx-auto text-stone-700 mb-3" />
            <p className="text-stone-400 mb-2">No subscription boxes yet</p>
            <p className="text-stone-600 text-sm">Artists can offer curated monthly boxes of materials and work</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {boxes.map((box, i) => (
              <motion.div key={box.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="rounded-2xl bg-stone-900 border border-white/5 overflow-hidden hover:border-amber-500/20 transition-colors">
                  <div className="relative h-48 overflow-hidden bg-stone-800">
                    {box.imageUrl ? <img src={box.imageUrl} alt={box.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package size={32} className="text-stone-700" /></div>}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-amber-300 text-[11px] font-medium capitalize">{box.frequency}</div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/artists/${box.artistId}`} className="text-xs text-stone-400 hover:text-amber-300 transition-colors">{box.artistName}</Link>
                    </div>
                    <h3 className="font-semibold text-stone-100 mb-1">{box.title}</h3>
                    {box.description && <p className="text-xs text-stone-500 mb-3 line-clamp-2">{box.description}</p>}
                    {box.nextShipDate && <p className="text-xs text-stone-500 mb-3">Next ship: {new Date(box.nextShipDate).toLocaleDateString()}</p>}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-stone-100">{fmt(box.priceCents)}</span>
                        <span className="text-xs text-stone-500">/{box.frequency === "quarterly" ? "qtr" : "mo"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {box.subscriberCount > 0 && <span className="text-xs text-stone-500">{box.subscriberCount} subscribers</span>}
                        <button onClick={() => setSelected(box)}
                          className="px-4 py-2 rounded-full bg-amber-500 text-stone-950 font-semibold text-xs hover:bg-amber-400 transition-colors">
                          Subscribe
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <SubscribeModal box={selected} onClose={() => setSelected(null)} onSuccess={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
