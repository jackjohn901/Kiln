import { useState } from "react";
import { X, Heart, Loader2, ExternalLink } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

const AMOUNTS = [5, 10, 25, 50, 100];

interface Props {
  artistId: string;
  artistName: string;
  artistAvatarUrl: string;
  postId?: string;
  onClose: () => void;
}

export default function TipModal({ artistId, artistName, artistAvatarUrl, postId, onClose }: Props) {
  const { profile } = useProfile();
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalAmount = amount ?? (custom ? parseFloat(custom) : null);
  const amountCents = finalAmount ? Math.round(finalAmount * 100) : 0;

  async function handleSend() {
    if (!finalAmount || finalAmount < 1) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tips/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId: artistId, toUserName: artistName, postId, amountCents, message: message || undefined }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="relative w-full max-w-sm bg-stone-900 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ animation: "popIn 0.2s ease-out" }}>
        <style>{`@keyframes popIn{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <img src={artistAvatarUrl || `https://picsum.photos/seed/${artistId}/80/80`} alt={artistName} className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className="text-sm font-semibold text-stone-100">Support {artistName}</p>
              <p className="text-xs text-stone-500">100% goes to the artist · Powered by Stripe</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {!profile ? (
            <div className="text-xs text-stone-500 text-center bg-stone-800 rounded-xl p-3">
              <a href="/setup" className="text-amber-400 hover:text-amber-300">Sign in</a> to tip artists
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Choose amount</p>
                <div className="grid grid-cols-5 gap-2">
                  {AMOUNTS.map((a) => (
                    <button key={a} onClick={() => { setAmount(a); setCustom(""); }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${amount === a && !custom ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-300 hover:border-stone-500"}`}
                    >${a}</button>
                  ))}
                </div>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                  <input type="number" value={custom} onChange={(e) => { setCustom(e.target.value); setAmount(null); }}
                    placeholder="Custom amount" min="1"
                    className="w-full bg-stone-800 rounded-xl pl-7 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Message <span className="text-stone-600 normal-case font-normal">(optional)</span>
                </label>
                <input value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your work inspires me…"
                  className="w-full bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
              {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
              <button onClick={handleSend} disabled={!finalAmount || finalAmount < 1 || loading}
                className="w-full py-3 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</> : <><Heart size={14} fill="currentColor" /> Send ${finalAmount ?? "—"}</>}
              </button>
              <p className="text-[10px] text-stone-600 text-center flex items-center justify-center gap-1">
                <ExternalLink size={9} /> Secure payment via Stripe
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
