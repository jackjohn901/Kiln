import { useState, useEffect } from "react";
import { Copy, Check, Users, Gift, Zap, Globe, Loader2, Network, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface ReferralStats {
  code: string;
  useCount: number;
  milestone: string | null;
  nextMilestone: { label: string; at: number; reward: string } | null;
}

interface NetworkMember {
  id: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  invited: number;
}

interface NetworkTier {
  at: number;
  badge: string;
  label: string;
  icon: string;
  unlocked: boolean;
}

interface NetworkData {
  directCount: number;
  networkCount: number;
  depth: number;
  levels: { level: number; count: number }[];
  members: NetworkMember[];
  tiers: NetworkTier[];
  nextTier: { at: number; badge: string; label: string; icon: string } | null;
}

const MILESTONES = [
  { at: 1, label: "First Invite", reward: "Early Adopter badge", icon: "⭐", color: "text-stone-300" },
  { at: 10, label: "Recruiter", reward: "Promotion tools + Recruiter badge", icon: "📣", color: "text-amber-400" },
  { at: 100, label: "Evangelist", reward: "Revenue share + Evangelist badge", icon: "🌐", color: "text-purple-400" },
];

export default function Referrals() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [redeemMsg, setRedeemMsg] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kiln_referral_code");
      if (stored) {
        setRedeemCode(stored);
        localStorage.removeItem("kiln_referral_code");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/me/referral", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/me/network", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setNetwork(data); })
      .catch(() => {});
  }, [user]);

  const inviteUrl = stats ? `https://kilndrop.com/kiln/join?ref=${stats.code}` : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = stats
    ? `Join me on Kiln 🎨 — the home for craft. Anyone can join (you don't have to be an artist!). Sign up with my invite code ${stats.code}, and you'll get your own code to invite friends too.`
    : "";
  const shareMessage = `${shareText} ${inviteUrl}`;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleNativeShare = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.share({ title: "Join me on Kiln", text: shareText, url: inviteUrl });
    } catch {
      // User dismissed the share sheet, or it's unavailable — no action needed.
    }
  };

  const handleShareFacebook = () => {
    if (!inviteUrl) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleCopyMessage = async () => {
    if (!shareMessage.trim()) return;
    await navigator.clipboard.writeText(shareMessage);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
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
            <h1 className="text-2xl font-bold">Invite & Grow</h1>
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
                  <p className="text-xs text-stone-400">people invited</p>
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

              {/* One-tap share */}
              <div className="space-y-2 pt-1">
                <p className="text-xs text-stone-400">Invite friends in one tap</p>
                {canNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-white/10 text-white hover:bg-white/15 active:scale-95 transition-all"
                  >
                    <Share2 className="w-4 h-4" /> Share…
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleShareFacebook}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-[#1877F2] text-white hover:bg-[#1466d8] active:scale-95 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                    </svg>
                    Facebook
                  </button>
                  <button
                    onClick={handleCopyMessage}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                      msgCopied ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {msgCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy message</>}
                  </button>
                </div>
                <div className="bg-stone-950/40 rounded-lg p-3 text-xs text-stone-400 italic leading-relaxed">
                  “{shareMessage}”
                </div>
              </div>
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

            {/* Your network (multi-level pyramid) */}
            {network && (
              network.networkCount > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Network className="w-5 h-5 text-purple-300" />
                      <h3 className="font-semibold">Your network</h3>
                    </div>
                    <p className="text-xs text-stone-400 -mt-2">
                      Everyone who joined through your invite — plus everyone <em>they</em> invited, all the way down.
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-white">{network.networkCount}</p>
                        <p className="text-[11px] text-stone-400">total network</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{network.directCount}</p>
                        <p className="text-[11px] text-stone-400">you invited</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{network.depth}</p>
                        <p className="text-[11px] text-stone-400">{network.depth === 1 ? "level deep" : "levels deep"}</p>
                      </div>
                    </div>
                    {/* Pyramid: each level of the chain, widest at the top */}
                    <div className="space-y-1.5 pt-1">
                      {network.levels.map(l => {
                        const max = Math.max(...network.levels.map(x => x.count), 1);
                        const widthPct = Math.max(18, (l.count / max) * 100);
                        return (
                          <div key={l.level} className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-500 w-14 flex-shrink-0">Level {l.level}</span>
                            <div className="flex-1 flex justify-center">
                              <div
                                className="h-6 rounded-md bg-gradient-to-r from-purple-500/40 to-indigo-500/30 border border-purple-400/30 flex items-center justify-center"
                                style={{ width: `${widthPct}%` }}
                              >
                                <span className="text-xs font-semibold text-purple-100">{l.count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* People you invited (the level just below you), with how many each has invited */}
                  {network.members.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-4 space-y-2.5">
                      <h3 className="text-sm font-semibold text-stone-300">People you invited</h3>
                      {network.members.map(m => (
                        <div key={m.id} className="flex items-center gap-3">
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-200 flex-shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            {m.handle && <p className="text-xs text-stone-500 truncate">@{m.handle}</p>}
                          </div>
                          {m.invited > 0 && (
                            <span className="text-xs text-purple-300 flex-shrink-0">+{m.invited} invited</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Network status tiers */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">Network status</h3>
                    {network.tiers.map(t => (
                      <div key={t.badge} className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                        t.unlocked ? "border-purple-500/40 bg-purple-500/8" : "border-white/6 bg-stone-900/40"
                      }`}>
                        <span className="text-2xl">{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${t.unlocked ? "text-purple-200" : "text-stone-400"}`}>{t.label}</span>
                            {t.unlocked && <Check className="w-3.5 h-3.5 text-green-400" />}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">{t.at} people in your network</p>
                        </div>
                        {!t.unlocked && <span className="text-xs text-stone-600 flex-shrink-0">{t.at - network.networkCount} to go</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-purple-300" />
                    <h3 className="font-semibold">Start your network</h3>
                  </div>
                  <p className="text-sm text-stone-400">
                    Share your code above. When someone joins, they get their own code too — and as they invite others,
                    your whole network grows beneath you and unlocks bigger badges.
                  </p>
                </div>
              )
            )}
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
