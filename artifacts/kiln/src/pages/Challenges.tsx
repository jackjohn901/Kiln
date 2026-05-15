import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, Clock, Users, Flame, ChevronRight, Zap, Star, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Nav from "@/components/Nav";
import { challenges, type Challenge } from "@/data/challenges";
import { useSocial } from "@/contexts/SocialContext";

function timeLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function ChallengeCard({ challenge, entered, onEnter }: { challenge: Challenge; entered: boolean; onEnter: () => void }) {
  const [, navigate] = useLocation();
  const isActive = challenge.status === "active";
  const isUpcoming = challenge.status === "upcoming";
  const isEnded = challenge.status === "ended";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-stone-900/60 overflow-hidden transition-all hover:border-amber-500/30 ${
        isEnded ? "border-white/5 opacity-60" : "border-white/10"
      }`}
    >
      {/* Leaderboard preview */}
      {challenge.leaderboard.length > 0 && (
        <div className="relative h-28 bg-stone-950 overflow-hidden">
          <div className="flex h-full">
            {challenge.leaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.artistId} className="flex-1 relative">
                <img
                  src={entry.thumbnail}
                  alt={entry.artistName}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${entry.artistId}/200/200`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-transparent" />
                <div className={`absolute top-1.5 left-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  i === 0 ? "bg-amber-400 text-stone-950" : i === 1 ? "bg-stone-400 text-stone-950" : "bg-amber-700 text-amber-100"
                }`}>
                  {i + 1}
                </div>
                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                  <p className="text-[9px] text-white font-medium truncate">{entry.artistName}</p>
                  <p className="text-[8px] text-stone-400">{entry.likes.toLocaleString()} likes</p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-stone-950/60 to-transparent" />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl shrink-0">{challenge.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-bold text-amber-100 text-base leading-tight">{challenge.title}</h3>
              {isActive && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              )}
              {isUpcoming && (
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  COMING SOON
                </span>
              )}
              {isEnded && (
                <span className="rounded-full bg-stone-700 px-2 py-0.5 text-[10px] font-bold text-stone-400">
                  ENDED
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">{challenge.subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-stone-400 leading-relaxed mb-3">{challenge.description}</p>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {challenge.technique && (
            <Link href={`/tag/${encodeURIComponent(challenge.technique)}`}>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300">
                {challenge.technique}
              </span>
            </Link>
          )}
          <span className="text-xs text-stone-600">#{challenge.tag}</span>
          {challenge.sponsoredBy && (
            <span className="text-[10px] text-stone-600">Sponsored by {challenge.sponsoredBy}</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-stone-500 mb-4">
          <span className="flex items-center gap-1">
            <Users size={11} /> {challenge.entries.toLocaleString()} entries
          </span>
          {!isEnded && (
            <span className="flex items-center gap-1 text-amber-400">
              <Clock size={11} /> {timeLeft(challenge.deadline)}
            </span>
          )}
          <span className="flex items-center gap-1 text-amber-500 ml-auto">
            <Trophy size={11} /> {challenge.prize}
          </span>
        </div>

        {/* CTA */}
        {isActive && (
          <button
            onClick={entered ? undefined : onEnter}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all ${
              entered
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                : "bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-[0.98]"
            }`}
          >
            {entered ? (
              <><CheckCircle size={15} /> Entered</>
            ) : (
              <><Zap size={15} /> Enter Challenge</>
            )}
          </button>
        )}
        {isUpcoming && (
          <button className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 text-sm text-stone-400">
            <Star size={14} /> Remind Me
          </button>
        )}
        {isEnded && challenge.leaderboard.length > 0 && (
          <div className="rounded-xl bg-stone-800/50 px-3 py-2 text-xs text-stone-400 text-center">
            🏆 Winner: <span className="font-semibold text-amber-300">{challenge.leaderboard[0].artistName}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Challenges() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "ended">("all");
  const [entered, setEntered] = useState<Set<string>>(new Set());

  const filtered = challenges.filter((c) => filter === "all" || c.status === filter);
  const activeCount = challenges.filter((c) => c.status === "active").length;
  const totalEntries = challenges.reduce((s, c) => s + c.entries, 0);

  function handleEnter(id: string) {
    setEntered((prev) => new Set(prev).add(id));
    navigate("/create");
  }

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={22} className="text-amber-400" />
            <h1 className="font-serif text-3xl font-bold text-amber-100">Challenges</h1>
          </div>
          <p className="text-stone-400 text-sm max-w-xl">
            Weekly craft challenges from the Kiln community. Enter with a post, compete for prizes, and get featured.
          </p>

          {/* Stats */}
          <div className="mt-4 flex gap-4">
            <div className="rounded-2xl border border-white/8 bg-stone-900/50 px-4 py-3">
              <p className="text-lg font-bold text-amber-300">{activeCount}</p>
              <p className="text-xs text-stone-500">active now</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-stone-900/50 px-4 py-3">
              <p className="text-lg font-bold text-amber-300">{totalEntries.toLocaleString()}</p>
              <p className="text-xs text-stone-500">total entries</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-stone-900/50 px-4 py-3">
              <p className="text-lg font-bold text-amber-300">{challenges.length}</p>
              <p className="text-xs text-stone-500">challenges run</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "active", "upcoming", "ended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-colors capitalize ${
                filter === f
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
              }`}
            >
              {f}
              {f === "active" && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block align-middle animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Challenge grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              entered={entered.has(challenge.id)}
              onEnter={() => handleEnter(challenge.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-24 text-center text-stone-600">
            <Trophy size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No challenges in this category yet.</p>
          </div>
        )}

        {/* Create your own */}
        <div className="mt-12 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <Flame size={24} className="mx-auto mb-2 text-amber-400" />
          <h3 className="font-semibold text-amber-100 mb-1">Want to run a challenge?</h3>
          <p className="text-sm text-stone-500 mb-4">Verified artists and brands can create sponsored challenges. Reach thousands of craft artists.</p>
          <Link href="/apply-verified">
            <button className="rounded-full border border-amber-500/40 px-6 py-2 text-sm text-amber-300 hover:bg-amber-500/10 transition-colors">
              Apply for Verified <ChevronRight size={13} className="inline" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
