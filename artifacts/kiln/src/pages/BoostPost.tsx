import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { TrendingUp, ChevronLeft, Loader2, Zap, CheckCircle } from "lucide-react";

interface Post { id: string; title?: string; caption?: string; artistName: string; mediaUrl?: string; }

const BUDGETS = [500, 1000, 2500, 5000]; // cents
const DURATIONS = [3, 7, 14, 30];

export default function BoostPost() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState("");
  const [duration, setDuration] = useState(7);
  const [targetTechnique, setTargetTechnique] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { profile } = useProfile();
  const [, navigate] = useLocation();
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const justBoosted = search?.get("boosted") === "1";

  useEffect(() => {
    fetch(`/api/posts/${postId}`, { credentials: "include" }).then(r => r.json()).then(d => { if (d.id) setPost(d); }).catch(() => {});
  }, [postId]);

  if (!profile) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
      <p>Sign in to boost posts. <Link href="/setup" className="text-amber-400">Sign In</Link></p>
    </div>
  );

  const finalBudget = budget ?? (customBudget ? Math.round(parseFloat(customBudget) * 100) : 0);

  async function handleBoost() {
    if (finalBudget < 500) { setError("Minimum budget is $5"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/boosts", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ postId, budgetCents: finalBudget, durationDays: duration, targetTechnique: targetTechnique || undefined, targetLocation: targetLocation || undefined }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setError(data.error ?? "Something went wrong"); setLoading(false); }
    } catch { setError("Network error"); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link href={`/posts/${postId}`} className="flex items-center gap-1.5 text-stone-400 hover:text-amber-300 text-sm mb-6 transition-colors">
          <ChevronLeft size={15} /> Back to Post
        </Link>

        {justBoosted ? (
          <div className="text-center py-16">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <h2 className="text-xl font-bold text-stone-100 mb-2">Post Boosted!</h2>
            <p className="text-stone-400 text-sm mb-6">Your post is now being promoted to a wider audience.</p>
            <Link href="/" className="px-6 py-2.5 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors">Back to Feed</Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-amber-100">Boost Post</h1>
                <p className="text-stone-500 text-sm">Reach more people in the Kiln community</p>
              </div>
            </div>

            {post && (
              <div className="mb-6 rounded-xl bg-stone-900 border border-white/8 p-3 flex items-center gap-3">
                {post.mediaUrl && <img src={post.mediaUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-200 truncate">{post.caption ?? post.title ?? "Post"}</p>
                  <p className="text-xs text-stone-500">{post.artistName}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">Budget</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {BUDGETS.map(b => (
                    <button key={b} onClick={() => { setBudget(b); setCustomBudget(""); }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${budget === b && !customBudget ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-300 hover:border-stone-500"}`}>
                      ${b / 100}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                  <input type="number" value={customBudget} onChange={e => { setCustomBudget(e.target.value); setBudget(null); }}
                    placeholder="Custom budget" min="5"
                    className="w-full bg-stone-900 border border-white/8 rounded-xl pl-7 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${duration === d ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-300 hover:border-stone-500"}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">Target Audience (optional)</label>
                <div className="space-y-2">
                  <input value={targetTechnique} onChange={e => setTargetTechnique(e.target.value)} placeholder="Technique (e.g. Ceramics, Glasswork)"
                    className="w-full bg-stone-900 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500" />
                  <input value={targetLocation} onChange={e => setTargetLocation(e.target.value)} placeholder="Location (e.g. Portland OR)"
                    className="w-full bg-stone-900 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>

              {finalBudget >= 500 && (
                <div className="rounded-xl bg-stone-900 border border-white/5 p-4 text-xs text-stone-400 space-y-1">
                  <div className="flex justify-between"><span>Budget</span><span className="text-stone-200">${(finalBudget / 100).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Duration</span><span className="text-stone-200">{duration} days</span></div>
                  <div className="flex justify-between font-medium text-stone-300 pt-1 border-t border-white/5 mt-1">
                    <span>Est. reach</span><span className="text-amber-400">{Math.round(finalBudget / 100 * 80 * duration / 7).toLocaleString()}+ views</span>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-rose-400">{error}</p>}
              <button onClick={handleBoost} disabled={loading || finalBudget < 500}
                className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-bold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Redirecting…</> : <><Zap size={15} /> Boost for ${(finalBudget / 100).toFixed(2)}</>}
              </button>
              <p className="text-[10px] text-stone-600 text-center">Secure payment via Stripe. You won't be charged until the boost goes live.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
