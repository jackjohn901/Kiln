import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Heart, Bookmark, Flame, ChevronRight, ChevronLeft,
  Info, Video,
} from "lucide-react";
import Nav from "@/components/Nav";
import { artists, type Artist } from "@/data/artists";
import { getPosts, type Post } from "@/data/posts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function craftScore(id: string): number {
  return 78 + (hash(id) % 20);
}

function statVal(seed: string, min: number, max: number): number {
  return min + (hash(seed) % (max - min));
}

function fmt(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

function getTechnique(medium: string): string {
  const m = medium.toLowerCase();
  if (m.includes("blown") || m.includes("blow")) return "Glass Blowing";
  if (m.includes("cast")) return "Glass Casting";
  if (m.includes("fused") || m.includes("kiln") || m.includes("kiln-formed")) return "Kiln Forming";
  if (m.includes("flamework")) return "Flameworking";
  if (m.includes("metal") || m.includes("steel") || m.includes("forge")) return "Metal Forging";
  if (m.includes("sculpt") || m.includes("carv")) return "Sculpture";
  if (m.includes("fiber") || m.includes("thread")) return "Fiber Arts";
  if (m.includes("ceramic") || m.includes("clay")) return "Ceramics";
  if (m.includes("glass")) return "Studio Glass";
  return "Studio Craft";
}

function matchFilter(artist: Artist, filter: string): boolean {
  if (filter === "All") return true;
  const m = artist.medium.toLowerCase();
  if (filter === "Glass") return m.includes("glass");
  if (filter === "Metal") return m.includes("metal") || m.includes("steel") || m.includes("forge");
  if (filter === "Sculpture") return m.includes("sculpt") || m.includes("cast") || m.includes("carv");
  if (filter === "Fiber") return m.includes("fiber") || m.includes("thread");
  return true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  type: "process_video" | "artwork" | "user_post";
  artistId: string;
  artistName: string;
  artistNationality: string;
  artistMedium: string;
  imageUrl: string;
  videoId?: string;
  title: string;
  caption: string;
  technique: string;
  score: number;
  likes: number;
  saves: number;
}

function buildItems(filter: string, userPosts: Post[]): FeedItem[] {
  const items: FeedItem[] = [];

  for (const a of artists) {
    if (!matchFilter(a, filter)) continue;
    const technique = getTechnique(a.medium);
    const score = craftScore(a.id);

    // Process videos — primary content
    for (const v of a.videos) {
      items.push({
        id: `${a.id}-v-${v.id}`,
        type: "process_video",
        artistId: a.id,
        artistName: a.name,
        artistNationality: a.nationality,
        artistMedium: a.medium,
        imageUrl: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
        videoId: v.id,
        title: v.title,
        caption: a.tagline,
        technique,
        score,
        likes: statVal(a.id + v.id, 120, 3200),
        saves: statVal(a.id + v.id + "s", 40, 900),
      });
    }

    // Artwork images
    for (let imgIdx = 0; imgIdx < a.images.length; imgIdx++) {
      const img = a.images[imgIdx];
      items.push({
        id: `${a.id}-img-${imgIdx}`,
        type: "artwork",
        artistId: a.id,
        artistName: a.name,
        artistNationality: a.nationality,
        artistMedium: a.medium,
        imageUrl: img.url,
        title: a.name,
        caption: img.caption,
        technique,
        score,
        likes: statVal(a.id + img.url, 80, 2100),
        saves: statVal(a.id + img.url + "s", 25, 700),
      });
    }
  }

  // User posts at top
  for (const p of userPosts) {
    items.unshift({
      id: p.id,
      type: "user_post",
      artistId: p.artistId,
      artistName: p.artistName,
      artistNationality: "",
      artistMedium: "",
      imageUrl: p.mediaUrl,
      title: p.caption,
      caption: p.caption,
      technique: p.tags[0] ?? "Studio Craft",
      score: 78,
      likes: p.likes,
      saves: p.saves,
    });
  }

  return items.sort((a, b) => (a.type === "user_post" ? -1 : b.score - a.score));
}

// col span in a 7-item repeating editorial pattern (fills a 3-col grid perfectly)
function colSpan(index: number) {
  const pos = index % 7;
  return pos === 0 || pos === 6 ? "lg:col-span-2" : "lg:col-span-1";
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

const FEATURED_IDS = ["lino-tagliapietra", "alex-bernstein", "dante-marioni"].filter((id) =>
  artists.some((a) => a.id === id),
);
const featuredArtists = [
  ...artists.filter((a) => FEATURED_IDS.includes(a.id)),
  ...artists.filter((a) => !FEATURED_IDS.includes(a.id)),
].slice(0, 3);

function Hero() {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const artist = featuredArtists[idx] ?? artists[0];
  const video = artist.videos[0];
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featuredArtists.length), 8000);
    return () => clearInterval(t);
  }, [playing]);

  const bgImg = video
    ? `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`
    : artist.images[0]?.url ?? "";

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(380px, 52vh, 560px)" }}>
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={artist.id + "-bg"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {playing && video ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&mute=0`}
              className="h-full w-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <img src={bgImg} alt={artist.name} className="h-full w-full object-cover" />
          )}
          {!playing && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-[#12100e] via-[#12100e]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12100e]/80 via-transparent to-transparent" />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Content overlay */}
      {!playing && (
        <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-10 md:max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Featured Process
              </p>
              <h2 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                {artist.name}
              </h2>
              <p className="mt-1 text-sm text-stone-300">
                {getTechnique(artist.medium)} · {artist.nationality}
              </p>
              <p className="mt-3 line-clamp-2 text-sm text-stone-400 max-w-xs">
                {artist.tagline}
              </p>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {/* Craft Score */}
                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1">
                  <Flame size={12} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Craft Score {craftScore(artist.id)}</span>
                </div>

                {video && (
                  <button
                    onClick={() => setPlaying(true)}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/20"
                  >
                    <Play size={13} fill="white" />
                    Watch Process
                  </button>
                )}

                <Link
                  href={`/artists/${artist.id}`}
                  className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Explore work <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Close video button */}
      {playing && (
        <button
          onClick={() => setPlaying(false)}
          className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
        >
          ✕
        </button>
      )}

      {/* Navigation dots */}
      {!playing && (
        <div className="absolute bottom-5 right-6 z-10 flex items-center gap-3">
          <button
            onClick={() => setIdx((i) => (i - 1 + featuredArtists.length) % featuredArtists.length)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex gap-1.5">
            {featuredArtists.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-amber-400" : "w-1.5 bg-white/30"}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIdx((i) => (i + 1) % featuredArtists.length)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

function FeedCard({ item }: { item: FeedItem }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative h-full overflow-hidden rounded-xl bg-stone-900 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Media */}
      {playing && item.videoId ? (
        <div className="absolute inset-0">
          <iframe
            src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`}
            className="h-full w-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          <button
            onClick={(e) => { e.stopPropagation(); setPlaying(false); }}
            className="absolute right-2 top-2 z-20 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white hover:bg-black"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <img
            src={item.imageUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

          {/* Top badges */}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            {item.type === "process_video" && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-stone-950 backdrop-blur-sm">
                <Video size={9} /> Process
              </span>
            )}
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-stone-300 backdrop-blur-sm">
              {item.technique}
            </span>
          </div>

          {/* Craft Score */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <Flame size={9} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-300">{item.score}</span>
          </div>

          {/* Play button for videos */}
          {item.type === "process_video" && (
            <button
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border border-white/30 backdrop-blur-sm transition-all hover:bg-white/30">
                <Play size={20} fill="white" className="text-white ml-0.5" />
              </div>
            </button>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <Link href={`/artists/${item.artistId}`} onClick={(e) => e.stopPropagation()}>
              <p className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors">
                {item.artistName}
              </p>
            </Link>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-stone-400">{item.caption}</p>

            {/* Hover actions */}
            <div className={`mt-2 flex items-center gap-3 transition-all duration-200 ${hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
              <button
                onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
                className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-red-400 transition-colors"
              >
                <Heart size={11} fill={liked ? "currentColor" : "none"} className={liked ? "text-red-400" : ""} />
                {fmt(item.likes + (liked ? 1 : 0))}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}
                className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-amber-400 transition-colors"
              >
                <Bookmark size={11} fill={saved ? "currentColor" : "none"} className={saved ? "text-amber-400" : ""} />
                {fmt(item.saves + (saved ? 1 : 0))}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Series Strip ──────────────────────────────────────────────────────────────

function SeriesStrip() {
  const allSeries = artists.flatMap((a) =>
    a.series.slice(0, 2).map((s) => ({
      ...s,
      artist: a,
      imageUrl: a.images[0]?.url ?? `https://img.youtube.com/vi/${a.videos[0]?.id ?? ""}/mqdefault.jpg`,
    })),
  );

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-lg text-amber-100">Explore by Series</h3>
        <Link href="/artists" className="flex items-center gap-1 text-xs text-stone-500 hover:text-amber-400 transition-colors">
          All artists <ChevronRight size={12} />
        </Link>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {allSeries.map((s, i) => (
            <Link key={i} href={`/artists/${s.artist.id}`} className="group flex w-36 shrink-0 flex-col gap-1.5">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-white/8 bg-stone-800">
                <img
                  src={s.imageUrl}
                  alt={s.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="line-clamp-1 text-xs font-medium text-stone-300 group-hover:text-amber-300 transition-colors">
                {s.name}
              </p>
              <p className="text-[10px] text-stone-600">{s.artist.name} · {s.years}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────

const FILTERS = ["All", "Glass", "Metal", "Sculpture", "Fiber"] as const;

export default function Feed() {
  const [filter, setFilter] = useState<string>("All");
  const [showInfo, setShowInfo] = useState(false);
  const [userPosts] = useState(() => getPosts());

  const items = buildItems(filter, userPosts);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <Hero />

      {/* Filter bar */}
      <div className="sticky top-14 z-30 border-b border-white/8 bg-[#12100e]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pr-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-amber-500 text-stone-950"
                    : "border border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30 hover:text-stone-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Craft Score info */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="ml-2 flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Flame size={10} /> Craft Score
            <Info size={10} />
          </button>
        </div>

        {showInfo && (
          <div className="border-t border-white/5 bg-amber-500/5 px-6 py-3 text-xs text-stone-400">
            <strong className="text-amber-400">Craft Score</strong> — Kiln's measure of artistic mastery.
            Ranked by technique, material complexity, and originality — not likes or follows.
            Process videos are weighted higher because making matters most.
          </div>
        )}
      </div>

      {/* Editorial grid */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {items.length === 0 ? (
          <div className="py-20 text-center text-stone-600">No works match this filter.</div>
        ) : (
          <>
            <div
              className="grid grid-cols-2 gap-3 lg:grid-cols-3"
              style={{ gridAutoRows: "260px" }}
            >
              {items.slice(0, 14).map((item, i) => (
                <div key={item.id} className={`h-full ${colSpan(i)}`}>
                  <FeedCard item={item} />
                </div>
              ))}
            </div>

            {/* Series strip between grid segments */}
            <SeriesStrip />

            {items.length > 14 && (
              <div
                className="grid grid-cols-2 gap-3 lg:grid-cols-3"
                style={{ gridAutoRows: "260px" }}
              >
                {items.slice(14).map((item, i) => (
                  <div key={item.id} className={`h-full ${colSpan(i)}`}>
                    <FeedCard item={item} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA to join */}
        <div className="mt-12 mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <Flame size={28} className="mx-auto mb-3 text-amber-400" />
          <h3 className="font-serif text-2xl text-amber-100">Share your process</h3>
          <p className="mt-2 text-sm text-stone-400 max-w-sm mx-auto">
            Kiln is free for craft artists. No fees. No commission on sales. Just a place to show your work and your making.
          </p>
          <Link
            href="/setup"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            Join Kiln — it's free <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
