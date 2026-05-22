import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { Heart, Eye, X, MapPin, ExternalLink, LayoutGrid, Columns3 } from "lucide-react";

interface GalleryItem {
  postId: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  caption: string;
  tags: string[];
  likeCount: number;
  viewCount: number;
  createdAt: string;
  artist: {
    id: string;
    handle: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    location: string | null;
  };
}

const LIMIT = 40;

// Deterministic pseudo-random height class for visual variety (seeded by postId)
function heightClass(postId: string): string {
  const n = postId.charCodeAt(0) + postId.charCodeAt(postId.length - 1);
  const buckets = ["h-48", "h-56", "h-64", "h-72", "h-80", "h-96"];
  return buckets[n % buckets.length];
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [cols, setCols] = useState<2 | 3 | 4>(3);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(
    async (reset = false) => {
      const offset = reset ? 0 : offsetRef.current;
      if (reset) setLoading(true); else setLoadingMore(true);
      try {
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
        if (activeTag) params.set("tag", activeTag);
        const res = await fetch(`/api/gallery?${params}`, { credentials: "include" });
        if (!res.ok) throw new Error("fetch failed");
        const data: { items: GalleryItem[] } = await res.json();
        setItems((prev) => reset ? data.items : [...prev, ...data.items]);
        offsetRef.current = offset + data.items.length;
        setHasMore(data.items.length === LIMIT);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTag],
  );

  useEffect(() => {
    fetch("/api/gallery/tags", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    fetchItems(true);
  }, [fetchItems]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchItems(false);
        }
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchItems, hasMore, loadingMore, loading]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightbox) return;
    const idx = items.findIndex((i) => i.postId === lightbox.postId);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" && idx < items.length - 1) setLightbox(items[idx + 1]);
      if (e.key === "ArrowLeft" && idx > 0) setLightbox(items[idx - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, items]);

  const colClass =
    cols === 2 ? "columns-2" : cols === 3 ? "columns-2 sm:columns-3" : "columns-2 sm:columns-3 md:columns-4";

  const artistName = (a: GalleryItem["artist"]) =>
    a.displayName ?? (a.handle ? `@${a.handle}` : "Artist");

  return (
    <div className="min-h-screen bg-stone-950 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-stone-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-xl text-amber-100 leading-none">Gallery</h1>
            <p className="text-[11px] text-stone-500 mt-0.5">Works by Kiln artists</p>
          </div>

          {/* Column toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1">
            <button
              onClick={() => setCols(2)}
              className={`rounded p-1.5 transition-colors ${cols === 2 ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
              title="2 columns"
            >
              <Columns3 size={14} />
            </button>
            <button
              onClick={() => setCols(3)}
              className={`rounded p-1.5 transition-colors ${cols === 3 ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
              title="3 columns"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setCols(4)}
              className={`rounded p-1.5 transition-colors ${cols === 4 ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
              title="4 columns"
            >
              <LayoutGrid size={12} />
            </button>
          </div>
        </div>

        {/* Tag filter chips */}
        {tags.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTag(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === null
                  ? "bg-amber-500 text-stone-950"
                  : "border border-white/10 text-stone-400 hover:text-stone-200"
              }`}
            >
              All
            </button>
            {tags.map(({ tag }) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTag === tag
                    ? "bg-amber-500 text-stone-950"
                    : "border border-white/10 text-stone-400 hover:text-stone-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Masonry grid */}
      <div className="mx-auto max-w-7xl px-3 pt-4">
        {loading ? (
          <div className={`${colClass} gap-3`}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`mb-3 break-inside-avoid rounded-xl bg-stone-900 animate-pulse ${
                  ["h-48","h-64","h-72","h-56","h-80","h-60","h-52","h-96"][i % 8]
                }`}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-24 text-center">
            <p className="text-stone-400">No images yet</p>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="mt-3 text-sm text-amber-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className={`${colClass} gap-3`}>
            {items.map((item) => (
              <GalleryTile
                key={item.postId}
                item={item}
                heightClass={heightClass(item.postId)}
                artistName={artistName(item.artist)}
                onOpen={() => setLightbox(item)}
              />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          item={lightbox}
          artistName={artistName(lightbox.artist)}
          onClose={() => setLightbox(null)}
          onPrev={() => {
            const idx = items.findIndex((i) => i.postId === lightbox.postId);
            if (idx > 0) setLightbox(items[idx - 1]);
          }}
          onNext={() => {
            const idx = items.findIndex((i) => i.postId === lightbox.postId);
            if (idx < items.length - 1) setLightbox(items[idx + 1]);
          }}
          hasPrev={items.findIndex((i) => i.postId === lightbox.postId) > 0}
          hasNext={items.findIndex((i) => i.postId === lightbox.postId) < items.length - 1}
        />
      )}
    </div>
  );
}

function GalleryTile({
  item,
  heightClass: hClass,
  artistName,
  onOpen,
}: {
  item: GalleryItem;
  heightClass: string;
  artistName: string;
  onOpen: () => void;
}) {
  return (
    <div className="mb-3 break-inside-avoid group relative rounded-xl overflow-hidden cursor-pointer">
      {/* Image */}
      <div className={`${hClass} w-full bg-stone-900`}>
        <img
          src={item.thumbnailUrl}
          alt={item.caption || `Work by ${artistName}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onClick={onOpen}
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
        {/* Top-right: stats */}
        <div className="flex justify-end gap-2">
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-stone-300 backdrop-blur-sm">
            <Heart size={9} className="fill-rose-400 text-rose-400" />
            {item.likeCount}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-stone-300 backdrop-blur-sm">
            <Eye size={9} />
            {item.viewCount}
          </span>
        </div>

        {/* Bottom: artist info + view button */}
        <div className="flex items-end justify-between gap-2">
          <Link
            href={`/artists/${item.artist.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 min-w-0"
          >
            {item.artist.avatarUrl ? (
              <img
                src={item.artist.avatarUrl}
                alt={artistName}
                className="h-7 w-7 rounded-full object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-amber-500/30 flex items-center justify-center shrink-0 text-amber-300 text-xs font-bold">
                {artistName[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-none">{artistName}</p>
              {item.artist.location && (
                <p className="text-[10px] text-stone-400 flex items-center gap-0.5 mt-0.5">
                  <MapPin size={8} /> {item.artist.location}
                </p>
              )}
            </div>
          </Link>

          {/* View this post button */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="shrink-0 rounded-full bg-amber-500 p-1.5 hover:bg-amber-400 transition-colors"
            title="View post"
          >
            <ExternalLink size={11} className="text-stone-950" />
          </button>
        </div>
      </div>

      {/* Tags (shown below image, not in overlay) */}
      {item.tags.length > 0 && (
        <div className="px-2 pt-1.5 pb-0.5 flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[9px] text-stone-500 bg-stone-900 rounded-full px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({
  item,
  artistName,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  item: GalleryItem;
  artistName: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-4xl w-full rounded-2xl overflow-hidden bg-stone-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex-1 flex items-center justify-center bg-stone-950 min-w-0">
          <img
            src={item.thumbnailUrl}
            alt={item.caption || `Work by ${artistName}`}
            className="max-h-[90vh] max-w-full object-contain"
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col border-l border-white/10 p-5">
          {/* Artist */}
          <Link
            href={`/artists/${item.artist.id}`}
            onClick={onClose}
            className="flex items-center gap-3 mb-4 group"
          >
            {item.artist.avatarUrl ? (
              <img
                src={item.artist.avatarUrl}
                alt={artistName}
                className="h-10 w-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300 font-bold">
                {artistName[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-stone-100 group-hover:text-amber-300 transition-colors leading-none">
                {artistName}
              </p>
              {item.artist.location && (
                <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {item.artist.location}
                </p>
              )}
            </div>
          </Link>

          {item.caption && (
            <p className="text-sm text-stone-300 leading-relaxed mb-4">{item.caption}</p>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-stone-400">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-4 mt-auto pt-4 border-t border-white/10">
            <span className="flex items-center gap-1.5 text-sm text-stone-400">
              <Heart size={14} className="fill-rose-400 text-rose-400" />
              {item.likeCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-stone-400">
              <Eye size={14} />
              {item.viewCount.toLocaleString()}
            </span>
          </div>

          <Link
            href={`/artists/${item.artist.id}`}
            onClick={onClose}
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            View artist profile
          </Link>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-stone-300 hover:text-white transition-colors backdrop-blur-sm"
        >
          <X size={16} />
        </button>

        {/* Prev / Next */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-stone-300 hover:text-white transition-colors backdrop-blur-sm text-xl font-bold"
          >
            ‹
          </button>
        )}
        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-[17rem] top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-stone-300 hover:text-white transition-colors backdrop-blur-sm text-xl font-bold"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
