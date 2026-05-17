import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Trophy, Clock, Users, Flame, Zap, Star, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";

interface ApiChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  prompt: string;
  technique: string | null;
  hashtag: string;
  prizeDescription: string | null;
  sponsoredBy: string | null;
  entryCount: number;
  startsAt: string;
  endsAt: string;
  status: "active" | "upcoming" | "ended";
  entered: boolean;
}

function timeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function timeUntil(startsAt: string): string {
  const ms = new Date(startsAt).getTime() - Date.now();
  if (ms <= 0) return "Starting soon";
  const days = Math.floor(ms / 86400000);
  return `Starts in ${days}d`;
}

const RARITY_COLORS: Record<string, string> = {
  active: "border-amber-500/40 bg-amber-500/5",
  upcoming: "border-sky-500/30 bg-sky-500/5",
  ended: "border-white/5 opacity-60",
};

function ChallengeCard({ c, onEnter }: { c: ApiChallenge; onEnter: (id: string) => void }) {
  const [, navigate] = useLocation();
  const [entering, setEntering] = useState(false);

  const handleEnter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (c.entered || c.status !== "active") return;
    setEntering(true);
    try {
      const r = await fetch(`/api/challenges/${c.id}/enter`, { method: "POST", credentials: "include" });
      if (r.ok || r.status === 409) onEnter(c.id);
    } finally {
      setEntering(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-stone-900/60 overflow-hidden cursor-pointer transition-all hover:border-amber-500/30 ${RARITY_COLORS[c.status]}`}
      onClick={() => navigate(`/challenges/${c.id}`)}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{c.emoji}</span>
            <div>
              <h3 className="font-semibold text-white leading-tight">{c.title}</h3>
              {c.technique && <p className="text-xs text-amber-400/80 mt-0.5">{c.technique}</p>}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            c.status === "active" ? "bg-green-500/20 text-green-400" :
            c.status === "upcoming" ? "bg-sky-500/20 text-sky-400" :
            "bg-stone-700 text-stone-400"
          }`}>
            {c.status === "active" ? "LIVE" : c.status === "upcoming" ? "SOON" : "ENDED"}
          </span>
        </div>

        <p className="text-sm text-stone-300 leading-relaxed">{c.description}</p>

        {c.prizeDescription && (
          <div className="flex items-center gap-1.5 text-sm text-amber-300">
            <Trophy className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{c.prizeDescription}</span>
          </div>
        )}
        {c.sponsoredBy && (
          <p className="text-xs text-stone-500">Sponsored by {c.sponsoredBy}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.entryCount.toLocaleString()} entries</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {c.status === "upcoming" ? timeUntil(c.startsAt) : timeLeft(c.endsAt)}
            </span>
          </div>
          {c.status === "active" && (
            <button
              onClick={handleEnter}
              disabled={c.entered || entering}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                c.entered
                  ? "bg-green-500/20 text-green-400 cursor-default"
                  : "bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95"
              }`}
            >
              {entering ? <Loader2 className="w-3 h-3 animate-spin" /> :
               c.entered ? <><CheckCircle className="w-3 h-3" /> Entered</> :
               <><Zap className="w-3 h-3" /> Enter</>}
            </button>
          )}
          {c.status !== "active" && (
            <ChevronRight className="w-4 h-4 text-stone-600" />
          )}
        </div>

        <div className="pt-1 border-t border-white/5">
          <p className="text-xs text-stone-500 font-mono">#{c.hashtag}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "ended">("all");

  useEffect(() => {
    fetch("/api/challenges", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setChallenges(data.challenges ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEnter = (id: string) => {
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, entered: true, entryCount: c.entryCount + 1 } : c));
  };

  const filtered = filter === "all" ? challenges : challenges.filter(c => c.status === filter);
  const active = challenges.filter(c => c.status === "active");
  const totalEntries = challenges.reduce((s, c) => s + c.entryCount, 0);

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-28 md:pb-8">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-16 space-y-6">

        {/* Header */}
        <div className="pt-4 space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold">Creation Challenges</h1>
          </div>
          <p className="text-stone-400 text-sm">Weekly prompts. Real prizes. Community glory.</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active now", value: active.length, icon: Zap, color: "text-green-400" },
            { label: "Total entries", value: totalEntries.toLocaleString(), icon: Users, color: "text-amber-400" },
            { label: "Prizes this month", value: `${active.filter(c => c.prizeDescription).length}`, icon: Trophy, color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-stone-900/50 p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(["all", "active", "upcoming", "ended"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                filter === f ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Challenge list */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No challenges in this category</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {filtered.map(c => <ChallengeCard key={c.id} c={c} onEnter={handleEnter} />)}
            </div>
          </AnimatePresence>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-5 space-y-3">
          <h3 className="font-semibold text-amber-400">How challenges work</h3>
          <div className="space-y-2">
            {[
              { step: "1", text: "Pick an active challenge and tap Enter" },
              { step: "2", text: "Post your work with the challenge hashtag" },
              { step: "3", text: "Community votes on entries" },
              { step: "4", text: "Top entry wins the prize + Featured Artist slot" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3 text-sm text-stone-300">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
