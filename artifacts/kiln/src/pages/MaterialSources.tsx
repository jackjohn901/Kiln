import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, MapPin, Trash2, X, Leaf, Package, Flame, Globe } from "lucide-react";
import Nav from "@/components/Nav";

interface MaterialSource {
  id: string;
  name: string;
  materialType: string | null;
  sourceLocation: string | null;
  sourceDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

const MATERIAL_TYPES = [
  "Clay", "Glaze mineral", "Colorant", "Fiber", "Wood", "Metal",
  "Glass", "Resin", "Dye", "Stone", "Other",
];

function typeIcon(t: string | null) {
  if (!t) return <Package size={13} className="text-stone-500" />;
  if (["Clay", "Stone"].includes(t)) return <Globe size={13} className="text-amber-400" />;
  if (["Wood", "Fiber"].includes(t)) return <Leaf size={13} className="text-emerald-400" />;
  if (["Metal", "Glass"].includes(t)) return <Flame size={13} className="text-sky-400" />;
  return <Package size={13} className="text-stone-400" />;
}

export default function MaterialSources() {
  const [sources, setSources] = useState<MaterialSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", materialType: "", sourceLocation: "", sourceDescription: "",
    latitude: "", longitude: "",
  });

  useEffect(() => {
    fetch("/api/me/material-sources", { credentials: "include" })
      .then((r) => r.ok ? r.json() as Promise<{ sources: MaterialSource[] }> : null)
      .then((data) => { if (data) setSources(data.sources); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addSource() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/material-sources", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          materialType: form.materialType || undefined,
          sourceLocation: form.sourceLocation || undefined,
          sourceDescription: form.sourceDescription || undefined,
          latitude: form.latitude ? parseFloat(form.latitude) : undefined,
          longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        }),
      });
      if (res.ok) {
        const source = await res.json() as MaterialSource;
        setSources((prev) => [source, ...prev]);
        setForm({ name: "", materialType: "", sourceLocation: "", sourceDescription: "", latitude: "", longitude: "" });
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/me/material-sources/${id}`, { method: "DELETE", credentials: "include" });
  }

  const byType = sources.reduce<Record<string, MaterialSource[]>>((acc, s) => {
    const key = s.materialType ?? "Other";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/creator-home">
              <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
                <ChevronLeft size={16} />
              </button>
            </Link>
            <div>
              <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
                <Leaf size={20} className="text-emerald-500" />
                Material Sources
              </h1>
              <p className="text-xs text-stone-500">Your ingredient map — from earth to finished work</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Plus size={12} /> Add source
          </button>
        </div>

        {/* Ingredient story banner */}
        {sources.length > 0 && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold text-emerald-400 mb-1">Your ingredient story</p>
            <p className="text-xs text-stone-400 leading-relaxed">
              {sources.map((s) => s.name).slice(0, 4).join(", ")}
              {sources.length > 4 ? ` +${sources.length - 4} more` : ""} — sourced from{" "}
              {[...new Set(sources.map((s) => s.sourceLocation).filter(Boolean))].slice(0, 3).join(", ") || "around the world"}.
              Automatically shown on your listing pages.
            </p>
          </div>
        )}

        {loading && (
          <div className="py-16 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
          </div>
        )}

        {!loading && sources.length === 0 && (
          <div className="py-16 text-center">
            <Leaf size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 font-medium">No materials logged yet</p>
            <p className="text-stone-600 text-sm mt-1 max-w-xs mx-auto">
              Add your clays, glazes, fibers, and pigments to build a sourcing map that appears on your listings.
            </p>
          </div>
        )}

        {/* Grouped by type */}
        <div className="space-y-5">
          {Object.entries(byType).map(([type, items]) => (
            <div key={type}>
              <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                {typeIcon(type)} {type}
              </h2>
              <div className="space-y-2">
                {items.map((source) => (
                  <motion.div
                    key={source.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/8 bg-stone-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-amber-100 text-sm">{source.name}</p>
                        {source.sourceLocation && (
                          <p className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                            <MapPin size={10} /> {source.sourceLocation}
                          </p>
                        )}
                        {source.sourceDescription && (
                          <p className="text-xs text-stone-500 mt-1 italic line-clamp-2">"{source.sourceDescription}"</p>
                        )}
                        {(source.latitude && source.longitude) && (
                          <a
                            href={`https://www.google.com/maps?q=${source.latitude},${source.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400 hover:text-emerald-300"
                          >
                            <MapPin size={9} /> View on map
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-600 hover:text-red-400 hover:border-red-500/30 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add source sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/70"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-amber-100">Add a Material Source</h2>
                <button onClick={() => setShowForm(false)} className="rounded-full bg-stone-800 p-2 text-stone-400">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Material name * (e.g. Georgia kaolin, Ohata iron red)"
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                />
                <select
                  value={form.materialType}
                  onChange={(e) => setForm((f) => ({ ...f, materialType: e.target.value }))}
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-stone-300 focus:outline-none focus:border-amber-500/40"
                >
                  <option value="">Type (optional)</option>
                  {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input
                  value={form.sourceLocation} onChange={(e) => setForm((f) => ({ ...f, sourceLocation: e.target.value }))}
                  placeholder="Source location (e.g. Kaolin County, Georgia)"
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                />
                <textarea
                  value={form.sourceDescription} onChange={(e) => setForm((f) => ({ ...f, sourceDescription: e.target.value }))}
                  placeholder="Story behind this material (optional)"
                  rows={2}
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                    placeholder="Latitude (optional)"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                  />
                  <input
                    value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                    placeholder="Longitude"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button
                  onClick={addSource}
                  disabled={saving || !form.name.trim()}
                  className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add Source"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
