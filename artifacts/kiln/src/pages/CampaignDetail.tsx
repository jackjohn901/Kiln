import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { Target, Clock, Users, ChevronLeft, Heart, Loader2, CheckCircle } from "lucide-react";

interface Reward { id: string; title: string; description: string | null; amountCents: number; maxClaimed: number | null; claimed: number; }
interface Backer { id: string; userName: string; amountCents: number; message: string | null; isAnonymous: boolean; createdAt: string; }
interface Campaign {
  id: string; artistId: string; artistName: string; artistAvatarUrl: string | null;
  title: string; description: string; goalCents: number; raisedCents: number; backerCount: number;
  imageUrl: string | null; status: string; endDate: string; createdAt: string;
  rewards: Reward[]; backers: Backer[];
}

function fmt(c: number) { return `$${(c / 100).toLocaleString("en-US")}` }
function pct(r: number, g: number) { return Math.min(Math.round((r / g) * 100), 100); }
function daysLeft(d: string) { const n = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); return n > 0 ? n : 0; }

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [backing, setBacking] = useState(false);
  const [error, setError] = useState("");
  const { profile } = useProfile();
  const [, navigate] = useLocation();
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const justBacked = search?.get("backed") === "1";

  useEffect(() => {
    fetch(`/api/campaigns/${id}`).then(r => r.json()).then(d => { if (d.id) setCampaign(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  async function handleBack() {
    if (!campaign) return;
    const amountCents = selectedReward ? selectedReward.amountCents : Math.round(parseFloat(customAmount || "0") * 100);
    if (amountCents < 100) { setError("Minimum pledge is $1"); return; }
    setBacking(true); setError("");
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/back`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ amountCents, rewardId: selectedReward?.id, message: message || undefined }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { setError(data.error ?? "Something went wrong"); setBacking(false); }
    } catch { setError("Network error"); setBacking(false); }
  }

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;
  if (!campaign) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Campaign not found</div>;

  const p = pct(campaign.raisedCents, campaign.goalCents);
  const dl = daysLeft(campaign.endDate);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      {justBacked && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle size={16} /> Thank you for backing this campaign! Your pledge has been received.
          </motion.div>
        </div>
      )}
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/campaigns" className="flex items-center gap-1.5 text-stone-400 hover:text-amber-300 text-sm mb-6 transition-colors">
          <ChevronLeft size={15} /> All Campaigns
        </Link>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {campaign.imageUrl && <img src={campaign.imageUrl} alt={campaign.title} className="w-full rounded-2xl object-cover max-h-72" />}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src={campaign.artistAvatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=40&h=40&fit=crop&seed=${campaign.artistId}`} alt={campaign.artistName} className="w-8 h-8 rounded-full object-cover" />
                <Link href={`/artists/${campaign.artistId}`} className="text-sm text-amber-400 hover:text-amber-300">{campaign.artistName}</Link>
              </div>
              <h1 className="text-2xl font-bold text-amber-100 font-serif mb-3">{campaign.title}</h1>
              <p className="text-stone-300 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
            </div>
            {campaign.rewards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Rewards</h2>
                <div className="space-y-3">
                  {campaign.rewards.map(r => (
                    <button key={r.id} onClick={() => setSelectedReward(selectedReward?.id === r.id ? null : r)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedReward?.id === r.id ? "border-amber-500 bg-amber-500/5" : "border-white/8 bg-stone-900 hover:border-white/20"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-amber-400 font-bold">{fmt(r.amountCents)}+</span>
                        {r.maxClaimed && <span className="text-xs text-stone-500">{r.claimed}/{r.maxClaimed} claimed</span>}
                      </div>
                      <p className="font-medium text-stone-200">{r.title}</p>
                      {r.description && <p className="text-sm text-stone-400 mt-1">{r.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {campaign.backers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Backers</h2>
                <div className="space-y-2">
                  {campaign.backers.map(b => (
                    <div key={b.id} className="flex items-center gap-3 py-2 border-b border-white/5">
                      <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-xs text-stone-400 font-bold">
                        {b.isAnonymous ? "?" : b.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-200">{b.isAnonymous ? "Anonymous Backer" : b.userName}</p>
                        {b.message && <p className="text-xs text-stone-500 truncate">"{b.message}"</p>}
                      </div>
                      <span className="text-sm font-medium text-amber-400">{fmt(b.amountCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl bg-stone-900 border border-white/8 p-5">
              <div className="text-3xl font-bold text-amber-400 mb-1">{fmt(campaign.raisedCents)}</div>
              <div className="text-sm text-stone-400 mb-3">raised of {fmt(campaign.goalCents)} goal</div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${p}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-5">
                {[["Backers", campaign.backerCount], ["% Funded", `${p}%`], ["Days Left", dl]].map(([label, val]) => (
                  <div key={label as string}>
                    <div className="text-lg font-bold text-stone-100">{val}</div>
                    <div className="text-xs text-stone-500">{label}</div>
                  </div>
                ))}
              </div>
              {campaign.status === "live" && (
                <>
                  {!selectedReward && (
                    <div className="mb-3">
                      <label className="text-xs text-stone-400 block mb-1">Pledge amount ($)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                        <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                          placeholder="Any amount" min="1"
                          className="w-full bg-stone-800 rounded-xl pl-7 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500" />
                      </div>
                    </div>
                  )}
                  {selectedReward && (
                    <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300 flex items-center justify-between">
                      <span>{selectedReward.title} · {fmt(selectedReward.amountCents)}</span>
                      <button onClick={() => setSelectedReward(null)} className="text-amber-500 hover:text-amber-300">✕</button>
                    </div>
                  )}
                  <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Leave a message (optional)"
                    className="w-full bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500 mb-3" />
                  {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
                  <button onClick={handleBack} disabled={backing || (!selectedReward && !customAmount)}
                    className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                    {backing ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</> : <><Heart size={14} fill="currentColor" /> Back This Campaign</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
