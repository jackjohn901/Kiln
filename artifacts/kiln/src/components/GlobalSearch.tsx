import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, X, TrendingUp, ArrowRight, User, BookOpen, Wrench, MapPin, Flame, FlaskConical, ScrollText, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { TECHNIQUES } from "@/data/techniques";
import { workshops } from "@/data/workshops";
import { ALL_REELS } from "@/data/reels";
import { MATERIALS } from "@/data/materials";
import { ALL_SERIES } from "@/data/processSeries";
import { challenges } from "@/data/challenges";

const ALL_ARTISTS = [...artists, ...seedArtists];

interface DbProfile {
  userId: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  medium: string | null;
  location: string | null;
  followerCount: number;
}

const TRENDING = [
  "glass blowing", "raku", "Alex Bernstein", "celadon", "Seattle studio",
  "metal forging", "Lino Tagliapietra", "flameworking", "wood turning",
];

interface Props { onClose: () => void; }

export default function GlobalSearch({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dbProfiles, setDbProfiles] = useState<DbProfile[]>([]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setDbProfiles([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=5`)
        .then((r) => r.ok ? r.json() : { profiles: [] })
        .then((data) => setDbProfiles(data.profiles ?? []))
        .catch(() => setDbProfiles([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const q = query.toLowerCase().trim();

  const artistHits = q
    ? ALL_ARTISTS.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.medium.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const techniqueHits = q
    ? TECHNIQUES.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.medium.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const workshopHits = q
    ? workshops.filter((w) =>
        w.title.toLowerCase().includes(q) ||
        w.artistName.toLowerCase().includes(q) ||
        w.location.toLowerCase().includes(q) ||
        w.technique.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const postHits = q
    ? ALL_REELS.filter((r) =>
        r.caption.toLowerCase().includes(q) ||
        r.artistName.toLowerCase().includes(q) ||
        r.technique.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const materialHits = q
    ? MATERIALS.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const seriesHits = q
    ? ALL_SERIES.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.artistName.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const challengeHits = q
    ? challenges.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.technique ?? "").toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const staticArtistIds = new Set(ALL_ARTISTS.map((a) => a.id));
  const dbOnlyProfiles = dbProfiles.filter((p) => !staticArtistIds.has(p.userId));

  const hasResults = dbOnlyProfiles.length + artistHits.length + techniqueHits.length + workshopHits.length + postHits.length + materialHits.length + seriesHits.length + challengeHits.length > 0;

  function go(href: string) { navigate(href); onClose(); }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="mx-auto mt-12 max-w-2xl px-4" onClick={(e) => e.stopPropagation()}>
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-stone-900 px-4 py-3.5 shadow-2xl shadow-black/60 mb-2">
            <Search size={18} className="shrink-0 text-amber-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artists, techniques, workshops, posts…"
              className="flex-1 bg-transparent text-base text-stone-100 placeholder-stone-600 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              {query && (
                <button onClick={() => setQuery("")} className="text-stone-600 hover:text-stone-300 transition-colors">
                  <X size={15} />
                </button>
              )}
              <kbd className="hidden sm:flex rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-500">ESC</kbd>
            </div>
          </div>

          {/* Results panel */}
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-stone-950/98 shadow-2xl max-h-[70vh] overflow-y-auto">
            {/* Empty state: trending + quick links */}
            {!q && (
              <div className="p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-600">Trending</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {TRENDING.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="flex items-center gap-1.5 rounded-full border border-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                    >
                      <TrendingUp size={9} className="text-amber-500" /> {s}
                    </button>
                  ))}
                </div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-600">Quick links</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { href: "/discover", icon: User, label: "Discover Artists" },
                    { href: "/techniques", icon: BookOpen, label: "Technique Library" },
                    { href: "/workshops", icon: Wrench, label: "Find Workshops" },
                    { href: "/map", icon: MapPin, label: "Studio Map" },
                    { href: "/challenges", icon: Flame, label: "Challenges" },
                    { href: "/shop", icon: Search, label: "Browse Works" },
                  ].map(({ href, icon: Icon, label }) => (
                    <button
                      key={href}
                      onClick={() => go(href)}
                      className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/3 px-3 py-2.5 text-sm text-stone-400 hover:border-amber-500/20 hover:text-amber-300 transition-colors text-left"
                    >
                      <Icon size={13} className="text-amber-400 shrink-0" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {q && !hasResults && (
              <div className="px-5 py-10 text-center">
                <Search size={24} className="mx-auto mb-3 text-stone-700" />
                <p className="text-sm text-stone-500">No results for <span className="text-stone-300">"{query}"</span></p>
              </div>
            )}

            {/* Real DB users */}
            {dbOnlyProfiles.length > 0 && (
              <div className="border-b border-white/5">
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Artists on Kiln</p>
                {dbOnlyProfiles.map((p) => (
                  <button key={p.userId} onClick={() => go(`/artists/${p.userId}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <img
                      src={p.avatarUrl ?? `https://picsum.photos/seed/${p.userId}/80/80`}
                      alt={p.displayName ?? "Artist"}
                      className="h-10 w-10 rounded-full object-cover shrink-0 border border-amber-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200">{p.displayName ?? "Artist"}</p>
                      <p className="text-xs text-stone-600 truncate">
                        {p.handle ? `@${p.handle}` : ""}{p.medium ? ` · ${p.medium.split(",")[0]}` : ""}{p.location ? ` · ${p.location}` : ""}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Artists */}
            {artistHits.length > 0 && (
              <div className="border-b border-white/5">
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Artists</p>
                {artistHits.map((a) => {
                  const avatar = a.images?.[0]?.url ?? `https://picsum.photos/seed/${a.id}/80/80`;
                  return (
                    <button key={a.id} onClick={() => go(`/artists/${a.id}`)}
                      className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <img src={avatar} alt={a.name} className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/10" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-200">{a.name}</p>
                        <p className="text-xs text-stone-600 truncate">{a.medium.split(",")[0]} · {a.location}</p>
                      </div>
                      <ArrowRight size={13} className="text-stone-700 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Techniques */}
            {techniqueHits.length > 0 && (
              <div className="border-b border-white/5">
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Techniques</p>
                {techniqueHits.map((t) => (
                  <button key={t.id} onClick={() => go(`/techniques/${t.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                      <BookOpen size={15} className="text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200">{t.name}</p>
                      <p className="text-xs text-stone-600 truncate">{t.medium} · {t.difficulty} · {t.learnTime}</p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Workshops */}
            {workshopHits.length > 0 && (
              <div className="border-b border-white/5">
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Workshops</p>
                {workshopHits.map((w) => (
                  <button key={w.id} onClick={() => go(`/workshops/book/${w.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15">
                      <Wrench size={15} className="text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200 truncate">{w.title}</p>
                      <p className="text-xs text-stone-600 truncate">{w.location} · ${w.price} · {w.spotsLeft} spots left</p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Posts */}
            {postHits.length > 0 && (
              <div className="border-b border-white/5">
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Posts</p>
                {postHits.map((r) => (
                  <button key={r.id} onClick={() => go(`/posts/${r.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <img
                      src={r.thumbnail}
                      alt={r.caption}
                      className="h-10 w-10 rounded-lg object-cover shrink-0 bg-stone-800"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/100/100`; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200 truncate">{r.caption}</p>
                      <p className="text-xs text-stone-600 truncate">{r.artistName} · {r.technique}</p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Materials */}
            {materialHits.length > 0 && (
              <div className="border-b border-white/5">
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Materials</p>
                {materialHits.map((m) => (
                  <button key={m.id} onClick={() => go("/materials")}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                      <FlaskConical size={15} className="text-teal-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200">{m.name}</p>
                      <p className="text-xs text-stone-600 truncate capitalize">{m.category} · {m.description.slice(0, 50)}…</p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Challenges */}
            {challengeHits.length > 0 && (
              <div>
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Challenges</p>
                {challengeHits.map((c) => (
                  <button key={c.id} onClick={() => go("/challenges")}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                      <Trophy size={15} className="text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200 truncate">{c.title}</p>
                      <p className="text-xs text-stone-600 truncate">{c.subtitle}{c.technique ? ` · ${c.technique}` : ""}</p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Series / Journals */}
            {seriesHits.length > 0 && (
              <div>
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">Process Journals</p>
                {seriesHits.map((s) => (
                  <button key={s.id} onClick={() => go(`/series/${s.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
                      <ScrollText size={15} className="text-rose-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-200 truncate">{s.title}</p>
                      <p className="text-xs text-stone-600 truncate">{s.artistName} · {s.steps.length} steps</p>
                    </div>
                    <ArrowRight size={13} className="text-stone-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
