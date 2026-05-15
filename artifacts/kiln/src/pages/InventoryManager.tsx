import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Package, Plus, Edit2, Check, X, Eye, EyeOff,
  DollarSign, Image, Trash2, Save, ToggleLeft, ToggleRight,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { listings as ALL_LISTINGS, formatPrice, type Listing } from "@/data/listings";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const OVERRIDES_KEY = "kiln_inventory_overrides_v1";
const NEW_KEY = "kiln_inventory_new_v1";

interface ListingOverride {
  available?: boolean;
  price?: number;
  title?: string;
}

function readOverrides(): Record<string, ListingOverride> {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}"); } catch { return {}; }
}
function writeOverrides(o: Record<string, ListingOverride>) {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); } catch {}
}

function readNew(): Listing[] {
  try { return JSON.parse(localStorage.getItem(NEW_KEY) ?? "[]"); } catch { return []; }
}
function writeNew(items: Listing[]) {
  try { localStorage.setItem(NEW_KEY, JSON.stringify(items)); } catch {}
}

const ALL_ARTISTS = [...artists, ...seedArtists];

function getListingsForArtist(artistId: string): Listing[] {
  return ALL_LISTINGS.filter((l) => l.artistId === artistId);
}

interface NewListingForm {
  title: string;
  medium: string;
  year: string;
  dimensions: string;
  price: string;
  description: string;
}

const EMPTY_FORM: NewListingForm = { title: "", medium: "", year: new Date().getFullYear().toString(), dimensions: "", price: "", description: "" };

export default function InventoryManager() {
  const { profile } = useProfile();
  const [overrides, setOverrides] = useState<Record<string, ListingOverride>>(readOverrides);
  const [newListings, setNewListings] = useState<Listing[]>(readNew);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState<NewListingForm>(EMPTY_FORM);
  const [filter, setFilter] = useState<"all" | "available" | "sold">("all");
  const [saved, setSaved] = useState<string | null>(null);

  // Use any artist as demo if no profile
  const artistId = profile?.id ?? artists[0].id;
  const artistName = ALL_ARTISTS.find((a) => a.id === artistId)?.name ?? "You";

  const baseListings = useMemo(() => getListingsForArtist(artistId), [artistId]);
  const allListings: Listing[] = useMemo(() => [...baseListings, ...newListings.filter((l) => l.artistId === artistId)], [baseListings, newListings, artistId]);

  function effective(listing: Listing): Listing {
    const ov = overrides[listing.id] ?? {};
    return { ...listing, ...ov };
  }

  const displayed = useMemo(() => {
    const effected = allListings.map(effective);
    if (filter === "available") return effected.filter((l) => l.available);
    if (filter === "sold") return effected.filter((l) => !l.available);
    return effected;
  }, [allListings, overrides, filter]);

  function toggleAvailable(id: string, current: boolean) {
    const next = { ...overrides, [id]: { ...(overrides[id] ?? {}), available: !current } };
    setOverrides(next);
    writeOverrides(next);
    setSaved(id);
    setTimeout(() => setSaved(null), 1500);
  }

  function startEdit(listing: Listing) {
    const eff = effective(listing);
    setEditingId(listing.id);
    setEditPrice(String(eff.price));
    setEditTitle(eff.title);
  }

  function saveEdit(id: string) {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) return;
    const next = { ...overrides, [id]: { ...(overrides[id] ?? {}), price, title: editTitle } };
    setOverrides(next);
    writeOverrides(next);
    setEditingId(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 1500);
  }

  function addListing() {
    const price = parseFloat(form.price);
    if (!form.title || isNaN(price)) return;
    const newItem: Listing = {
      id: `custom-${Date.now()}`,
      artistId,
      title: form.title,
      medium: form.medium || "Mixed media",
      year: form.year || String(new Date().getFullYear()),
      dimensions: form.dimensions || "Dimensions on request",
      price: price,
      available: true,
      imageUrl: null,
    };
    const next = [...newListings, newItem];
    setNewListings(next);
    writeNew(next);
    setForm(EMPTY_FORM);
    setAddingNew(false);
  }

  function deleteNew(id: string) {
    const next = newListings.filter((l) => l.id !== id);
    setNewListings(next);
    writeNew(next);
  }

  const totalValue = displayed.filter((l) => l.available).reduce((s, l) => s + l.price, 0);
  const soldCount = displayed.filter((l) => !l.available).length;
  const availCount = displayed.filter((l) => l.available).length;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/creator-home" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Package size={20} className="text-amber-400" /> Inventory
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">Manage your shop listings</p>
          </div>
          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Plus size={14} /> Add listing
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-white/8 bg-stone-900/40 p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{availCount}</p>
            <p className="text-xs text-stone-600">Available</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-stone-900/40 p-3 text-center">
            <p className="text-lg font-bold text-stone-500">{soldCount}</p>
            <p className="text-xs text-stone-600">Sold</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-stone-900/40 p-3 text-center">
            <p className="text-lg font-bold text-amber-300">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-stone-600">Available value</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 mb-4">
          {(["all", "available", "sold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                filter === f ? "bg-amber-500 text-stone-950 font-bold" : "border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Listings */}
        <div className="space-y-2">
          <AnimatePresence>
            {displayed.map((listing) => {
              const isEditing = editingId === listing.id;
              const isNew = newListings.some((n) => n.id === listing.id);
              const justSaved = saved === listing.id;

              return (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`rounded-2xl border ${listing.available ? "border-white/8 bg-stone-900/60" : "border-white/5 bg-stone-900/30"} overflow-hidden`}
                >
                  <div className="flex gap-3 p-4">
                    {/* Thumbnail */}
                    <div className={`h-16 w-16 shrink-0 rounded-xl overflow-hidden ${listing.imageUrl ? "" : "bg-stone-800 flex items-center justify-center"}`}>
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt="" className={`h-full w-full object-cover ${!listing.available ? "opacity-50 grayscale" : ""}`} />
                      ) : (
                        <Image size={18} className="text-stone-700" />
                      )}
                    </div>

                    {/* Info / edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg border border-amber-500/30 bg-stone-800 px-2 py-1.5 text-sm text-stone-200 focus:outline-none"
                            placeholder="Title"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-stone-500 text-sm">$</span>
                            <input
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              type="number"
                              className="w-28 rounded-lg border border-amber-500/30 bg-stone-800 px-2 py-1.5 text-sm text-stone-200 focus:outline-none"
                              placeholder="Price"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium line-clamp-1 ${listing.available ? "text-stone-200" : "text-stone-500"}`}>{listing.title}</p>
                            {!listing.available && <span className="shrink-0 rounded-full bg-stone-800 px-2 py-0.5 text-[9px] text-stone-500 font-semibold uppercase tracking-wide">Sold</span>}
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">{listing.medium.split(",")[0]} · {listing.year} · {listing.dimensions}</p>
                          <p className="text-sm font-bold text-amber-300 mt-1">{formatPrice(listing.price)}</p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(listing.id)} className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                            <Save size={10} /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded-full hover:bg-white/5 transition-colors">
                            <X size={13} className="text-stone-600" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleAvailable(listing.id, listing.available)}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                              listing.available
                                ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/15"
                                : "border-white/10 text-stone-500 hover:border-white/20"
                            }`}
                          >
                            {listing.available ? <Eye size={9} /> : <EyeOff size={9} />}
                            {listing.available ? "Listed" : "Hidden"}
                          </button>
                          <button onClick={() => startEdit(listing)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
                            <Edit2 size={12} className="text-stone-500" />
                          </button>
                          {isNew && (
                            <button onClick={() => deleteNew(listing.id)} className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors">
                              <Trash2 size={12} className="text-stone-700 hover:text-red-400" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {justSaved && (
                    <div className="flex items-center gap-1.5 border-t border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs text-emerald-400">
                      <Check size={10} /> Saved
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {displayed.length === 0 && (
            <div className="py-16 text-center">
              <Package size={36} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500">No listings yet</p>
              <button onClick={() => setAddingNew(true)} className="mt-3 rounded-full border border-amber-500/30 px-4 py-2 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                Add your first listing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add listing modal */}
      <AnimatePresence>
        {addingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setAddingNew(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-stone-900 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <h2 className="font-semibold text-stone-200">Add new listing</h2>
                <button onClick={() => setAddingNew(false)} className="p-1 rounded-full hover:bg-white/5">
                  <X size={16} className="text-stone-500" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Title *", field: "title" as const, placeholder: "Name of the work" },
                  { label: "Medium", field: "medium" as const, placeholder: "e.g. Blown glass with murrine" },
                  { label: "Year", field: "year" as const, placeholder: "2026" },
                  { label: "Dimensions", field: "dimensions" as const, placeholder: 'e.g. 12" H × 8" W' },
                  { label: "Price ($) *", field: "price" as const, placeholder: "e.g. 4500" },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="text-xs text-stone-500 mb-1 block">{label}</label>
                    <input
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={placeholder}
                      type={field === "price" ? "number" : "text"}
                      className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the piece, technique, provenance…"
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAddingNew(false)} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400 hover:border-white/20 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={addListing}
                    disabled={!form.title || !form.price}
                    className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
                  >
                    Add listing
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
