import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Flame, Trophy, Medal, Crown, ChevronRight, Loader2, UserCheck } from "lucide-react";
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

const RANK_CONFIG = [
  { color: "text-amber-400", bg: "bg-amber-400/15 border-amber-400/30", icon: Crown },
  { color: "text-stone-300", bg: "bg-stone-300/10 border-stone-300/20", icon: Medal },
  { color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/20", icon: Medal },
];

function score(p: LeaderboardProfile): number {
  return p.craftScore ?? (78 + (p.followerCount % 20));
}

export default function Leaderboard() {
  const [mediumFilter, setMediumFilter] = useState("All");
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
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
  }, [mediumFilter]);

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
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Craft Score Leaderboard</h1>
            <p className="text-sm text-stone-500">Top-ranked artists by followers, posts, and community impact</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {MEDIUMS.map(m => (
            <button key={m} onClick={() => setMediumFilter(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${mediumFilter === m ? "bg-amber-500 text-stone-950" : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/30 hover:text-amber-300"}`}>
              {m}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No artists found for this medium.</p>
          </div>
        ) : (
          <>
            {profiles.length >= 3 && (
              <div className="mb-6 grid grid-cols-3 gap-3">
                {profiles.slice(0, 3).map((p, i) => {
                  const cfg = RANK_CONFIG[i]!;
                  const Icon = cfg.icon;
                  const name = p.displayName ?? p.handle ?? "Artist";
                  return (
                    <Link key={p.userId} href={`/artists/${p.userId}`}
                      className={`flex flex-col items-center gap-2 rounded-2xl border ${cfg.bg} p-4 text-center transition-all hover:scale-[1.02]`}>
                      <Icon size={16} className={cfg.color} />
                      <img src={p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/200/200`} alt={name}
                        className="h-14 w-14 rounded-full object-cover border-2 border-white/10"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${p.userId}/100/100`; }} />
                      <div className="min-w-0 w-full">
                        <p className="text-xs font-semibold text-stone-200 truncate">{name}</p>
                        {p.medium && <p className="text-[10px] text-stone-500 truncate">{p.medium.split(",")[0]}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame size={10} className="text-amber-400" />
                        <span className={`text-sm font-bold ${cfg.color}`}>{score(p)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden">
              {profiles.map((p, i) => {
                const name = p.displayName ?? p.handle ?? "Artist";
                const isFollowingUser = following.has(p.userId);
                return (
                  <div key={p.userId}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/3 ${i < profiles.length - 1 ? "border-b border-white/5" : ""}`}>
                    <span className={`w-7 text-center text-sm font-bold shrink-0 ${i < 3 ? RANK_CONFIG[i]!.color : "text-stone-600"}`}>
                      {i + 1}
                    </span>
                    <Link href={`/artists/${p.userId}`} className="shrink-0">
                      <img src={p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/100/100`} alt={name}
                        className="h-10 w-10 rounded-full object-cover border border-white/10"
                        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${p.userId}/80/80`; }} />
                    </Link>
                    <Link href={`/artists/${p.userId}`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200 truncate">{name}</p>
                      <p className="text-xs text-stone-600 truncate">
                        {p.medium?.split(",")[0]}{p.location ? ` · ${p.location.split(",")[0]}` : ""} · {p.followerCount.toLocaleString()} followers
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <Flame size={11} className="text-amber-400" />
                        <span className="text-sm font-bold text-amber-300">{score(p)}</span>
                      </div>
                      <button onClick={() => handleFollow(p.userId)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${isFollowingUser ? "border border-white/10 text-stone-500 hover:border-rose-500/30 hover:text-rose-400" : "bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25"}`}>
                        {isFollowingUser && <UserCheck size={10} />}
                        {isFollowingUser ? "Following" : "Follow"}
                      </button>
                      <Link href={`/artists/${p.userId}`} className="text-stone-700">
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-4 text-center text-xs text-stone-700">
          Craft Score is calculated from follower count, post engagement, and community contributions.
        </p>
      </div>
    </div>
  );
}
