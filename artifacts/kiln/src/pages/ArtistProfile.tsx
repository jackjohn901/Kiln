import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "wouter";
import {
  ChevronLeft, ExternalLink, Heart, Bookmark, Share2,
  Play, Flame, MapPin, Grid3x3, Video, ShoppingBag,
  BookOpen, X, Plus,
} from "lucide-react";
import Nav from "@/components/Nav";
import { artists, getArtistById, type Artist } from "@/data/artists";
import { getListingsByArtist, formatPrice } from "@/data/listings";
import { useProfile } from "@/contexts/ProfileContext";
import { getPosts } from "@/data/posts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function craftScore(id: string): number {
  return 78 + (hash(id) % 20);
}

function getStats(id: string) {
  const h = hash(id);
  return {
    followers: 3000 + (h % 47000),
    following: 80 + (h % 400),
  };
}

// ─── Grid item types ──────────────────────────────────────────────────────────

interface GridItem {
  id: string;
  imageUrl: string;
  caption: string;
  isVideo: boolean;
  videoId?: string;
  isProcess: boolean;
  technique?: string;
}

function buildGrid(artist: Artist, includeUserPosts = false): GridItem[] {
  const items: GridItem[] = [];

  // Process videos first (primary content)
  for (const v of artist.videos) {
    items.push({
      id: `v-${v.id}`,
      imageUrl: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
      caption: v.title,
      isVideo: true,
      videoId: v.id,
      isProcess: true,
    });
  }

  // Artwork images
  for (const img of artist.images) {
    items.push({
      id: `img-${img.url.slice(-16)}`,
      imageUrl: img.url,
      caption: img.caption,
      isVideo: false,
      isProcess: false,
    });
  }

  if (includeUserPosts) {
    const posts = getPosts().filter((p) => p.artistId === artist.id);
    for (const p of posts) {
      items.push({
        id: p.id,
        imageUrl: p.mediaUrl,
        caption: p.caption,
        isVideo: p.type === "video",
        isProcess: true,
      });
    }
  }

  return items;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ item, onClose }: { item: GridItem; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X size={15} />
        </button>

        {item.isVideo && item.videoId ? (
          <div className="aspect-video overflow-hidden rounded-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`}
              className="h-full w-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-stone-900">
            <img
              src={item.imageUrl}
              alt={item.caption}
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-sm text-stone-300 line-clamp-2 flex-1">{item.caption}</p>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <button className="text-stone-400 hover:text-red-400 transition-colors"><Heart size={18} /></button>
            <button className="text-stone-400 hover:text-amber-400 transition-colors"><Bookmark size={18} /></button>
            <button className="text-stone-400 hover:text-stone-200 transition-colors"><Share2 size={18} /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type Tab = "posts" | "process" | "shop" | "bio";

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const artist = getArtistById(id ?? "");
  const isOwn = profile?.id === id;

  const [tab, setTab] = useState<Tab>("posts");
  const [lightbox, setLightbox] = useState<GridItem | null>(null);
  const [following, setFollowing] = useState(false);

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="text-stone-400 mb-4">Artist not found.</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">← Back to Discover</Link>
        </div>
      </div>
    );
  }

  const allGridItems = buildGrid(artist, isOwn);
  const processItems = allGridItems.filter((g) => g.isVideo);
  const artworkItems = allGridItems.filter((g) => !g.isVideo);
  const listings = getListingsByArtist(artist.id);
  const stats = getStats(artist.id);
  const score = craftScore(artist.id);

  const coverImg = artist.images[0]?.url
    ?? (artist.videos[0] ? `https://img.youtube.com/vi/${artist.videos[0].id}/hqdefault.jpg` : "");

  const tabItems = tab === "posts" ? allGridItems
    : tab === "process" ? processItems
    : [];

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />

      {/* Cover strip */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-900">
        {coverImg && (
          <img
            src={coverImg}
            alt=""
            className="h-full w-full object-cover opacity-60"
            style={{ filter: "blur(2px)", transform: "scale(1.06)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#12100e]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12100e]/40 to-transparent" />

        {/* Back button */}
        <Link
          href="/"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={16} />
        </Link>
      </div>

      {/* Profile section */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative -mt-12 flex items-end gap-4">
          {/* Avatar */}
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[#12100e] bg-stone-800 shadow-xl">
            {coverImg ? (
              <img src={coverImg} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-serif text-stone-500">
                {artist.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Action buttons (top-right) */}
          <div className="ml-auto flex items-center gap-2 pb-1">
            {isOwn ? (
              <>
                <Link
                  href="/create"
                  className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
                >
                  <Plus size={14} /> Post
                </Link>
                <Link
                  href="/setup"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-stone-300 hover:border-amber-400/40 transition-colors"
                >
                  Edit
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={() => setFollowing(!following)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    following
                      ? "border border-white/15 bg-transparent text-stone-300 hover:border-red-400/40 hover:text-red-400"
                      : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                  }`}
                >
                  {following ? "Following" : "Follow"}
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-stone-400 hover:border-white/30 transition-colors">
                  <Share2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name + handle */}
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-amber-100">{artist.name}</h1>
            <div className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5">
              <Flame size={11} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{score}</span>
            </div>
          </div>
          <p className="text-sm text-stone-500">@{artist.id}</p>
        </div>

        {/* Bio */}
        <p className="mt-2 text-sm text-stone-400 leading-relaxed max-w-xl">
          {artist.bio.length > 220 ? artist.bio.slice(0, 220) + "…" : artist.bio}
        </p>

        {/* Location + medium */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {artist.location}
          </span>
          <span>{artist.medium}</span>
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-amber-600 hover:text-amber-400 transition-colors"
            >
              <ExternalLink size={10} /> Website
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6 border-t border-white/8 pt-4">
          {[
            { label: "posts", value: allGridItems.length },
            { label: "followers", value: stats.followers.toLocaleString() },
            { label: "following", value: stats.following },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-bold text-white">{value}</p>
              <p className="text-xs text-stone-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Story highlights (series) */}
        {artist.series.length > 0 && (
          <div className="mt-5 overflow-x-auto pb-1">
            <div className="flex gap-4" style={{ width: "max-content" }}>
              {artist.series.map((s) => (
                <div key={s.name} className="flex flex-col items-center gap-1.5 w-16">
                  <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-amber-500/50 bg-stone-800 p-0.5">
                    <div className="h-full w-full overflow-hidden rounded-full bg-stone-700">
                      {coverImg && (
                        <img src={coverImg} alt={s.name} className="h-full w-full object-cover opacity-80" />
                      )}
                    </div>
                  </div>
                  <p className="line-clamp-1 text-center text-[10px] text-stone-400">{s.name.split(" ")[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="mt-5 flex border-b border-white/10">
          {(
            [
              { key: "posts", icon: Grid3x3, label: "Posts" },
              { key: "process", icon: Video, label: "Process" },
              { key: "shop", icon: ShoppingBag, label: "Shop" },
              { key: "bio", icon: BookOpen, label: "Bio" },
            ] as { key: Tab; icon: React.ElementType; label: string }[]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === key
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="py-4">
          {/* Posts / Process grid */}
          {(tab === "posts" || tab === "process") && (
            <>
              {tabItems.length === 0 ? (
                <div className="py-16 text-center text-stone-600 text-sm">
                  {tab === "process" ? "No process videos yet." : "No posts yet."}
                  {isOwn && (
                    <div className="mt-4">
                      <Link href="/create" className="text-amber-400 hover:text-amber-300 text-sm">
                        Share your first process →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5">
                  {tabItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setLightbox(item)}
                      className="group relative aspect-square overflow-hidden bg-stone-900"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.caption}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30 flex items-center justify-center">
                        {item.isVideo && (
                          <Play size={20} fill="white" className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                        )}
                      </div>
                      {/* Video badge */}
                      {item.isVideo && (
                        <div className="absolute right-1.5 top-1.5">
                          <Video size={11} className="text-white drop-shadow" />
                        </div>
                      )}
                      {/* Process badge */}
                      {item.isProcess && !item.isVideo && (
                        <div className="absolute left-1.5 top-1.5 rounded-sm bg-amber-500/80 px-1 py-0.5">
                          <span className="text-[8px] font-bold text-stone-950">WIP</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Shop */}
          {tab === "shop" && (
            <div>
              {listings.length === 0 ? (
                <div className="py-16 text-center text-stone-600 text-sm">No works available in the shop.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {listings.map((l) => (
                    <div key={l.id} className="group overflow-hidden rounded-xl border border-white/8 bg-stone-900/60">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={l.imageUrl}
                          alt={l.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-stone-200 text-sm line-clamp-1">{l.title}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{l.medium}</p>
                        <p className="mt-2 font-bold text-amber-400">{formatPrice(l.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bio */}
          {tab === "bio" && (
            <div className="max-w-2xl space-y-6 py-2">
              <div>
                <h3 className="mb-2 font-serif text-lg text-amber-100">About</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{artist.bio}</p>
              </div>

              {artist.artistStatement && (
                <div>
                  <h3 className="mb-2 font-serif text-lg text-amber-100">Artist Statement</h3>
                  <blockquote className="border-l-2 border-amber-500/40 pl-4 italic text-sm text-stone-400 leading-relaxed">
                    {artist.artistStatement}
                  </blockquote>
                </div>
              )}

              {artist.series.length > 0 && (
                <div>
                  <h3 className="mb-3 font-serif text-lg text-amber-100">Series</h3>
                  <div className="space-y-3">
                    {artist.series.map((s) => (
                      <div key={s.name} className="rounded-xl border border-white/8 bg-stone-900/40 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-stone-200">{s.name}</p>
                          <span className="text-xs text-stone-600">{s.years}</span>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {artist.collections.length > 0 && (
                <div>
                  <h3 className="mb-2 font-serif text-lg text-amber-100">Collections</h3>
                  <ul className="space-y-1">
                    {artist.collections.map((c) => (
                      <li key={c} className="text-sm text-stone-400 flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500/60" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* External links */}
              <div className="flex gap-3 flex-wrap">
                {artist.website && (
                  <a href={artist.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-sm text-stone-300 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
                  >
                    <ExternalLink size={13} /> Website
                  </a>
                )}
                <a href={artist.habatat} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-sm text-stone-300 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
                >
                  <ExternalLink size={13} /> Habatat Gallery
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </div>
  );
}
