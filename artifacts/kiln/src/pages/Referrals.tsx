import { useState, useEffect } from "react";
import { Copy, Check, Users, Gift, Zap, Globe, Loader2, ChevronRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface ReferralStats {
  code: string;
  useCount: number;
  milestone: string | null;
  nextMilestone: { label: string; at: number; reward: string } | null;
}

const MILESTONES = [
  { at: 1, label: "First Invite", reward: "Early Adopter badge", icon: "⭐", color: "text-stone-300" },
  { at: 10, label: "Recruiter", reward: "Promotion tools + Recruiter badge", icon: "📣", color: "text-amber-400" },
  { at: 100, label: "Evangelist", reward: "Revenue share + Evangelist badge", icon: "🌐", color: "text-purple-400" },
];

export default function Referrals() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [redeemMsg, setRedeemMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch("/api/me/referral", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const inviteUrl = stats ? `https://kilnfire.replit.app/kiln/?ref=${stats.code}` : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemStatus("loading");
    try {
      const r = await fetch("/api/referrals/use", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode.trim().toUpperCase() }),
      });
      const data = await r.json();
      if (r.ok) {
        setRedeemStatus("success");
        setRedeemMsg("Code applied! Welcome to the Kiln community.");
      } else {
        setRedeemStatus("error");
        setRedeemMsg(data.error ?? "Invalid code");
      }
    } catch {
      setRedeemStatus("error");
      setRedeemMsg("Something went wrong");
    }
  };

  const progress = stats ? Math.min(100, (stats.useCount / (stats.nextMilestone?.at ?? 100)) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-28 md:pb-8">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-16 space-y-6">

        <div className="pt-4 space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold">Invite Artists</h1>
          </div>
          <p className="text-stone-400 text-sm">Grow Kiln. Earn rewards. Build your legacy.</p>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-8 text-center space-y-3">
            <Users className="w-10 h-10 mx-auto text-stone-600" />
            <p className="text-stone-400">Sign in to get your invite code</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-500" /></div>
        ) : stats ? (
          <>
            {/* Invite card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wide">Your invite code</p>
                  <p className="text-3xl font-bold font-mono tracking-widest text-amber-300 mt-1">{stats.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{stats.useCount}</p>
                  <p className="text-xs text-stone-400">artists invited</p>
                </div>
              </div>

              <div className="bg-stone-950/50 rounded-xl p-3 font-mono text-sm text-stone-300 break-all">{inviteUrl}</div>

              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  copied ? "bg-green-500/20 text-green-400" : "bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95"
                }`}
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy invite link</>}
              </button>
            </motion.div>

            {/* Progress to next milestone */}
            {stats.nextMilestone && (
              <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Next milestone: {stats.nextMilestone.label}</h3>
                  <span className="text-xs text-stone-400">{stats.useCount} / {stats.nextMilestone.at}</span>
                </div>
                <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{stats.nextMilestone.reward}</span>
                </div>
              </div>
            )}

            {/* Milestone ladder */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">Milestone rewards</h3>
              {MILESTONES.map(m => {
                const unlocked = stats.useCount >= m.at;
                return (
                  <div key={m.at} className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                    unlocked ? "border-amber-500/40 bg-amber-500/8" : "border-white/6 bg-stone-900/40"
                  }`}>
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${unlocked ? m.color : "text-stone-400"}`}>{m.label}</span>
                        {unlocked && <Check className="w-3.5 h-3.5 text-green-400" />}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{m.at} invites → {m.reward}</p>
                    </div>
                    {!unlocked && <span className="text-xs text-stone-600 flex-shrink-0">{m.at - stats.useCount} to go</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {/* Redeem a code */}
        <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold">Have an invite code?</h3>
          </div>
          <div className="flex gap-2">
            <input
              value={redeemCode}
              onChange={e => { setRedeemCode(e.target.value.toUpperCase()); setRedeemStatus("idle"); }}
              placeholder="Enter code (e.g. ELENA4X2)"
              className="flex-1 bg-stone-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
              maxLength={12}
            />
            <button
              onClick={handleRedeem}
              disabled={redeemStatus === "loading" || !redeemCode.trim()}
              className="px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 active:scale-95 disabled:opacity-40 transition-all"
            >
              {redeemStatus === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </button>
          </div>
          {redeemStatus !== "idle" && (
            <p className={`text-sm ${redeemStatus === "success" ? "text-green-400" : "text-red-400"}`}>{redeemMsg}</p>
          )}
        </div>

        {/* Why invite */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold">Why invite?</h3>
          </div>
          {[
            { icon: "🎨", text: "Better platform for everyone — more artists means more techniques, more inspiration" },
            { icon: "💰", text: "Unlock revenue sharing at 100 invites — Kiln pays you back" },
            { icon: "🏅", text: "Earn rare badges only accessible through referrals" },
            { icon: "⭐", text: "Top referrers get Featured Artist slots on the discover page" },
          ].map(i => (
            <div key={i.text} className="flex items-start gap-3 text-sm text-stone-300">
              <span className="text-base flex-shrink-0">{i.icon}</span>
              <span>{i.text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
