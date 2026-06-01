import { useState, useMemo, useRef, useEffect } from "react";
import { Search, MapPin, CheckCircle, Clock, Lock, Users, Hammer, X, TrendingUp, Flame, Trophy, Sparkles, ChevronRight, ShoppingBag, Gavel, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial, CommissionStatus } from "@/contexts/SocialContext";
import { getWorkshopsByArtist } from "@/data/workshops";
import { ALL_REELS } from "@/data/reels";
import Nav from "@/components/Nav";

const POPULAR_TECHNIQUES = [
  { name: "Glass Blowing", emoji: "🔥" },
  { name: "Raku", emoji: "🏺" },
  { name: "Metal Forging", emoji: "⚒️" },
  { name: "Fiber Arts", emoji: "🧵" },
  { name: "Ceramics", emoji: "🎨" },
  { name: "Flameworking", emoji: "🌡️" },
]
  .map((t) => ({ ...t, reels: ALL_REELS.filter((r) => r.technique === t.name).length }))
  .sort((a, b) => b.reels - a.reels);

const ALL_ARTISTS = [...artists, ...seedArtists];

interface NormalizedArtist {
  id: string;
  name: string;
  handle: string;
  medium: string;
  location: string;
  avatarUrl: string;
  followerCount: number;
  keywords?: string[];
  images?: { url: string }[];
}

const MEDIUMS = ["All", "Ceramics", "Glass", "Painting", "Resin", "Fiber", "Metal", "Wood", "Drawing", "Printmaking", "Photography", "Enamel", "Sculpture", "Mosaic", "Leather", "Mixed"];
const STATUS_FILTERS = ["Any", "Open", "Waitlisted"] as const;

const STATUS_UI: Record<CommissionStatus, { label: string; color: string; Icon: typeof CheckCircle }> = {
  open: { label: "Open", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle },
  waitlisted: { label: "Waitlisted", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", Icon: Clock },
  closed: { label: "Closed", color: "text-rose-400 bg-rose-500/10 border-rose-500/30", Icon: Lock },
};

export default function Discover() {
  const [, navigate] = useLocation();
  const { isFollowing, followArtist, unfollowArtist, getArtistCommissionStatus, following } = useSocial();

  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"Any" | "Open" | "Waitlisted">("Any");
  const [locationFilter, setLocationFilter] = useState("Any");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  interface CommunityProfile {
    userId: string;
    handle: string | null;
    displayName: string | null;
    medium: string | null;
    avatarUrl: string | null;
    followerCount: number;
    isFollowing: boolean;
  }
  const [communityProfiles, setCommunityProfiles] = useState<CommunityProfile[]>([]);
  const [communityFollowing, setCommunityFollowing] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/users/search?limit=8")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (data?.profiles?.length) setCommunityProfiles(data.profiles); })
      .catch(() => {});
  }, []);

  const [leaderboardArtists, setLeaderboardArtists] = useState<NormalizedArtist[]>([]);
  useEffect(() => {
    fetch("/api/leaderboard?limit=100")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.profiles?.length) return;
        setLeaderboardArtists(data.profiles.map((p: Record<string, unknown>) => ({
          id: p.userId as string,
          name: (p.displayName as string | null) ?? (p.handle as string | null) ?? "Artist",
          handle: (p.handle as string | null) ?? (p.userId as string),
          medium: (p.medium as string | null) ?? "",
          location: (p.location as string | null) ?? "",
          avatarUrl: (p.avatarUrl as string | null) ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${p.userId}`,
          followerCount: (p.followerCount as number | null) ?? 0,
          keywords: [],
          images: [{ url: (p.avatarUrl as string | null) ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${p.userId}` }],
        })));
      })
      .catch(() => {});
  }, []);

  interface TrendingTag { tag: string; count: number; weeklyGrowth: number; imageUrl: string | null; }
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  useEffect(() => {
    fetch("/api/trending-posts?limit=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.trendingTags?.length) setTrendingTags(data.trendingTags); })
      .catch(() => {});
  }, []);

  interface RisingArtist {
    userId: string; handle: string | null; displayName: string | null;
    avatarUrl: string | null; medium: string | null; followerCount: number;
    recentPosts: number; isFollowing: boolean;
  }
  const [risingArtists, setRisingArtists] = useState<RisingArtist[]>([]);
  useEffect(() => {
    fetch("/api/discover/rising-artists?limit=12")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.artists?.length) setRisingArtists(data.artists); })
      .catch(() => {});
  }, []);

  interface StreakLeader {
    userId: string; currentStreak: number; longestStreak: number;
    handle: string | null; displayName: string | null; avatarUrl: string | null; medium: string | null;
  }
  const [streakLeaders, setStreakLeaders] = useState<StreakLeader[]>([]);
  useEffect(() => {
    fetch("/api/leaderboard/streaks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profiles?.length) {
          setStreakLeaders((data.profiles as StreakLeader[]).filter((p) => p.currentStreak > 0));
        }
      })
      .catch(() => {});
  }, []);

  interface ApiArtist {
    id: string; displayName: string | null; handle: string | null;
    bio: string | null; avatarUrl: string | null; medium: string | null;
    followerCount: number | null;
  }
  const [apiSearchResults, setApiSearchResults] = useState<ApiArtist[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) { setApiSearchResults([]); return; }
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          const profiles: ApiArtist[] = (data?.artists ?? []).map((p: ApiArtist) => p);
          setApiSearchResults(profiles);
        })
        .catch(() => {});
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  interface AiListing {
    id: string; title: string; description: string | null;
    imageUrl: string | null; price: string | null; medium: string | null;
  }
  const [aiListings, setAiListings] = useState<AiListing[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [aiSearching, setAiSearching] = useState(false);

  const isNaturalLanguage = (q: string) =>
    q.trim().split(/\s+/).length >= 3 ||
    /\$|\bunder\b|\bover\b|\bcheap\b|\baffordable\b|\bprice\b|\bbudget\b/i.test(q);

  useEffect(() => {
    if (!isNaturalLanguage(query)) { setAiListings([]); setAiInterpretation(""); return; }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setAiSearching(true);
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ query: query.trim() }),
        });
        if (res.ok) {
          const data = await res.json() as { listings?: AiListing[]; interpretation?: string };
          setAiListings(data.listings ?? []);
          setAiInterpretation(data.interpretation ?? "");
        }
      } catch {
      } finally {
        setAiSearching(false);
      }
    }, 600);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  const handleCommunityFollow = (userId: string) => {
    const nowFollowing = !communityFollowing.has(userId);
    setCommunityFollowing((prev) => {
      const next = new Set(prev);
      nowFollowing ? next.add(userId) : next.delete(userId);
      return next;
    });
    fetch(`/api/users/${userId}/follow`, { method: "POST", credentials: "include" }).catch(() => {
      setCommunityFollowing((prev) => {
        const next = new Set(prev);
        nowFollowing ? next.delete(userId) : next.add(userId);
        return next;
      });
    });
  };

  const combinedArtists = useMemo<NormalizedArtist[]>(() => {
    if (leaderboardArtists.length > 0) return leaderboardArtists;
    return ALL_ARTISTS.map(a => ({
      id: a.id,
      name: a.name,
      handle: a.id,
      medium: a.medium,
      location: a.location ?? "",
      avatarUrl: a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${a.id}`,
      followerCount: 0,
      keywords: a.keywords ?? [],
      images: a.images,
    }));
  }, [leaderboardArtists]);

  // "New & rising" rail: real low-follower active artists from the API, with a
  // soft fallback to the leaderboard list when no rising data is available yet.
  const risingDisplay = useMemo(() => {
    if (risingArtists.length > 0) {
      return risingArtists.map((a) => ({
        id: a.userId,
        name: a.displayName ?? a.handle ?? "Artist",
        avatar: a.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${a.userId}`,
        medium: a.medium ?? "",
      }));
    }
    return combinedArtists.slice(0, 8).map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${a.id}`,
      medium: a.medium,
    }));
  }, [risingArtists, combinedArtists]);

  const suggestions = useMemo(() => {
    if (query.length < 2) return { artists: [], techniques: [] };
    const q = query.toLowerCase();
    const artistMatches = combinedArtists
      .filter((a) => a.name.toLowerCase().includes(q) || a.location.toLowerCase().includes(q))
      .slice(0, 5);
    const allTechniques = [...new Set(ALL_REELS.map((r) => r.technique))];
    const techniqueMatches = allTechniques.filter((t) => t.toLowerCase().includes(q)).slice(0, 3);
    return { artists: artistMatches, techniques: techniqueMatches };
  }, [query, combinedArtists]);

  // Personalised recommendations: artists sharing mediums/techniques with who the user follows
  const recommended = useMemo(() => {
    if (!following.length) return [];
    const followedIds = new Set(following);
    const followedMediumWords = new Set<string>();
    following.forEach((artistId) => {
      const a = combinedArtists.find((x) => x.id === artistId);
      if (a) {
        a.medium.toLowerCase().split(/[,/\s]+/).filter((w) => w.length > 3).forEach((w) => followedMediumWords.add(w));
      }
    });
    return combinedArtists
      .filter((a) => !followedIds.has(a.id))
      .map((a) => {
        const words = a.medium.toLowerCase().split(/[,/\s]+/).filter((w) => w.length > 3);
        const overlap = words.filter((w) => followedMediumWords.has(w)).length;
        return { artist: a, score: overlap };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.artist);
  }, [following, combinedArtists]);

  const uniqueLocations = useMemo(() => {
    const cities = combinedArtists.map((a) => a.location?.split(",")[0]?.trim()).filter(Boolean);
    return ["Any", ...Array.from(new Set(cities)).sort()];
  }, [combinedArtists]);

  const filtered = useMemo(() => {
    return combinedArtists.filter((a) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.medium.toLowerCase().includes(q) ||
        (a.keywords ?? []).some((k: string) => k.toLowerCase().includes(q));

      const matchesMedium =
        medium === "All" || a.medium.toLowerCase().includes(medium.toLowerCase());

      const status = getArtistCommissionStatus(a.id);
      const matchesStatus =
        statusFilter === "Any" ||
        (statusFilter === "Open" && status === "open") ||
        (statusFilter === "Waitlisted" && status === "waitlisted");

      const matchesLocation =
        locationFilter === "Any" || a.location?.toLowerCase().includes(locationFilter.toLowerCase());

      return matchesQuery && matchesMedium && matchesStatus && matchesLocation;
    });
  }, [query, medium, statusFilter, locationFilter, getArtistCommissionStatus, combinedArtists]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />

      <div className="pt-16 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="py-8">
            <h1 className="text-2xl font-bold text-stone-100 mb-1">Discover</h1>
            <p className="text-sm text-stone-400">Shop original works, bid on live auctions, and find craft artists</p>
          </div>

          {/* Trending now — real engagement-ranked tags from the platform */}
          {trendingTags.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-stone-300">Trending now</h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">THIS WEEK</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {trendingTags.slice(0, 12).map((t) => (
                  <Link key={t.tag} href={`/tag/${encodeURIComponent(t.tag)}`}>
                    <div className="group shrink-0 flex items-center gap-2 rounded-xl border border-white/8 bg-stone-900/60 px-3 py-2 hover:border-amber-500/30 hover:bg-stone-900 transition-all cursor-pointer">
                      {t.imageUrl && <img src={t.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-stone-200 truncate">#{t.tag}</p>
                        <p className="text-[10px] text-stone-500">
                          {t.count} {t.count === 1 ? "post" : "posts"}
                          {t.weeklyGrowth > 0 && <span className="ml-1 text-emerald-400">▲ {t.weeklyGrowth}%</span>}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Marketplace */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-stone-300">Shop the marketplace</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/shop" className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-amber-500/10 to-stone-900 p-4 hover:border-amber-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><ShoppingBag size={18} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-100">Shop</p>
                    <p className="text-[11px] text-stone-400">Browse works for sale</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto shrink-0 text-stone-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </Link>
              <Link href="/auctions" className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-amber-500/10 to-stone-900 p-4 hover:border-amber-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><Gavel size={18} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-100">Auctions</p>
                    <p className="text-[11px] text-stone-400">Bid on live, one-of-a-kind pieces</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto shrink-0 text-stone-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </Link>
              <Link href="/drops" className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-amber-500/10 to-stone-900 p-4 hover:border-amber-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300"><Zap size={18} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-100">Drops</p>
                    <p className="text-[11px] text-stone-400">Limited-edition timed releases</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto shrink-0 text-stone-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Popular techniques */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-stone-300">Popular techniques</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {POPULAR_TECHNIQUES.map((t) => (
                <Link key={t.name} href={`/tag/${encodeURIComponent(t.name)}`}>
                  <div className="group flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/60 px-3 py-2.5 hover:border-amber-500/30 hover:bg-stone-900 transition-all cursor-pointer">
                    <span className="text-xl">{t.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-200 truncate">{t.name}</p>
                      <p className="text-[10px] text-stone-600">{t.reels} {t.reels === 1 ? "reel" : "reels"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Personalised recommendations (only shown when following someone) */}
            {recommended.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} className="text-amber-400" />
                  <h2 className="text-sm font-semibold text-stone-300">Recommended for you</h2>
                  <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[9px] text-stone-500">Based on who you follow</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {recommended.map((a) => {
                    const avatar = a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${a.id}`;
                    const alreadyFollowing = isFollowing(a.id);
                    return (
                      <div key={a.id} className="shrink-0 flex flex-col items-center gap-1.5 w-20">
                        <Link href={`/artists/${a.id}`}>
                          <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-amber-500/40 hover:border-amber-400/70 transition-colors cursor-pointer">
                            <img src={avatar} alt={a.name} className="h-full w-full object-cover hover:scale-105 transition-transform" />
                          </div>
                        </Link>
                        <p className="text-[10px] text-stone-400 text-center max-w-[72px] truncate">{a.name.split(" ")[0]}</p>
                        <button
                          onClick={() => alreadyFollowing ? unfollowArtist(a.id) : followArtist(a.id, a.name, avatar)}
                          className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${alreadyFollowing ? "border-stone-600 text-stone-500" : "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-stone-950"}`}
                        >
                          {alreadyFollowing ? "Following" : "Follow"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New & rising artists — real low-follower active makers */}
            <div className="flex items-center gap-2 mb-3">
              <Flame size={13} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-stone-300">New &amp; rising artists</h2>
              <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[9px] text-stone-500">Fresh on Kiln</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {risingDisplay.map((a) => (
                <Link key={a.id} href={`/artists/${a.id}`}>
                  <div className="shrink-0 flex flex-col items-center gap-1 cursor-pointer group w-16">
                    <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-amber-500/30 group-hover:border-amber-400/70 transition-colors">
                      <img src={a.avatar} alt={a.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <p className="text-[10px] text-stone-400 group-hover:text-amber-300 transition-colors text-center max-w-[60px] truncate">{a.name.split(" ")[0]}</p>
                    {a.medium && <p className="text-[9px] text-stone-600 text-center max-w-[60px] truncate">{a.medium}</p>}
                  </div>
                </Link>
              ))}
            </div>

            {/* Weekly challenge callout */}
            <Link href="/challenges">
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 hover:bg-amber-500/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Trophy size={18} className="text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-100">Community Challenges</p>
                    <p className="text-xs text-stone-500">Enter the latest prompt and share your work</p>
                  </div>
                </div>
                <span className="text-xs text-amber-400 font-medium">Enter →</span>
              </div>
            </Link>
          </div>

          {/* Kiln Picks — real top creators from the leaderboard */}
          {leaderboardArtists.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-amber-400" />
                  <h2 className="text-sm font-semibold text-stone-300">Kiln Picks</h2>
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">TOP CREATORS</span>
                </div>
                <span className="text-xs text-stone-600">The most-followed makers on Kiln right now</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {leaderboardArtists.slice(0, 3).map((artist, idx) => {
                  const badge = idx === 0 ? "🏆 Most Followed" : idx === 1 ? "✨ #2 on Kiln" : "🔥 #3 on Kiln";
                  const count = artist.followerCount ?? 0;
                  const followerLabel = count === 1 ? "1 follower" : `${count.toLocaleString()} followers`;
                  return (
                    <Link key={artist.id} href={`/artists/${artist.id}`}>
                      <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4 hover:border-amber-500/40 hover:from-amber-500/5 transition-all cursor-pointer h-full">
                        <div className="mb-3 flex items-center gap-2.5">
                          <img src={artist.avatarUrl} alt={artist.name} className="h-10 w-10 rounded-full object-cover border border-white/10 group-hover:border-amber-400/40 transition-colors" />
                          <div>
                            <p className="text-sm font-semibold text-stone-100 group-hover:text-amber-200 transition-colors">{artist.name}</p>
                            {artist.medium && <span className="text-[10px] text-amber-400/80 font-medium">{artist.medium}</span>}
                          </div>
                        </div>
                        <div className="mb-3 inline-flex rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {badge}
                        </div>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          {followerLabel}{artist.location ? ` · ${artist.location}` : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* On a streak — makers posting consistently right now */}
          {streakLeaders.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-stone-300">On a streak</h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">POSTING DAILY</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {streakLeaders.slice(0, 12).map((s) => {
                  const name = s.displayName ?? s.handle ?? "Artist";
                  const avatar = s.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${s.userId}`;
                  return (
                    <Link key={s.userId} href={`/artists/${s.userId}`}>
                      <div className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group w-16">
                        <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-amber-500/40 group-hover:border-amber-400/70 transition-colors">
                          <img src={avatar} alt={name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-500 px-1 py-0.5 text-[8px] font-bold text-stone-950">
                            🔥{s.currentStreak}
                          </div>
                        </div>
                        <p className="text-[10px] text-stone-400 group-hover:text-amber-300 transition-colors text-center max-w-[60px] truncate">{name.split(" ")[0]}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* From the community — real profiles from the platform */}
          {communityProfiles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-stone-300">From the community</h2>
                <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[9px] text-stone-500">Live on Kiln</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {communityProfiles.map((p) => {
                  const following = communityFollowing.has(p.userId) || p.isFollowing;
                  const displayName = p.displayName ?? p.handle ?? "Artist";
                  const avatarUrl = p.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${p.userId}`;
                  return (
                    <div key={p.userId} className="flex flex-col items-center gap-2.5 rounded-2xl border border-white/8 bg-stone-900/60 p-4 hover:border-amber-500/30 hover:bg-stone-900 transition-all">
                      <img src={avatarUrl} alt={displayName} className="h-12 w-12 rounded-full object-cover border border-white/10" />
                      <div className="text-center min-w-0 w-full">
                        <p className="text-sm font-semibold text-stone-100 truncate">{displayName}</p>
                        {p.medium && <p className="text-[10px] text-stone-500 truncate">{p.medium}</p>}
                        <p className="text-[10px] text-stone-600">{p.followerCount} followers</p>
                      </div>
                      <button
                        onClick={() => handleCommunityFollow(p.userId)}
                        className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${following ? "border-stone-600 text-stone-500" : "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-stone-950"}`}
                      >
                        {following ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={searchRef} className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 z-10 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search by name, technique, or location…"
              className="w-full bg-stone-900 border border-stone-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500 transition-colors"
            />
            {query && (
              <button onClick={() => { setQuery(""); setShowSuggestions(false); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 z-10">
                <X size={16} />
              </button>
            )}
            {/* Autocomplete dropdown */}
            {showSuggestions && query.length >= 2 && (suggestions.artists.length > 0 || suggestions.techniques.length > 0) && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-2xl border border-white/10 bg-stone-900 shadow-xl shadow-black/40 overflow-hidden">
                {suggestions.techniques.length > 0 && (
                  <div className="p-2 border-b border-white/5">
                    <p className="px-3 pb-1 text-[10px] font-bold tracking-widest text-stone-600">TECHNIQUES</p>
                    {suggestions.techniques.map((t) => (
                      <button
                        key={t}
                        onMouseDown={() => { navigate(`/tag/${encodeURIComponent(t)}`); setShowSuggestions(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-stone-300 hover:bg-stone-800 transition-colors"
                      >
                        <Flame size={12} className="text-amber-400 shrink-0" />
                        {t}
                        <ChevronRight size={12} className="ml-auto text-stone-700" />
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.artists.length > 0 && (
                  <div className="p-2">
                    <p className="px-3 pb-1 text-[10px] font-bold tracking-widest text-stone-600">ARTISTS</p>
                    {suggestions.artists.map((a) => {
                      const avatar = a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${a.id}`;
                      return (
                        <button
                          key={a.id}
                          onMouseDown={() => { navigate(`/artists/${a.id}`); setShowSuggestions(false); }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-stone-800 transition-colors"
                        >
                          <img src={avatar} alt={a.name} className="h-7 w-7 rounded-full object-cover shrink-0 border border-white/10" />
                          <div className="min-w-0">
                            <p className="text-sm text-stone-200 truncate">{a.name}</p>
                            <p className="text-[10px] text-stone-600 truncate">{a.location} · {a.medium.split(",")[0]}</p>
                          </div>
                          <ChevronRight size={12} className="ml-auto text-stone-700 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {MEDIUMS.map((m) => (
              <button
                key={m}
                onClick={() => setMedium(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  medium === m
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-stone-700 text-stone-400 hover:border-stone-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-xs text-stone-500 self-center mr-1">Location:</span>
            {uniqueLocations.slice(0, 8).map((loc) => (
              <button
                key={loc}
                onClick={() => setLocationFilter(loc)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  locationFilter === loc
                    ? "border-sky-500 bg-sky-500/10 text-sky-300"
                    : "border-stone-700 text-stone-400 hover:border-stone-500"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <span className="text-xs text-stone-500 self-center mr-1">Commission:</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-stone-700 text-stone-400 hover:border-stone-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Technique / material search */}
          <div className="mb-6">
            <p className="text-xs text-stone-500 mb-2">Popular techniques:</p>
            <div className="flex flex-wrap gap-1.5">
              {["Glass Blowing","Flameworking","Kiln Forming","Raku","Reduction Firing","Blacksmithing","Bronze Casting","Natural Dyeing","Cloisonné","Pâte de Verre","Welding","Fiber Arts"].map((t) => (
                <button
                  key={t}
                  onClick={() => setQuery((q) => q === t ? "" : t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    query === t
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* AI semantic search results */}
          {isNaturalLanguage(query) && (aiSearching || aiListings.length > 0) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-stone-300">
                  {aiSearching ? "Searching…" : `Shop results — ${aiInterpretation}`}
                </h2>
                {!aiSearching && aiListings.length > 0 && (
                  <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[9px] text-stone-500">{aiListings.length} listing{aiListings.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              {aiSearching ? (
                <div className="flex items-center gap-2 text-xs text-stone-500 py-2">
                  <div className="h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  Understanding your search…
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {aiListings.map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => navigate(`/shop/${listing.id}`)}
                      className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden text-left hover:border-amber-500/20 transition-colors"
                    >
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt={listing.title} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-stone-800 flex items-center justify-center text-stone-600 text-2xl">🏺</div>
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-stone-200 line-clamp-1">{listing.title}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">{listing.medium ?? ""}{listing.price ? ` · $${listing.price}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API / platform search results */}
          {query.trim().length >= 2 && apiSearchResults.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Search size={13} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-stone-300">Artists on Kiln matching "{query.trim()}"</h2>
                <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[9px] text-stone-500">{apiSearchResults.length} result{apiSearchResults.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {apiSearchResults.map((p) => {
                  const avatarUrl = p.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${p.id}`;
                  const name = p.displayName ?? p.handle ?? "Artist";
                  return (
                    <div key={p.id} className="flex flex-col items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-stone-900/60 p-4 hover:border-amber-500/40 hover:bg-stone-900 transition-all cursor-pointer"
                      onClick={() => navigate(`/artists/${p.id}`)}>
                      <img src={avatarUrl} alt={name} className="h-12 w-12 rounded-full object-cover border border-white/10" />
                      <div className="text-center min-w-0 w-full">
                        <p className="text-sm font-semibold text-stone-100 truncate">{name}</p>
                        {p.medium && <p className="text-[10px] text-amber-400 truncate">{p.medium}</p>}
                        {p.followerCount != null && <p className="text-[10px] text-stone-600">{p.followerCount.toLocaleString()} followers</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-white/5 mb-5" />
            </div>
          )}

          <p className="text-xs text-stone-500 mb-4">{filtered.length} artist{filtered.length !== 1 ? "s" : ""} in library</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((artist) => {
              const status = getArtistCommissionStatus(artist.id);
              const statusInfo = STATUS_UI[status];
              const workshops = getWorkshopsByArtist(artist.id);
              const following = isFollowing(artist.id);
              const avatar = artist.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${artist.id}`;

              return (
                <div
                  key={artist.id}
                  onClick={() => navigate(`/artists/${artist.id}`)}
                  className="bg-stone-900 rounded-2xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-amber-500/50 transition-all group"
                >
                  <div className="relative aspect-square">
                    <img src={avatar} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                    <div className={`absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs font-medium ${statusInfo.color}`}>
                      <statusInfo.Icon size={9} />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-semibold text-stone-100 truncate">{artist.name}</p>
                    <p className="text-xs text-amber-400 truncate mb-1">{artist.medium}</p>
                    <div className="flex items-center gap-1 text-xs text-stone-500 mb-2">
                      <MapPin size={9} />
                      <span className="truncate">{artist.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        {workshops.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Hammer size={9} className="text-amber-400" />
                            {workshops.length}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Users size={9} />
                          {artist.followerCount > 0 ? artist.followerCount.toLocaleString() : "—"}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (following) {
                            unfollowArtist(artist.id);
                          } else {
                            followArtist(artist.id, artist.name, avatar);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          following
                            ? "border-stone-600 text-stone-400 hover:border-rose-500 hover:text-rose-400"
                            : "border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-stone-950"
                        }`}
                      >
                        {following ? "Following" : "Follow"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No artists match your search.</p>
              <button onClick={() => { setQuery(""); setMedium("All"); setStatusFilter("Any"); }} className="mt-3 text-xs text-amber-400 hover:text-amber-300">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
