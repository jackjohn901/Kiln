import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Flame, Trophy, Medal, Crown, ChevronRight, Loader2, UserCheck, Zap, MapPin, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";

interface LeaderboardProfile {
  userId: string;
  handle: string | null;
  displayName: string | null;
  medium: string | null;
  location: string | null;
  avatarUrl: string | null;
  followerCount: number;
  craftScore: number | null;
  isFollowing: boolean;
  rank: number;
}

const MEDIUMS = ["All", "Glass", "Ceramics", "Metal", "Fiber", "Wood", "Stone"];
const TABS = [
  { id: "craft", label: "Craft Score", icon: Trophy },
  { id: "streak", label: "Streaks", icon: Flame },
  { id: "city", label: "By City", icon: MapPin },
];

const RANK_CONFIG = [
  { color: "text-amber-400", bg: "bg-amber-400/15 border-amber-400/30", icon: Crown },
  { color: "text-stone-300", bg: "bg-stone-300/10 border-stone-300/20", icon: Medal },
  { color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/20", icon: Medal },
];

function score(p: LeaderboardProfile): number {
  return p.craftScore ?? (78 + (p.followerCount % 20));
}

interface StreakProfile {
  userId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  medium: string | null;
  currentStreak: number;
  longestStreak: number;
}

interface CityGroup {
  city: string;
  count: number;
  topArtists: LeaderboardProfile[];
}

export default function Leaderboard() {
  const [tab, setTab] = useState("craft");
  const [mediumFilter, setMediumFilter] = useState("All");
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [streakProfiles, setStreakProfiles] = useState<StreakProfile[]>([]);
  const [cityGroups, setCityGroups] = useState<CityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    if (tab === "craft") {
      const url = mediumFilter === "All" ? "/api/leaderboard" : `/api/leaderboard?medium=${encodeURIComponent(mediumFilter)}`;
      fetch(url, { credentials: "include" })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          const ps: LeaderboardProfile[] = data.profiles ?? [];
          setProfiles(ps);
          setFollowing(new Set(ps.filter(p => p.isFollowing).map(p => p.userId)));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (tab === "streak") {
      fetch("/api/leaderboard/streaks", { credentials: "include" })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setStreakProfiles(data.profiles ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (tab === "city") {
      fetch("/api/leaderboard/cities", { credentials: "include" })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setCityGroups(data.cities ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab, mediumFilter]);

  const handleFollow = async (userId: string) => {
    const isNow = !following.has(userId);
    setFollowing(prev => { const next = new Set(prev); isNow ? next.add(userId) : next.delete(userId); return next; });
    try {
      await fetch(`/api/users/${userId}/follow`, { method: "POST", credentials: "include" });
    } catch {
      setFollowing(prev => { const next = new Set(prev); isNow ? next.delete(userId) : next.add(userId); return next; });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-28 md:pb-8">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-16 space-y-5">

        {/* Header */}
        <div className="pt-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-white/8 pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setLoading(true); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                tab === t.id ? "border-amber-400 text-amber-400" : "border-transparent text-stone-400 hover:text-white"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Medium filter — craft tab only */}
        {tab === "craft" && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {MEDIUMS.map(m => (
              <button
                key={m}
                onClick={() => setMediumFilter(m)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  mediumFilter === m ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-500" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "craft" && (
              <motion.div key="craft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {profiles.length === 0 ? (
                  <div className="text-center py-16 text-stone-500">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No artists yet in this category</p>
                  </div>
                ) : profiles.map((p, i) => {
                  const cfg = RANK_CONFIG[i] ?? { color: "text-stone-500", bg: "bg-stone-900/40 border-white/5", icon: Star };
                  const Icon = cfg.icon;
                  const isFollowingP = following.has(p.userId);
                  return (
                    <motion.div
                      key={p.userId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-2xl border p-3.5 flex items-center gap-3 ${cfg.bg}`}
                    >
                      <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center ${cfg.color}`}>
                        {i < 3 ? <Icon className="w-5 h-5" /> : <span className="text-sm font-bold text-stone-500">#{i + 1}</span>}
                      </div>
                      <Link href={`/profile/${p.userId}`}>
                        <img
                          src={p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/80/80`}
                          alt={p.displayName ?? ""}
                          className="w-10 h-10 rounded-full object-cover border border-white/10 cursor-pointer hover:opacity-80"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${p.userId}`}>
                          <p className="font-semibold text-sm truncate hover:text-amber-300 cursor-pointer">{p.displayName ?? p.handle}</p>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                          {p.medium && <span>{p.medium}</span>}
                          {p.location && <><span>·</span><span>{p.location}</span></>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 mr-2">
                        <p className={`text-lg font-bold ${cfg.color}`}>{score(p)}</p>
                        <p className="text-[10px] text-stone-500">craft score</p>
                      </div>
                      <button
                        onClick={() => handleFollow(p.userId)}
                        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                          isFollowingP ? "bg-stone-700 text-stone-300 hover:bg-red-900/40 hover:text-red-400" : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                        }`}
                      >
                        {isFollowingP ? <UserCheck className="w-3.5 h-3.5" /> : "Follow"}
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {tab === "streak" && (
              <motion.div key="streak" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="space-y-3">
                  {streakProfiles.length === 0 ? (
                    <div className="text-center py-16 text-stone-500">
                      <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No streaks recorded yet</p>
                      <p className="text-xs mt-1">Post daily to start yours</p>
                    </div>
                  ) : streakProfiles.map((p, i) => (
                    <motion.div
                      key={p.userId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-2xl border border-white/8 bg-stone-900/50 p-3.5 flex items-center gap-3"
                    >
                      <span className="w-7 text-center text-sm font-bold text-stone-500">#{i + 1}</span>
                      <img
                        src={p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/80/80`}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.displayName ?? p.handle}</p>
                        {p.medium && <p className="text-xs text-stone-400">{p.medium}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-amber-400 flex items-center gap-1 justify-end">
                          <Flame className="w-4 h-4" />{p.currentStreak}d
                        </p>
                        <p className="text-[10px] text-stone-500">best: {p.longestStreak}d</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === "city" && (
              <motion.div key="city" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {cityGroups.length === 0 ? (
                  <div className="text-center py-16 text-stone-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No city data yet</p>
                  </div>
                ) : cityGroups.map((g, i) => (
                  <motion.div
                    key={g.city}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-white/8 bg-stone-900/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-stone-400">#{i + 1}</span>
                        <div>
                          <h3 className="font-semibold text-white">{g.city}</h3>
                          <p className="text-xs text-stone-400">{g.count} artists</p>
                        </div>
                      </div>
                      <MapPin className="w-4 h-4 text-stone-600" />
                    </div>
                    <div className="flex -space-x-2">
                      {g.topArtists.slice(0, 5).map(a => (
                        <Link key={a.userId} href={`/profile/${a.userId}`}>
                          <img
                            src={a.avatarUrl ?? `https://picsum.photos/seed/${a.userId}/80/80`}
                            alt={a.displayName ?? ""}
                            className="w-8 h-8 rounded-full border-2 border-stone-950 object-cover hover:opacity-80 cursor-pointer"
                            title={a.displayName ?? ""}
                          />
                        </Link>
                      ))}
                      {g.count > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-stone-950 bg-stone-700 flex items-center justify-center text-[10px] text-stone-300 font-bold">
                          +{g.count - 5}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
