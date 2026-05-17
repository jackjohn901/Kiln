import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { RefreshCw, Plus, Star, Info } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface ResaleListing {
  id: string; artistId: string; artistName: string; title: string; description: string | null;
  price: number; imageUrl: string | null; medium: string | null; technique: string | null;
  originalArtistId: string | null; originalArtistName: string | null; royaltyPercent: number;
  createdAt: string;
}

export default function ResaleMarket() {
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const { addItem } = useCart();

  useEffect(() => {
    fetch("/api/resale").then(r => r.json()).then(d => { setListings(d.listings ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

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
            <Link href="/resale/list" className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
              <Plus size={15} /> List for Resale
            </Link>
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
    </div>
  );
}
