import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bookmark, Eye, Filter, Search, SlidersHorizontal, ChevronLeft, Package, Star, MessageCircle, TrendingUp, Grid3x3, List } from "lucide-react";
import Nav from "@/components/Nav";
import { listings, formatPrice } from "@/data/listings";
import { artists } from "@/data/artists";
import { useCart } from "@/contexts/CartContext";

const SAVED_KEY = "kiln_collector_saved_v1";
const NOTES_KEY = "kiln_collector_notes_v1";

function readSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
function readNotes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}"); } catch { return {}; }
}
function saveSaved(ids: string[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}
function saveNotes(notes: Record<string, string>) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch {}
}

function getArtistName(artistId: string) {
  return artists.find((a) => a.id === artistId)?.name ?? artistId;
}

type Tab = "browse" | "saved" | "inquiries";
type View = "grid" | "list";

export default function CollectorPortal() {
  const [tab, setTab] = useState<Tab>("browse");
  const [view, setView] = useState<View>("grid");
  const [search, setSearch] = useState("");
  const [mediumFilter, setMediumFilter] = useState("All");
  const [maxPrice, setMaxPrice] = useState<number>(500000);
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [notes, setNotes] = useState<Record<string, string>>(readNotes);
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const { addItem, isInCart } = useCart();

  const MEDIUMS = ["All", "Glass", "Metal", "Ceramic", "Fiber", "Sculpture"];

  const filtered = useMemo(() => {
    let all = listings.filter((l) => l.available);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        getArtistName(l.artistId).toLowerCase().includes(q) ||
        l.medium.toLowerCase().includes(q)
      );
    }
    if (mediumFilter !== "All") {
      all = all.filter((l) => l.medium.toLowerCase().includes(mediumFilter.toLowerCase()));
    }
    all = all.filter((l) => l.price <= maxPrice);
    return all;
  }, [search, mediumFilter, maxPrice]);

  const savedListings = listings.filter((l) => savedIds.includes(l.id));

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveSaved(next);
      return next;
    });
  }

  function openNotes(id: string) {
    setNotesOpen(id);
    setNotesDraft(notes[id] ?? "");
  }

  function saveNoteForListing(id: string) {
    const next = { ...notes, [id]: notesDraft };
    setNotes(next);
    saveNotes(next);
    setNotesOpen(null);
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "browse", label: "Browse" },
    { key: "saved", label: "Saved", count: savedIds.length },
    { key: "inquiries", label: "Inquiries" },
  ];

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-amber-100">Collector Portal</h1>
            <p className="text-sm text-stone-500 mt-1">Discover and acquire original craft works</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView("grid")} className={`p-2 rounded-lg border transition-colors ${view === "grid" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-white/10 text-stone-500 hover:text-stone-300"}`}>
              <Grid3x3 size={14} />
            </button>
            <button onClick={() => setView("list")} className={`p-2 rounded-lg border transition-colors ${view === "list" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-white/10 text-stone-500 hover:text-stone-300"}`}>
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/8">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key ? "border-amber-500 text-amber-300" : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Browse tab */}
        {tab === "browse" && (
          <>
            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search works, artists, techniques…"
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 py-2.5 pl-8 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/30 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {MEDIUMS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMediumFilter(m)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      mediumFilter === m ? "bg-amber-500 text-stone-950 font-bold" : "border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div className="mb-6 flex items-center gap-4">
              <span className="text-xs text-stone-500 shrink-0">Max price: ${maxPrice >= 500000 ? "Any" : maxPrice.toLocaleString()}</span>
              <input
                type="range" min={500} max={500000} step={500}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
            </div>

            <p className="text-xs text-stone-600 mb-4">{filtered.length} works available</p>

            {view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden hover:border-white/15 transition-all"
                  >
                    <div className="relative aspect-square overflow-hidden bg-stone-800">
                      {listing.imageUrl && (
                        <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          onClick={() => toggleSave(listing.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70"
                        >
                          <Bookmark size={12} className={savedIds.includes(listing.id) ? "fill-amber-400 text-amber-400" : "text-white"} />
                        </button>
                        <button
                          onClick={() => openNotes(listing.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70"
                        >
                          <MessageCircle size={12} className={notes[listing.id] ? "text-amber-400" : "text-white"} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-0.5">{getArtistName(listing.artistId)}</p>
                      <p className="text-sm font-medium text-stone-200 line-clamp-1 mb-1">{listing.title}</p>
                      <p className="text-xs text-stone-600 mb-3">{listing.medium.split(",")[0]} · {listing.year}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-amber-100">{formatPrice(listing.price)}</span>
                        <button
                          onClick={() => addItem(listing)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                            isInCart(listing.id)
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                              : "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                          }`}
                        >
                          {isInCart(listing.id) ? "In cart" : "Add to cart"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 rounded-xl border border-white/8 bg-stone-900/60 p-3 hover:border-white/15 transition-colors"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-800">
                      {listing.imageUrl && <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">{getArtistName(listing.artistId)}</p>
                      <p className="text-sm font-medium text-stone-200 truncate">{listing.title}</p>
                      <p className="text-xs text-stone-600">{listing.medium.split(",")[0]} · {listing.year} · {listing.dimensions}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-amber-100">{formatPrice(listing.price)}</span>
                      <button onClick={() => toggleSave(listing.id)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
                        <Bookmark size={14} className={savedIds.includes(listing.id) ? "fill-amber-400 text-amber-400" : "text-stone-500"} />
                      </button>
                      <button
                        onClick={() => addItem(listing)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          isInCart(listing.id)
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                            : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                        }`}
                      >
                        {isInCart(listing.id) ? "In cart" : "Add"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="py-20 text-center">
                <Filter size={36} className="mx-auto mb-4 text-stone-700" />
                <p className="text-stone-500">No works match your filters</p>
              </div>
            )}
          </>
        )}

        {/* Saved tab */}
        {tab === "saved" && (
          <>
            {savedListings.length === 0 ? (
              <div className="py-24 text-center">
                <Bookmark size={40} className="mx-auto mb-4 text-stone-700" />
                <p className="text-stone-500 mb-1">No saved works yet</p>
                <p className="text-xs text-stone-700 mb-6">Bookmark pieces from the Browse tab</p>
                <button onClick={() => setTab("browse")} className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                  Browse works
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedListings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-800">
                      {listing.imageUrl && <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-0.5">{getArtistName(listing.artistId)}</p>
                      <p className="text-sm font-semibold text-stone-200 line-clamp-1">{listing.title}</p>
                      <p className="text-xs text-stone-600 mb-1">{listing.medium.split(",")[0]} · {listing.dimensions}</p>
                      {notes[listing.id] && (
                        <p className="text-xs text-stone-500 italic line-clamp-1">"{notes[listing.id]}"</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-bold text-amber-100">{formatPrice(listing.price)}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => openNotes(listing.id)} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-stone-400 hover:border-white/20 transition-colors">
                          Notes
                        </button>
                        <Link href={`/commission/${listing.artistId}`}>
                          <button className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[10px] text-amber-400 hover:bg-amber-500/20 transition-colors">
                            Inquire
                          </button>
                        </Link>
                        <button
                          onClick={() => toggleSave(listing.id)}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-red-400/70 hover:border-red-500/30 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Inquiries tab */}
        {tab === "inquiries" && (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <MessageCircle size={22} className="text-amber-400" />
            </div>
            <p className="text-stone-300 font-medium">Commission inquiries</p>
            <p className="text-sm text-stone-500 max-w-xs mx-auto">
              When you send commission requests to artists, they'll appear here for tracking.
            </p>
            <Link href="/artists">
              <button className="mt-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                Find artists
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Notes modal */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setNotesOpen(null); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-900 p-5 space-y-3"
            >
              <p className="text-sm font-semibold text-stone-200">Private notes</p>
              <p className="text-xs text-stone-500">{listings.find((l) => l.id === notesOpen)?.title}</p>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Dimensions, provenance notes, interest level, budget notes…"
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setNotesOpen(null)} className="rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:border-white/20 transition-colors">
                  Cancel
                </button>
                <button onClick={() => saveNoteForListing(notesOpen)} className="rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                  Save notes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
