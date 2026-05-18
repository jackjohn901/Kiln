import { useState, useMemo, useRef, useEffect } from "react";
import { Search, MapPin, CheckCircle, Clock, Lock, Users, Hammer, X, TrendingUp, Flame, Trophy, Sparkles, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial, CommissionStatus } from "@/contexts/SocialContext";
import { getWorkshopsByArtist } from "@/data/workshops";
import { ALL_REELS } from "@/data/reels";
import Nav from "@/components/Nav";

const TRENDING_TECHNIQUES = [
  { name: "Glass Blowing", emoji: "🔥", growth: "+24%", reels: ALL_REELS.filter((r) => r.technique === "Glass Blowing").length },
  { name: "Raku", emoji: "🏺", growth: "+18%", reels: ALL_REELS.filter((r) => r.technique === "Raku").length },
  { name: "Metal Forging", emoji: "⚒️", growth: "+31%", reels: ALL_REELS.filter((r) => r.technique === "Metal Forging").length },
  { name: "Fiber Arts", emoji: "🧵", growth: "+12%", reels: ALL_REELS.filter((r) => r.technique === "Fiber Arts").length },
  { name: "Ceramics", emoji: "🎨", growth: "+9%", reels: ALL_REELS.filter((r) => r.technique === "Ceramics").length },
  { name: "Flameworking", emoji: "🌡️", growth: "+41%", reels: ALL_REELS.filter((r) => r.technique === "Flameworking").length },
];

const ALL_ARTISTS = [...artists, ...seedArtists];

const MEDIUMS = ["All", "Glass", "Metal", "Ceramics", "Fiber", "Wood", "Enamel", "Sculpture", "Mixed"];
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

  const suggestions = useMemo(() => {
    if (query.length < 2) return { artists: [], techniques: [] };
    const q = query.toLowerCase();
    const artistMatches = ALL_ARTISTS
      .filter((a) => a.name.toLowerCase().includes(q) || a.location.toLowerCase().includes(q))
      .slice(0, 5);
    const allTechniques = [...new Set(ALL_REELS.map((r) => r.technique))];
    const techniqueMatches = allTechniques.filter((t) => t.toLowerCase().includes(q)).slice(0, 3);
    return { artists: artistMatches, techniques: techniqueMatches };
  }, [query]);

  // Personalised recommendations: artists sharing mediums/techniques with who the user follows
  const recommended = useMemo(() => {
    if (!following.length) return [];
    const followedIds = new Set(following);
    const followedMediumWords = new Set<string>();
    following.forEach((artistId) => {
      const a = ALL_ARTISTS.find((x) => x.id === artistId);
      if (a) {
        a.medium.toLowerCase().split(/[,/\s]+/).filter((w) => w.length > 3).forEach((w) => followedMediumWords.add(w));
      }
    });
    return ALL_ARTISTS
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
  }, [following]);

  const uniqueLocations = useMemo(() => {
    const cities = ALL_ARTISTS.map((a) => a.location?.split(",")[0]?.trim()).filter(Boolean);
    return ["Any", ...Array.from(new Set(cities)).sort()];
  }, []);

  const filtered = useMemo(() => {
    return ALL_ARTISTS.filter((a) => {
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
  }, [query, medium, statusFilter, locationFilter, getArtistCommissionStatus]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />

      <div className="pt-16 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="py-8">
            <h1 className="text-2xl font-bold text-stone-100 mb-1">Discover Artists</h1>
            <p className="text-sm text-stone-400">Find craft artists by technique, location, or commission availability</p>
          </div>

          {/* Trending this week */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-stone-300">Trending this week</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {TRENDING_TECHNIQUES.map((t) => (
                <Link key={t.name} href={`/tag/${encodeURIComponent(t.name)}`}>
                  <div className="group flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/60 px-3 py-2.5 hover:border-amber-500/30 hover:bg-stone-900 transition-all cursor-pointer">
                    <span className="text-xl">{t.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-200 truncate">{t.name}</p>
                      <p className="text-[10px] text-stone-600">{t.reels} reels</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold text-emerald-400 shrink-0">{t.growth}</span>
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
                    const avatar = a.images?.[0]?.url ?? `https://picsum.photos/seed/${a.id}/200/200`;
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

            {/* Rising artists */}
            <div className="flex items-center gap-2 mb-3">
              <Flame size={13} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-stone-300">Rising artists</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {[...artists, ...seedArtists].slice(0, 8).map((a) => {
                const avatar = a.images?.[0]?.url ?? `https://picsum.photos/seed/${a.id}/200/200`;
                return (
                  <Link key={a.id} href={`/artists/${a.id}`}>
                    <div className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group">
                      <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-amber-500/30 group-hover:border-amber-400/70 transition-colors">
                        <img src={avatar} alt={a.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <p className="text-[10px] text-stone-400 group-hover:text-amber-300 transition-colors text-center max-w-[60px] truncate">{a.name.split(" ")[0]}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Weekly challenge callout */}
            <Link href="/challenges">
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 hover:bg-amber-500/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Trophy size={18} className="text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-100">60-Second Gather · Live Challenge</p>
                    <p className="text-xs text-stone-500">347 entries · ends in 16 days</p>
                  </div>
                </div>
                <span className="text-xs text-amber-400 font-medium">Enter →</span>
              </div>
            </Link>
          </div>

          {/* Kiln Picks editorial */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-stone-300">Kiln Picks</h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400">EDITORIAL</span>
              </div>
              <span className="text-xs text-stone-600">Curated weekly by the Kiln team</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  artistId: "alex-bernstein",
                  artistName: "Alex Bernstein",
                  pick: "Best-in-class surface texture work — Bernstein's new optical-clear series is technically unprecedented.",
                  tag: "Glass Blowing",
                  badge: "🏆 Artist of the Week",
                },
                {
                  artistId: "dante-marioni",
                  artistName: "Dante Marioni",
                  pick: "The Venetian tall-vessel series is a masterclass in form. A direct lineage from Murano to Seattle.",
                  tag: "Glass Blowing",
                  badge: "✨ Editor's Pick",
                },
                {
                  artistId: "lino-tagliapietra",
                  artistName: "Lino Tagliapietra",
                  pick: "Lino's murrine work this quarter has pushed color layering into new territory. Required watching for any glass student.",
                  tag: "Murrine",
                  badge: "🔥 Most Watched",
                },
              ].map((pick) => {
                const artist = ALL_ARTISTS.find((a) => a.id === pick.artistId);
                const avatarUrl = artist?.images?.[0]?.url ?? `https://picsum.photos/seed/${pick.artistId}/200/200`;
                return (
                  <Link key={pick.artistId} href={`/artists/${pick.artistId}`}>
                    <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-4 hover:border-amber-500/40 hover:from-amber-500/5 transition-all cursor-pointer h-full">
                      <div className="mb-3 flex items-center gap-2.5">
                        <img src={avatarUrl} alt={pick.artistName} className="h-10 w-10 rounded-full object-cover border border-white/10 group-hover:border-amber-400/40 transition-colors" />
                        <div>
                          <p className="text-sm font-semibold text-stone-100 group-hover:text-amber-200 transition-colors">{pick.artistName}</p>
                          <span className="text-[10px] text-amber-400/80 font-medium">{pick.tag}</span>
                        </div>
                      </div>
                      <div className="mb-3 inline-flex rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        {pick.badge}
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed line-clamp-3">"{pick.pick}"</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

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
                  const avatarUrl = p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/200/200`;
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
                      const avatar = a.images?.[0]?.url ?? `https://picsum.photos/seed/${a.id}/80/80`;
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
                  const avatarUrl = p.avatarUrl ?? `https://picsum.photos/seed/${p.id}/200/200`;
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
              const avatar = artist.images?.[0]?.url ?? `https://picsum.photos/seed/${artist.id}/200/200`;

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
                          {(Math.abs(artist.name.charCodeAt(0) * 317 + artist.name.charCodeAt(1) * 131) % 4200 + 800).toLocaleString()}
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
