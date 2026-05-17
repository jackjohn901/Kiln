import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search as SearchIcon, X, User, Image, Package, BookOpen, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useMeta } from "@/hooks/useMeta";

interface ApiPost {
  id: string;
  authorId: string;
  caption: string | null;
  technique: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface ApiArtist {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  techniques: string[] | null;
}

interface ApiListing {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
}

interface ApiGuild {
  id: string;
  name: string;
  description: string | null;
  memberCount: number | null;
}

interface SearchResults {
  posts: ApiPost[];
  artists: ApiArtist[];
  listings: ApiListing[];
  guilds: ApiGuild[];
}

type Tab = "all" | "artists" | "posts" | "listings" | "guilds";

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

export default function Search() {
  useMeta({ title: "Search" });
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 350);
  const [tab, setTab] = useState<Tab>("all");
  const [results, setResults] = useState<SearchResults>({ posts: [], artists: [], listings: [], guilds: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!dq || dq.length < 2) {
      setResults({ posts: [], artists: [], listings: [], guilds: [] });
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(dq)}&type=all`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: SearchResults | null) => {
        if (data) setResults(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dq]);

  const hasResults = results.artists.length + results.posts.length + results.listings.length + results.guilds.length > 0;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: results.artists.length + results.posts.length + results.listings.length + results.guilds.length },
    { id: "artists", label: "Artists", count: results.artists.length },
    { id: "posts", label: "Posts", count: results.posts.length },
    { id: "listings", label: "Shop", count: results.listings.length },
    { id: "guilds", label: "Guilds", count: results.guilds.length },
  ];

  const showArtists = (tab === "all" || tab === "artists") && results.artists.length > 0;
  const showPosts = (tab === "all" || tab === "posts") && results.posts.length > 0;
  const showListings = (tab === "all" || tab === "listings") && results.listings.length > 0;
  const showGuilds = (tab === "all" || tab === "guilds") && results.guilds.length > 0;

  return (
    <div className="min-h-screen bg-[#12100e] pb-28 md:pb-8">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* Search bar */}
        <div className="relative mb-4">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search artists, posts, shops, guilds…"
            className="w-full rounded-2xl border border-white/10 bg-stone-900 pl-10 pr-10 py-3 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500/50 focus:outline-none"
          />
          {q && (
            <button
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
            >
              <X size={15} />
            </button>
          )}
          {loading && (
            <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 animate-spin" />
          )}
        </div>

        {/* Tabs — only show when there are results */}
        {dq.length >= 2 && hasResults && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.filter((t) => t.id === "all" || t.count > 0).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  tab === t.id
                    ? "bg-amber-500 text-stone-950"
                    : "border border-white/10 bg-stone-900 text-stone-400 hover:text-stone-200"
                }`}
              >
                {t.label}
                {t.id !== "all" && t.count > 0 && (
                  <span className="ml-1.5 opacity-70">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {dq.length < 2 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-800">
              <SearchIcon size={28} className="text-stone-500" />
            </div>
            <div>
              <p className="text-stone-300 font-medium">Search Kiln</p>
              <p className="text-stone-600 text-sm mt-1">Find artists, posts, listings, and communities</p>
            </div>
          </div>
        )}

        {/* No results */}
        {dq.length >= 2 && !loading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="text-stone-400">No results for <span className="text-amber-400">"{dq}"</span></p>
            <p className="text-stone-600 text-sm">Try a different keyword or browse <Link href="/discover"><span className="text-amber-400 cursor-pointer">Discover</span></Link></p>
          </div>
        )}

        <div className="space-y-6">
          {/* Artists */}
          {showArtists && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-1.5">
                <User size={11} /> Artists
              </h3>
              <div className="space-y-2">
                {results.artists.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/artists/${a.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/50 p-3 text-left hover:border-amber-500/25 transition-all"
                  >
                    {a.avatarUrl ? (
                      <img src={a.avatarUrl} alt={a.name ?? ""} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 shrink-0">
                        <span className="text-sm font-bold text-white">{(a.name ?? "?").charAt(0)}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-100 truncate">{a.name}</p>
                      {a.location && <p className="text-xs text-stone-500 truncate">{a.location}</p>}
                      {a.techniques && a.techniques.length > 0 && (
                        <p className="text-xs text-amber-500/80 truncate">{a.techniques.slice(0, 3).join(" · ")}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Posts */}
          {showPosts && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-1.5">
                <Image size={11} /> Posts
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {results.posts.map((p) => {
                  const thumb = p.thumbnailUrl ?? p.videoUrl;
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/posts/${p.id}`)}
                      className="relative aspect-square overflow-hidden rounded-xl bg-stone-800 hover:opacity-90 transition-opacity"
                    >
                      {thumb ? (
                        <img src={thumb} alt={p.caption ?? ""} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Image size={20} className="text-stone-600" />
                        </div>
                      )}
                      {p.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-1.5">
                          <p className="text-[9px] text-white/80 line-clamp-1">{p.caption}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Listings */}
          {showListings && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-1.5">
                <Package size={11} /> Shop
              </h3>
              <div className="space-y-2">
                {results.listings.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/listings/${l.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/50 p-3 text-left hover:border-amber-500/25 transition-all"
                  >
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt={l.title} className="h-12 w-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-800 shrink-0">
                        <Package size={16} className="text-stone-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-100 truncate">{l.title}</p>
                      {l.price != null && (
                        <p className="text-xs text-amber-400">${(l.price / 100).toFixed(2)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Guilds */}
          {showGuilds && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-1.5">
                <BookOpen size={11} /> Guilds
              </h3>
              <div className="space-y-2">
                {results.guilds.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/guilds/${g.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/50 p-3 text-left hover:border-amber-500/25 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 shrink-0">
                      <BookOpen size={16} className="text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-100 truncate">{g.name}</p>
                      {g.description && <p className="text-xs text-stone-500 line-clamp-1">{g.description}</p>}
                      {g.memberCount != null && <p className="text-xs text-stone-600">{g.memberCount} members</p>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
