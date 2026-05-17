import { useState, useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  earnedAt?: string;
}

const RARITY_STYLES: Record<string, { border: string; bg: string; label: string; glow: string }> = {
  common:    { border: "border-stone-600/50",  bg: "bg-stone-800/60",    label: "text-stone-400", glow: "" },
  rare:      { border: "border-sky-500/50",    bg: "bg-sky-500/10",      label: "text-sky-400",   glow: "shadow-sky-500/10" },
  epic:      { border: "border-purple-500/50", bg: "bg-purple-500/10",   label: "text-purple-400",glow: "shadow-purple-500/20" },
  legendary: { border: "border-amber-400/60",  bg: "bg-amber-500/10",    label: "text-amber-300", glow: "shadow-amber-400/25" },
};

const CATEGORIES = ["All", "creator", "commerce", "community"];

function BadgeCard({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  const style = RARITY_STYLES[badge.rarity] ?? RARITY_STYLES.common;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-2xl border p-4 flex flex-col items-center gap-2 text-center transition-all ${
        earned ? `${style.border} ${style.bg} shadow-lg ${style.glow}` : "border-white/5 bg-stone-900/30 opacity-50 grayscale"
      }`}
    >
      {!earned && (
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-stone-600" />
        </div>
      )}
      <span className="text-4xl">{badge.icon}</span>
      <div>
        <p className="font-semibold text-sm text-white leading-tight">{badge.name}</p>
        <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${style.label}`}>{badge.rarity}</p>
      </div>
      <p className="text-xs text-stone-400 leading-relaxed">{badge.description}</p>
      {earned && badge.earnedAt && (
        <p className="text-[10px] text-stone-600 mt-1">
          Earned {new Date(badge.earnedAt).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
}

export default function Badges() {
  const { user } = useAuth();
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [earnedMap, setEarnedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const fetches = [
      fetch("/api/badges").then(r => r.ok ? r.json() : null),
      user ? fetch("/api/me/badges", { credentials: "include" }).then(r => r.ok ? r.json() : null) : Promise.resolve(null),
    ];
    Promise.all(fetches).then(([allData, myData]) => {
      if (allData?.badges) setAllBadges(allData.badges);
      if (myData?.badges) {
        const ids = new Set<string>(myData.badges.map((b: BadgeDef) => b.id));
        setEarnedIds(ids);
        const map: Record<string, string> = {};
        myData.badges.forEach((b: BadgeDef) => { if (b.earnedAt) map[b.id] = b.earnedAt; });
        setEarnedMap(map);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const filtered = category === "All" ? allBadges : allBadges.filter(b => b.category === category);
  const earned = filtered.filter(b => earnedIds.has(b.id));
  const locked = filtered.filter(b => !earnedIds.has(b.id));

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-28 md:pb-8">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-16 space-y-6">

        <div className="pt-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏅</span>
            <h1 className="text-2xl font-bold">Badges</h1>
          </div>
          <p className="text-stone-400 text-sm">Earn badges by creating, selling, and building community.</p>
        </div>

        {user && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-300">{earnedIds.size} earned</p>
              <p className="text-xs text-stone-400">{allBadges.length - earnedIds.size} still to unlock</p>
            </div>
            <div className="h-12 w-12 rounded-full border-4 border-amber-500/30 flex items-center justify-center text-xl font-bold text-amber-300">
              {Math.round((earnedIds.size / Math.max(allBadges.length, 1)) * 100)}%
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                category === c ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-500" /></div>
        ) : (
          <div className="space-y-6">
            {earned.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Earned ({earned.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {earned.map(b => <BadgeCard key={b.id} badge={{ ...b, earnedAt: earnedMap[b.id] }} earned />)}
                </div>
              </div>
            )}
            {locked.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Locked ({locked.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {locked.map(b => <BadgeCard key={b.id} badge={b} earned={false} />)}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
