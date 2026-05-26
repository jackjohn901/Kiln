import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { Target, Clock, Users, Plus, TrendingUp, Flame } from "lucide-react";

interface Campaign {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  title: string;
  description: string;
  goalCents: number;
  raisedCents: number;
  backerCount: number;
  category: string | null;
  imageUrl: string | null;
  status: string;
  endDate: string;
  createdAt: string;
}

function pct(raised: number, goal: number) { return Math.min(Math.round((raised / goal) * 100), 100); }
function fmt(cents: number) { return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}` }
function daysLeft(endDate: string) {
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return d > 0 ? `${d}d left` : "Ended";
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile();
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/api/campaigns").then(r => r.json()).then(d => {
      setCampaigns(d.campaigns ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-100 font-serif">Studio Campaigns</h1>
            <p className="text-stone-400 text-sm mt-1">Fund equipment, collections, and creative journeys</p>
          </div>
          {profile && (
            <Link href="/campaigns/create" className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
              <Plus size={15} /> Start Campaign
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-stone-900 border border-white/5 overflow-hidden animate-pulse">
                <div className="h-44 bg-stone-800" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-stone-800 rounded w-3/4" />
                  <div className="h-3 bg-stone-800 rounded w-full" />
                  <div className="h-2 bg-stone-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Target size={28} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-stone-300 mb-2">No campaigns yet</h2>
            <p className="text-stone-500 text-sm mb-6 max-w-xs">Be the first to launch a studio campaign and rally your community behind your work.</p>
            {profile && (
              <Link href="/campaigns/create" className="px-6 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">
                Launch First Campaign
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((c, i) => {
              const p = pct(c.raisedCents, c.goalCents);
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/campaigns/${c.id}`} className="block rounded-2xl bg-stone-900 border border-white/5 overflow-hidden hover:border-amber-500/20 transition-colors group">
                    <div className="relative h-44 overflow-hidden bg-stone-800">
                      {c.imageUrl
                        ? <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center"><Flame size={32} className="text-stone-700" /></div>
                      }
                      {c.category && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-amber-300 text-xs font-medium">{c.category}</span>
                      )}
                      {c.status === "funded" && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-green-500/80 text-white text-xs font-medium">Funded!</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={c.artistAvatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=40&h=40&fit=crop&seed=${c.artistId}`} alt={c.artistName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs text-stone-400">{c.artistName}</span>
                      </div>
                      <h3 className="font-semibold text-stone-100 mb-1 line-clamp-2 leading-tight">{c.title}</h3>
                      <p className="text-xs text-stone-500 mb-3 line-clamp-2">{c.description}</p>
                      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${p}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <span><strong className="text-amber-300">{fmt(c.raisedCents)}</strong> of {fmt(c.goalCents)} · <strong className="text-stone-300">{p}%</strong></span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users size={10} />{c.backerCount}</span>
                          <span className="flex items-center gap-1"><Clock size={10} />{daysLeft(c.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
