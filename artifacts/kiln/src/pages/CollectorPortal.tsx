import { useState, useMemo, useEffect } from "react";
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

  useEffect(() => {
    fetch("/api/me/collector-saves", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.savedIds?.length) {
          setSavedIds(data.savedIds);
          try { localStorage.setItem(SAVED_KEY, JSON.stringify(data.savedIds)); } catch {}
        }
        if (data.notes && Object.keys(data.notes).length) {
          setNotes(data.notes);
          try { localStorage.setItem(NOTES_KEY, JSON.stringify(data.notes)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

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
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    fetch(`/api/me/collector-saves/${id}`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  function openNotes(id: string) {
    setNotesOpen(id);
    setNotesDraft(notes[id] ?? "");
  }

  function saveNoteForListing(id: string) {
    const next = { ...notes, [id]: notesDraft };
    setNotes(next);
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch {}
    setNotesOpen(null);
    fetch(`/api/me/collector-notes/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: notesDraft }),
    }).catch(() => {});
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

            {/* Grid / List */}
            {view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((listing) => {
                  const isSaved = savedIds.includes(listing.id);
                  const inCart = isInCart(listing.id);
                  return (
                    <motion.div key={listing.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="group relative rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                      <div className="relative aspect-square bg-stone-800 overflow-hidden">
                        {listing.imageUrl ? (
                          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-700"><Package size={32} /></div>
                        )}
                        <button onClick={() => toggleSave(listing.id)}
                          className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${isSaved ? "bg-amber-500 text-stone-950" : "bg-black/50 text-white/70 hover:bg-black/70"}`}>
                          <Bookmark size={12} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-stone-200 truncate">{listing.title}</p>
                        <p className="text-[11px] text-stone-500 truncate">{getArtistName(listing.artistId)}</p>
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-amber-300">{formatPrice(listing.price)}</span>
                          <div className="flex gap-1">
                            <button onClick={() => openNotes(listing.id)}
                              className="p-1 rounded-lg text-stone-600 hover:text-stone-400 transition-colors" title="Add note">
                              <MessageCircle size={12} />
                            </button>
                            <Link href={`/shop/${listing.id}`}>
                              <button className="p-1 rounded-lg text-stone-600 hover:text-amber-400 transition-colors">
                                <Eye size={12} />
                              </button>
                            </Link>
                            {!inCart && (
                              <button onClick={() => addItem(listing)}
                                className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/30 transition-colors">
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                        {notes[listing.id] && (
                          <p className="mt-1.5 text-[10px] text-stone-500 italic truncate">{notes[listing.id]}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((listing) => {
                  const isSaved = savedIds.includes(listing.id);
                  return (
                    <div key={listing.id} className="flex gap-4 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
                      <div className="w-16 h-16 shrink-0 rounded-xl bg-stone-800 overflow-hidden">
                        {listing.imageUrl && <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-stone-200">{listing.title}</p>
                            <p className="text-xs text-stone-500">{getArtistName(listing.artistId)} · {listing.medium}</p>
                          </div>
                          <span className="text-sm font-bold text-amber-300 shrink-0">{formatPrice(listing.price)}</span>
                        </div>
                        {notes[listing.id] && <p className="mt-1 text-xs text-stone-500 italic">{notes[listing.id]}</p>}
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => toggleSave(listing.id)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${isSaved ? "bg-amber-500/20 text-amber-400" : "border border-white/10 text-stone-500 hover:text-stone-300"}`}>
                            <Bookmark size={10} fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Saved" : "Save"}
                          </button>
                          <button onClick={() => openNotes(listing.id)}
                            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-stone-500 hover:text-stone-300 transition-colors">
                            <MessageCircle size={10} /> Note
                          </button>
                          <Link href={`/shop/${listing.id}`}>
                            <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-stone-500 hover:text-amber-400 transition-colors">
                              <Eye size={10} /> View
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Saved tab */}
        {tab === "saved" && (
          <div>
            {savedListings.length === 0 ? (
              <div className="py-24 text-center">
                <Bookmark size={32} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500">No saved works yet.</p>
                <button onClick={() => setTab("browse")} className="mt-3 text-sm text-amber-500 hover:text-amber-400">Browse works</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedListings.map((listing) => (
                  <motion.div key={listing.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="group relative rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                    <div className="relative aspect-square bg-stone-800 overflow-hidden">
                      {listing.imageUrl && <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <button onClick={() => toggleSave(listing.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-amber-500 text-stone-950">
                        <Bookmark size={12} fill="currentColor" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-stone-200 truncate">{listing.title}</p>
                      <p className="text-[11px] text-stone-500">{getArtistName(listing.artistId)}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300">{formatPrice(listing.price)}</span>
                        <button onClick={() => openNotes(listing.id)}
                          className={`flex items-center gap-1 text-[10px] transition-colors ${notes[listing.id] ? "text-amber-400" : "text-stone-600 hover:text-stone-400"}`}>
                          <MessageCircle size={10} /> {notes[listing.id] ? "Note" : "Add note"}
                        </button>
                      </div>
                      {notes[listing.id] && <p className="mt-1 text-[10px] text-stone-500 italic truncate">{notes[listing.id]}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inquiries tab */}
        {tab === "inquiries" && (
          <div className="py-24 text-center">
            <MessageCircle size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500">Commission inquiries you've sent will appear here.</p>
            <p className="text-xs text-stone-600 mt-2">Use the "Inquire" button on any listing to start a conversation with an artist.</p>
          </div>
        )}
      </div>

      {/* Notes modal */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setNotesOpen(null)}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-stone-950 border border-white/10 p-6 space-y-4">
              <h3 className="text-base font-semibold text-amber-100">Collector note</h3>
              <p className="text-xs text-stone-500">{listings.find(l => l.id === notesOpen)?.title}</p>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                placeholder="Your private notes about this work — provenance thoughts, condition, why it interests you…"
                className="w-full resize-none rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setNotesOpen(null)}
                  className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors">
                  Cancel
                </button>
                <button onClick={() => saveNoteForListing(notesOpen)}
                  className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                  Save note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
