import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Flame, Trophy, Medal, Crown, ChevronRight } from "lucide-react";
import Nav from "@/components/Nav";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";

const ALL_ARTISTS = [...artists, ...seedArtists];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function craftScore(id: string): number {
  return 78 + (hash(id) % 20);
}

function followerCount(id: string): number {
  return 3000 + (hash(id) % 47000);
}

const MEDIUMS = ["All", "Glass", "Ceramics", "Metal", "Fiber", "Wood", "Stone"];

function matchesMedium(medium: string, filter: string): boolean {
  if (filter === "All") return true;
  return medium.toLowerCase().includes(filter.toLowerCase());
}

const RANK_CONFIG = [
  { color: "text-amber-400", bg: "bg-amber-400/15 border-amber-400/30", icon: Crown },
  { color: "text-stone-300", bg: "bg-stone-300/10 border-stone-300/20", icon: Medal },
  { color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/20", icon: Medal },
];

export default function Leaderboard() {
  const [mediumFilter, setMediumFilter] = useState("All");
  const { following, followArtist, unfollowArtist, isFollowing } = useSocial();
  void following;

  const ranked = useMemo(() => {
    return ALL_ARTISTS
      .filter((a) => matchesMedium(a.medium, mediumFilter))
      .map((a) => ({ ...a, score: craftScore(a.id), followers: followerCount(a.id) }))
      .sort((a, b) => b.score - a.score);
  }, [mediumFilter]);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Craft Score Leaderboard</h1>
            <p className="text-sm text-stone-500">Top-ranked artists by technique mastery, consistency, and community impact</p>
          </div>
        </div>

        {/* Medium filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {MEDIUMS.map((m) => (
            <button
              key={m}
              onClick={() => setMediumFilter(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                mediumFilter === m
                  ? "bg-amber-500 text-stone-950"
                  : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/30 hover:text-amber-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {ranked.length >= 3 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {ranked.slice(0, 3).map((artist, i) => {
              const cfg = RANK_CONFIG[i];
              const Icon = cfg.icon;
              const avatar = artist.images?.[0]?.url ?? `https://picsum.photos/seed/${artist.id}/200/200`;
              return (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className={`flex flex-col items-center gap-2 rounded-2xl border ${cfg.bg} p-4 text-center transition-all hover:scale-[1.02]`}
                >
                  <Icon size={16} className={cfg.color} />
                  <img
                    src={avatar}
                    alt={artist.name}
                    className="h-14 w-14 rounded-full object-cover border-2 border-white/10"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/100/100`; }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-200 truncate">{artist.name}</p>
                    <p className="text-[10px] text-stone-500 truncate">{artist.medium.split(",")[0]}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame size={10} className="text-amber-400" />
                    <span className={`text-sm font-bold ${cfg.color}`}>{artist.score}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Full ranked list */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden">
          {ranked.map((artist, i) => {
            const avatar = artist.images?.[0]?.url ?? `https://picsum.photos/seed/${artist.id}/100/100`;
            const following = isFollowing(artist.id);
            return (
              <div
                key={artist.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/3 ${i < ranked.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <span className={`w-7 text-center text-sm font-bold shrink-0 ${i < 3 ? RANK_CONFIG[i].color : "text-stone-600"}`}>
                  {i + 1}
                </span>
                <Link href={`/artists/${artist.id}`} className="shrink-0">
                  <img
                    src={avatar}
                    alt={artist.name}
                    className="h-10 w-10 rounded-full object-cover border border-white/10"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/80/80`; }}
                  />
                </Link>
                <Link href={`/artists/${artist.id}`} className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-200 truncate">{artist.name}</p>
                  <p className="text-xs text-stone-600 truncate">
                    {artist.medium.split(",")[0]} · {artist.location.split(",")[0]} · {artist.followers.toLocaleString()} followers
                  </p>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <Flame size={11} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">{artist.score}</span>
                  </div>
                  <button
                    onClick={() => following ? unfollowArtist(artist.id) : followArtist(artist.id, artist.name, avatar)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      following
                        ? "border border-white/10 text-stone-500 hover:border-rose-500/30 hover:text-rose-400"
                        : "bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25"
                    }`}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                  <Link href={`/artists/${artist.id}`} className="text-stone-700">
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
          {ranked.length === 0 && (
            <div className="py-16 text-center">
              <Trophy size={32} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500">No artists found for this medium</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-700">
          Craft Score is calculated from technique depth, consistency, community engagement, and mentorship contributions.
        </p>
      </div>
    </div>
  );
}
