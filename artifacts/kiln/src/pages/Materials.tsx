import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, Search, Star, ChevronDown, ChevronUp, ExternalLink, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { MATERIALS, CATEGORY_LABELS, CATEGORY_EMOJIS, type MaterialCategory, type MaterialEntry } from "@/data/materials";

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={10} className={n <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-stone-700"} />
        ))}
      </div>
      <span className="text-[10px] text-stone-500">{rating.toFixed(1)} ({count})</span>
    </div>
  );
}

function MaterialCard({ entry }: { entry: MaterialEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-stone-900/60">
      <button className="w-full text-left px-4 py-4" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {entry.manufacturer && (
                <span className="text-[10px] font-semibold text-stone-500">{entry.manufacturer}</span>
              )}
              {entry.subcategory && (
                <span className="text-[10px] rounded-full border border-white/10 bg-stone-800 px-2 py-0.5 text-stone-500">{entry.subcategory}</span>
              )}
            </div>
            <h3 className="font-semibold text-stone-200 text-sm leading-snug">{entry.name}</h3>
            <div className="mt-1"><StarRating rating={entry.communityRating} count={entry.reviewCount} /></div>
          </div>
          {expanded ? <ChevronUp size={14} className="text-stone-600 shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-stone-600 shrink-0 mt-0.5" />}
        </div>

        {/* Description preview */}
        {!expanded && (
          <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">{entry.description}</p>
        )}

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.slice(0, expanded ? undefined : 4).map((t) => (
            <span key={t} className="rounded-full bg-stone-800/80 px-2 py-0.5 text-[10px] text-stone-500">#{t}</span>
          ))}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-white/8 px-4 py-4 space-y-4">
              <p className="text-sm text-stone-400 leading-relaxed">{entry.description}</p>

              {entry.specs && Object.keys(entry.specs).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-2">Specifications</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(entry.specs).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-stone-800/60 px-3 py-2">
                        <p className="text-[10px] text-stone-600 mb-0.5">{k}</p>
                        <p className="text-xs font-semibold text-stone-300">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entry.compatibleWith && entry.compatibleWith.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-2">Compatible With</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.compatibleWith.map(c => (
                      <span key={c} className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 text-xs text-emerald-400">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {entry.supplierLinks && entry.supplierLinks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-2">Where to Buy</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.supplierLinks.map(s => (
                      <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:text-amber-300 transition-colors">
                        <ExternalLink size={10} /> {s.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Materials() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<MaterialCategory | "all">("all");

  const categories = (["all", "glass", "clay", "glaze", "metal", "fiber"] as (MaterialCategory | "all")[]);

  const filtered = useMemo(() => {
    return MATERIALS.filter(m => {
      const matchCategory = activeCategory === "all" || m.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.manufacturer?.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.tags.some(t => t.includes(q));
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  // Group filtered by subcategory
  const grouped = useMemo(() => {
    const map: Record<string, MaterialEntry[]> = {};
    for (const m of filtered) {
      const key = m.subcategory ?? m.category;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/discover" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Materials Library</h1>
            <p className="text-xs text-stone-500 mt-0.5">Community-reviewed craft materials, colors, and supplies</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search materials, manufacturers, properties..."
            className="w-full rounded-xl border border-white/10 bg-stone-900/80 py-2.5 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
          />
        </div>

        {/* Category tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === cat ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-500 hover:text-stone-300"
              }`}
            >
              {cat !== "all" && <span>{CATEGORY_EMOJIS[cat as MaterialCategory]}</span>}
              {cat === "all" ? "All Materials" : CATEGORY_LABELS[cat as MaterialCategory]}
            </button>
          ))}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-stone-600">No materials found for "{search}".</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([subcategory, entries]) => (
              <div key={subcategory}>
                <p className="mb-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">{subcategory}</p>
                <div className="flex flex-col gap-2">
                  {entries.map(entry => (
                    <MaterialCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contribute CTA */}
        <div className="mt-10 rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-5 text-center">
          <p className="text-sm font-semibold text-stone-300 mb-1">Know a material we're missing?</p>
          <p className="text-xs text-stone-500 mb-3">The Materials Library is community-built. Submit materials, specifications, and supplier links.</p>
          <a href="mailto:materials@kiln.art" className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
            Contribute a material
          </a>
        </div>
      </div>
    </div>
  );
}
