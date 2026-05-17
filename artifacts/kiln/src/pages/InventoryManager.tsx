import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Package, Plus, Edit2, Check, X, Eye, EyeOff,
  DollarSign, Image, Trash2, Loader2,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { formatPrice } from "@/data/listings";

interface ApiListing {
  id: string;
  artistId: string;
  title: string;
  medium: string | null;
  year: number | null;
  dimensions: string | null;
  price: number;
  isSold: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  technique: string | null;
  description: string | null;
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
  const [apiListings, setApiListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState<NewListingForm>(EMPTY_FORM);
  const [filter, setFilter] = useState<"all" | "available" | "sold">("all");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me/listings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data?.listings)) setApiListings(data.listings); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    if (filter === "available") return apiListings.filter(l => l.isAvailable && !l.isSold);
    if (filter === "sold") return apiListings.filter(l => l.isSold || !l.isAvailable);
    return apiListings;
  }, [apiListings, filter]);

  async function toggleAvailable(id: string, current: boolean) {
    setSaved(null);
    try {
      const r = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAvailable: !current }),
      });
      if (r.ok) {
        setApiListings(prev => prev.map(l => l.id === id ? { ...l, isAvailable: !current } : l));
        setSaved(id);
        setTimeout(() => setSaved(null), 1500);
      }
    } catch {}
  }

  function startEdit(listing: ApiListing) {
    setEditingId(listing.id);
    setEditPrice(String(listing.price));
    setEditTitle(listing.title);
  }

  async function saveEdit(id: string) {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ price: Math.round(price), title: editTitle }),
      });
      if (r.ok) {
        setApiListings(prev => prev.map(l => l.id === id ? { ...l, price: Math.round(price), title: editTitle } : l));
        setSaved(id);
        setTimeout(() => setSaved(null), 1500);
      }
    } catch {}
    setEditingId(null);
    setSaving(false);
  }

  async function addListing() {
    const price = parseFloat(form.price);
    if (!form.title || isNaN(price)) return;
    if (!profile) return;
    setSaving(true);
    try {
      const r = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          medium: form.medium || "Mixed media",
          year: parseInt(form.year) || new Date().getFullYear(),
          dimensions: form.dimensions || null,
          description: form.description || null,
          price: Math.round(price),
          isAvailable: true,
        }),
      });
      if (r.ok) {
        const data = await r.json() as { listing?: ApiListing };
        if (data.listing) setApiListings(prev => [data.listing!, ...prev]);
      }
    } catch {}
    setForm(EMPTY_FORM);
    setAddingNew(false);
    setSaving(false);
  }

  async function deleteNew(id: string) {
    try {
      await fetch(`/api/listings/${id}`, { method: "DELETE", credentials: "include" });
      setApiListings(prev => prev.filter(l => l.id !== id));
    } catch {}
  }

  const totalValue = displayed.filter(l => l.isAvailable && !l.isSold).reduce((s, l) => s + l.price, 0);
  const soldCount = displayed.filter(l => l.isSold || !l.isAvailable).length;
  const availCount = displayed.filter(l => l.isAvailable && !l.isSold).length;


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
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-stone-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading your listings…</span>
          </div>
        )}
        <div className="space-y-2">
          <AnimatePresence>
            {!loading && displayed.map((listing) => {
              const isEditing = editingId === listing.id;
              const isListed = listing.isAvailable && !listing.isSold;
              const justSaved = saved === listing.id;

              return (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`rounded-2xl border ${isListed ? "border-white/8 bg-stone-900/60" : "border-white/5 bg-stone-900/30"} overflow-hidden`}
                >
                  <div className="flex gap-3 p-4">
                    {/* Thumbnail */}
                    <div className={`h-16 w-16 shrink-0 rounded-xl overflow-hidden ${listing.imageUrl ? "" : "bg-stone-800 flex items-center justify-center"}`}>
                      {listing.imageUrl ? (
                        <img src={listing.imageUrl} alt="" className={`h-full w-full object-cover ${!isListed ? "opacity-50 grayscale" : ""}`} />
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
                            <p className={`text-sm font-medium line-clamp-1 ${isListed ? "text-stone-200" : "text-stone-500"}`}>{listing.title}</p>
                            {!isListed && <span className="shrink-0 rounded-full bg-stone-800 px-2 py-0.5 text-[9px] text-stone-500 font-semibold uppercase tracking-wide">{listing.isSold ? "Sold" : "Hidden"}</span>}
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">{(listing.medium ?? "—").split(",")[0]} · {listing.year ?? "—"} · {listing.dimensions ?? "—"}</p>
                          <p className="text-sm font-bold text-amber-300 mt-1">{formatPrice(listing.price)}</p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(listing.id)} disabled={saving} className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded-full hover:bg-white/5 transition-colors">
                            <X size={13} className="text-stone-600" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleAvailable(listing.id, listing.isAvailable)}
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                              isListed
                                ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/15"
                                : "border-white/10 text-stone-500 hover:border-white/20"
                            }`}
                          >
                            {isListed ? <Eye size={9} /> : <EyeOff size={9} />}
                            {isListed ? "Listed" : "Hidden"}
                          </button>
                          <button onClick={() => startEdit(listing)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
                            <Edit2 size={12} className="text-stone-500" />
                          </button>
                          <button onClick={() => deleteNew(listing.id)} className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors">
                            <Trash2 size={12} className="text-stone-700 hover:text-red-400" />
                          </button>
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
