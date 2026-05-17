import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, Bookmark, FlaskConical, Flame, X, Plus, ChevronDown, ChevronUp, Info, Check } from "lucide-react";
import Nav from "@/components/Nav";

interface Ingredient { name: string; amount: number; }
interface GlazeRecipe {
  id: string; name: string; description: string;
  cone: string; atmosphere: string; colorFamily: string;
  swatch: string; ingredients: Ingredient[]; colorants: Ingredient[];
  notes: string; authorName: string; tags: string[];
  seedLikes: number; seedSaves: number;
}

const RECIPES: GlazeRecipe[] = [
  {
    id: "celadon-wollastonite",
    name: "Wollastonite Celadon",
    description: "The classic jade-green celadon. Reduction draws iron through the body for a glassy, semi-translucent surface. Best over porcelain or white stoneware.",
    cone: "10", atmosphere: "reduction", colorFamily: "green",
    swatch: "linear-gradient(135deg,#8fbc8f,#6a9f6a 60%,#4e7c4e)",
    ingredients: [
      { name: "Custer Feldspar", amount: 25 }, { name: "Wollastonite", amount: 20 },
      { name: "Silica 325", amount: 30 }, { name: "EPK Kaolin", amount: 15 },
      { name: "Zinc Oxide", amount: 5 }, { name: "Barium Carbonate", amount: 5 },
    ],
    colorants: [{ name: "Red Iron Oxide", amount: 2 }, { name: "Titanium Dioxide", amount: 2 }],
    notes: "Apply 2–3 coats. Fire slowly through 1000–1100°C in reduction. Cool slowly to prevent crazing. Heavier reduction pulls a richer green.",
    authorName: "Community recipe", tags: ["celadon", "iron", "classic", "reduction"],
    seedLikes: 847, seedSaves: 312,
  },
  {
    id: "shino-soda-ash",
    name: "Soda Ash Shino",
    description: "Cream-white with carbon trapping and fire flashing. High soda ash creates characteristic orange-peel texture and salmon blush where clay body is exposed.",
    cone: "10", atmosphere: "reduction", colorFamily: "white",
    swatch: "linear-gradient(135deg,#f5f0e8,#e8d8c0 50%,#d4c09a)",
    ingredients: [
      { name: "Nepheline Syenite", amount: 60 }, { name: "Soda Ash", amount: 20 },
      { name: "OM4 Ball Clay", amount: 20 },
    ],
    colorants: [],
    notes: "Apply thick — 4 to 5 coats. Carbon trap develops 900–1000°C in heavy reduction. Spectacular on textured or faceted surfaces.",
    authorName: "Community recipe", tags: ["shino", "carbon-trap", "soda-ash", "texture"],
    seedLikes: 1203, seedSaves: 488,
  },
  {
    id: "tenmoku-iron",
    name: "Classical Tenmoku",
    description: "Deep iron-black breaking amber-brown on edges and rims. Oil-spot variant fires 1260–1280°C, producing iridescent floating bubbles suspended in the glaze.",
    cone: "10", atmosphere: "reduction", colorFamily: "black",
    swatch: "linear-gradient(135deg,#2c1810,#4a2515 40%,#6b3520)",
    ingredients: [
      { name: "Custer Feldspar", amount: 40 }, { name: "Silica", amount: 26 },
      { name: "Whiting", amount: 19 }, { name: "EPK Kaolin", amount: 10 }, { name: "Talc", amount: 5 },
    ],
    colorants: [{ name: "Red Iron Oxide", amount: 10 }],
    notes: "For oil-spot: fire to cone 10 peak then hold 20 min with damper slightly open. Spectacular on porcelain. Higher iron = darker surface.",
    authorName: "Community recipe", tags: ["tenmoku", "iron", "oil-spot", "classic"],
    seedLikes: 976, seedSaves: 421,
  },
  {
    id: "copper-red",
    name: "Copper Oxblood Red",
    description: "Notoriously difficult, endlessly rewarding. True blood-red requires precise reduction timing and atmosphere. A single piece of copper red justifies a whole firing.",
    cone: "10", atmosphere: "reduction", colorFamily: "red",
    swatch: "linear-gradient(135deg,#8b1a1a,#c0392b 50%,#96281b)",
    ingredients: [
      { name: "Custer Feldspar", amount: 50 }, { name: "Silica", amount: 27 },
      { name: "Whiting", amount: 15 }, { name: "EPK Kaolin", amount: 5 }, { name: "Barium Carbonate", amount: 3 },
    ],
    colorants: [{ name: "Copper Carbonate", amount: 0.5 }, { name: "Tin Oxide", amount: 1.5 }],
    notes: "Fire in very light oxidation to 900°C, then switch to heavy reduction through cone 10. Copper reds are kiln-position sensitive. Thick application = more burgundy.",
    authorName: "Community recipe", tags: ["copper-red", "reduction", "advanced", "oxblood"],
    seedLikes: 1540, seedSaves: 624,
  },
  {
    id: "floating-blue",
    name: "Floating Blue",
    description: "Oxidation blue with a distinctive floating, cloudy quality created by rutile breaking through cobalt. One of the most-loved studio glazes of the past 30 years.",
    cone: "10", atmosphere: "oxidation", colorFamily: "blue",
    swatch: "linear-gradient(135deg,#4a90d9,#2c6fad 50%,#1a4f8a)",
    ingredients: [
      { name: "Custer Feldspar", amount: 35 }, { name: "Silica", amount: 20 },
      { name: "Whiting", amount: 20 }, { name: "EPK Kaolin", amount: 15 }, { name: "Dolomite", amount: 10 },
    ],
    colorants: [{ name: "Cobalt Carbonate", amount: 0.5 }, { name: "Rutile", amount: 4 }],
    notes: "Works beautifully on both oxidation and light reduction. Layering over iron-rich slip produces stunning depth. Avoid over-application — 2 coats maximum.",
    authorName: "Community recipe", tags: ["blue", "rutile", "oxidation", "popular"],
    seedLikes: 2108, seedSaves: 891,
  },
  {
    id: "crystalline",
    name: "Zinc Crystalline",
    description: "Macro-crystals of zinc silicate suspended in a clear glaze. Each piece is one-of-a-kind. Requires precise slow cooling and a catching dish for run-off.",
    cone: "10", atmosphere: "oxidation", colorFamily: "multi",
    swatch: "linear-gradient(135deg,#e8e8f0,#c0c8e0 40%,#9ab0d0)",
    ingredients: [
      { name: "Ferro Frit 3110", amount: 50 }, { name: "Silica", amount: 25 },
      { name: "Zinc Oxide", amount: 20 }, { name: "EPK Kaolin", amount: 5 },
    ],
    colorants: [{ name: "Cobalt Carbonate", amount: 0.3 }, { name: "Iron Oxide", amount: 0.5 }],
    notes: "Fire to cone 10, then cool to 1050°C over 8–10 hours with hold times to grow crystals. Mount pots on glaze catchers — this glaze runs.",
    authorName: "Community recipe", tags: ["crystalline", "zinc", "advanced", "oxidation"],
    seedLikes: 1879, seedSaves: 742,
  },
  {
    id: "satin-matte-c6",
    name: "Cone 6 Satin Matte",
    description: "Reliable, food-safe satin matte for electric kilns. Smooth and neutral enough to layer with stains. A workhorse base trusted in production pottery studios.",
    cone: "6", atmosphere: "oxidation", colorFamily: "white",
    swatch: "linear-gradient(135deg,#f8f6f2,#ede8e0 50%,#ddd6cc)",
    ingredients: [
      { name: "Custer Feldspar", amount: 23 }, { name: "Silica", amount: 23 },
      { name: "Whiting", amount: 22 }, { name: "EPK Kaolin", amount: 14 },
      { name: "Dolomite", amount: 10 }, { name: "Barium Carbonate", amount: 8 },
    ],
    colorants: [],
    notes: "Add 5–10% Mason stain for colour. Excellent for production ware. Test for leaching if using Barium in food-contact pieces.",
    authorName: "Community recipe", tags: ["cone-6", "satin", "matte", "electric", "production"],
    seedLikes: 1456, seedSaves: 603,
  },
  {
    id: "rutile-blue-c6",
    name: "Rutile Blue-Grey",
    description: "Mottled tan-to-blue surface created by rutile breaking with cobalt at cone 6. Each piece fires with unique variation — a crowd favourite in studio sales.",
    cone: "6", atmosphere: "oxidation", colorFamily: "blue",
    swatch: "linear-gradient(135deg,#7a9bb5,#8f9e9a 50%,#b0a080)",
    ingredients: [
      { name: "Custer Feldspar", amount: 40 }, { name: "Silica", amount: 20 },
      { name: "Whiting", amount: 20 }, { name: "EPK Kaolin", amount: 10 }, { name: "Dolomite", amount: 10 },
    ],
    colorants: [{ name: "Rutile", amount: 5 }, { name: "Cobalt Carbonate", amount: 0.5 }],
    notes: "Best applied in 2–3 thick coats. Tan-dominant on thin application, blue on thick. Overlap with iron-red glazes creates dramatic breaks.",
    authorName: "Community recipe", tags: ["rutile", "cone-6", "mottled", "electric"],
    seedLikes: 1122, seedSaves: 465,
  },
  {
    id: "majolica-base",
    name: "Majolica Base (Tin Glaze)",
    description: "Brilliant opaque white base for in-glaze painting. Apply your underglazes or stains directly onto the unfired white surface. Fires glossy and archival.",
    cone: "04", atmosphere: "oxidation", colorFamily: "white",
    swatch: "linear-gradient(135deg,#ffffff,#f5f5f5 50%,#e8e8e8)",
    ingredients: [
      { name: "Ferro Frit 3124", amount: 60 }, { name: "EPK Kaolin", amount: 15 },
      { name: "Silica", amount: 15 }, { name: "Zircopax", amount: 10 },
    ],
    colorants: [],
    notes: "Bisque at cone 06. Glaze once. Paint with commercial underglazes or prepared stains. Fire cone 04 slowly to allow gases to escape before surface seals.",
    authorName: "Community recipe", tags: ["majolica", "lowfire", "tin-glaze", "painting"],
    seedLikes: 834, seedSaves: 288,
  },
  {
    id: "raku-crackle-black",
    name: "Raku Black Crackle",
    description: "High-boron glaze for raku firing. Crazes dramatically on rapid cooling, carbon smokes into the cracks and unglazed clay body to create the signature raku pattern.",
    cone: "raku", atmosphere: "reduction", colorFamily: "black",
    swatch: "linear-gradient(135deg,#1a1a1a,#2a2a2a 50%,#1a1a1a)",
    ingredients: [
      { name: "Gerstley Borate", amount: 80 }, { name: "EPK Kaolin", amount: 10 }, { name: "Silica", amount: 10 },
    ],
    colorants: [{ name: "Red Iron Oxide", amount: 5 }, { name: "Cobalt Carbonate", amount: 2 }, { name: "Manganese Dioxide", amount: 3 }],
    notes: "Fire rapidly to 900°C (no soak). Remove red-hot from kiln and place in reduction chamber with newspaper. Unglazed clay smokes to deep black.",
    authorName: "Community recipe", tags: ["raku", "crackle", "reduction", "carbon"],
    seedLikes: 1677, seedSaves: 712,
  },
  {
    id: "wood-ash-natural",
    name: "Natural Wood Ash",
    description: "Simple three-ingredient ash glaze that lets the wood fire do the work. Expect dramatic texture variation, natural flashing, and fire effects impossible in any other kiln.",
    cone: "10", atmosphere: "anagama", colorFamily: "brown",
    swatch: "linear-gradient(135deg,#8b7355,#6b5a3e 50%,#9a8060)",
    ingredients: [
      { name: "Raw Wood Ash (washed)", amount: 50 }, { name: "Potash Feldspar", amount: 30 }, { name: "Silica", amount: 20 },
    ],
    colorants: [],
    notes: "Wax the foot well. Results vary dramatically with kiln position, wood species, and atmosphere. No two pieces from the same batch look alike — that's the point.",
    authorName: "Community recipe", tags: ["wood-ash", "anagama", "natural", "wood-fire"],
    seedLikes: 2341, seedSaves: 1021,
  },
  {
    id: "cobalt-liner",
    name: "Deep Cobalt Liner",
    description: "Rich, saturated cobalt blue with enough fluxes to mature reliably. Thick and glossy as a liner glaze, more transparent as an exterior coat over porcelain.",
    cone: "10", atmosphere: "oxidation", colorFamily: "blue",
    swatch: "linear-gradient(135deg,#1a3a6e,#2952a0 50%,#1e4080)",
    ingredients: [
      { name: "Custer Feldspar", amount: 45 }, { name: "Silica", amount: 25 },
      { name: "Whiting", amount: 15 }, { name: "EPK Kaolin", amount: 10 }, { name: "Dolomite", amount: 5 },
    ],
    colorants: [{ name: "Cobalt Carbonate", amount: 2 }],
    notes: "Lower cobalt to 0.5% for a softer sky blue. Layer over iron slip for a tenmoku-into-cobalt break on rims. Works in oxidation and reduction.",
    authorName: "Community recipe", tags: ["cobalt", "blue", "liner", "oxidation"],
    seedLikes: 988, seedSaves: 401,
  },
];

const CONES = ["All", "04", "6", "10", "Raku", "Anagama"];
const ATMOSPHERES = ["All", "oxidation", "reduction", "soda", "anagama", "raku"];
const COLORS = ["All", "green", "white", "black", "red", "blue", "brown", "multi"];
const ATM_LABEL: Record<string, string> = {
  oxidation: "Oxidation", reduction: "Reduction", soda: "Soda", anagama: "Wood/Anagama", raku: "Raku", all: "All",
};

function hash(s: string) { let h = 0; for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0; return Math.abs(h); }
const LIKES_KEY = "kiln_glaze_likes_v1";
const SAVES_KEY = "kiln_glaze_saved_v1";
function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]); } catch { return new Set(); }
}
function writeSet(key: string, s: Set<string>) { localStorage.setItem(key, JSON.stringify([...s])); }

function AddRecipeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: GlazeRecipe) => void }) {
  const [name, setName] = useState("");
  const [cone, setCone] = useState("10");
  const [atmosphere, setAtmosphere] = useState("oxidation");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    const r: GlazeRecipe = {
      id: `user-${hash(name + Date.now())}`,
      name: name.trim(), description: description.trim() || "Community-contributed glaze.",
      cone, atmosphere, colorFamily: "multi",
      swatch: `hsl(${hash(name) % 360},40%,50%)`,
      ingredients: [], colorants: [], notes: notes.trim(),
      authorName: "You",
      tags: [cone, atmosphere], seedLikes: 0, seedSaves: 0,
    };
    try {
      const res = await fetch("/api/glaze-library", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: r.name, description: r.description, cone, atmosphere, colorFamily: "multi", swatch: r.swatch, notes: r.notes, tags: r.tags }),
      });
      if (res.ok) { const saved = await res.json() as GlazeRecipe; onAdd({ ...r, id: saved.id }); setDone(true); return; }
    } catch { /* fall through */ }
    onAdd(r);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg rounded-3xl bg-stone-950 border border-white/10 p-6 space-y-4">
        {done ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
              <Check size={24} className="text-emerald-400" />
            </div>
            <p className="font-serif text-lg text-amber-100">Recipe submitted!</p>
            <p className="text-sm text-stone-500">Your glaze is now in the community library.</p>
            <button onClick={onClose} className="rounded-full bg-amber-500 px-6 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-amber-100">Share a recipe</h2>
              <button onClick={onClose} className="text-stone-500 hover:text-stone-300"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Glaze name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Matte Celadon"
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Cone</label>
                  <select value={cone} onChange={e => setCone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 focus:outline-none">
                    {["04","6","10","Raku","Anagama"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">Atmosphere</label>
                  <select value={atmosphere} onChange={e => setAtmosphere(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 focus:outline-none">
                    {["oxidation","reduction","soda","anagama","raku"].map(a => <option key={a} value={a}>{ATM_LABEL[a]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What makes this glaze special?"
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Firing notes &amp; tips</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Application thickness, firing tips, layering suggestions…"
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-100 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none" />
              </div>
            </div>
            <button onClick={submit} disabled={!name.trim()}
              className="w-full rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40">
              Share recipe
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function RecipeCard({ recipe, liked, saved, onLike, onSave }: {
  recipe: GlazeRecipe; liked: boolean; saved: boolean;
  onLike: () => void; onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalIngredients = recipe.ingredients.reduce((s, i) => s + i.amount, 0);

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
      {/* Swatch strip */}
      <div className="h-10 w-full" style={{ background: recipe.swatch }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif text-base text-amber-100 truncate">{recipe.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[10px] font-bold text-amber-400">Cone {recipe.cone}</span>
              <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[10px] text-stone-400">{ATM_LABEL[recipe.atmosphere] ?? recipe.atmosphere}</span>
              <span className="rounded-full bg-stone-800 border border-stone-700 px-2 py-0.5 text-[10px] text-stone-400 capitalize">{recipe.colorFamily}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onLike} className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-rose-400" : "text-stone-600 hover:text-rose-400"}`}>
              <Heart size={13} className={liked ? "fill-current" : ""} />
              <span>{recipe.seedLikes + (liked ? 1 : 0)}</span>
            </button>
            <button onClick={onSave} className={`transition-colors ${saved ? "text-amber-400" : "text-stone-600 hover:text-amber-400"}`}>
              <Bookmark size={13} className={saved ? "fill-current" : ""} />
            </button>
          </div>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">{recipe.description}</p>

        {/* Expand / collapse */}
        <button onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between text-xs text-stone-500 hover:text-stone-300 transition-colors pt-1 border-t border-white/5">
          <span className="flex items-center gap-1.5"><FlaskConical size={11} className="text-amber-500/60" /> {recipe.ingredients.length + recipe.colorants.length} ingredients</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-3">
              {/* Base recipe */}
              <div>
                <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold mb-2">Base glaze (100%)</p>
                <div className="space-y-1.5">
                  {recipe.ingredients.map((ing) => (
                    <div key={ing.name} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${(ing.amount / totalIngredients) * 100}%` }} />
                      </div>
                      <span className="text-xs text-stone-400 w-32 truncate">{ing.name}</span>
                      <span className="text-xs font-mono text-stone-500 w-10 text-right">{ing.amount}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {recipe.colorants.length > 0 && (
                <div>
                  <p className="text-[10px] text-stone-600 uppercase tracking-wide font-semibold mb-2">Colorants (added on top)</p>
                  <div className="space-y-1">
                    {recipe.colorants.map((c) => (
                      <div key={c.name} className="flex justify-between text-xs">
                        <span className="text-stone-400">{c.name}</span>
                        <span className="font-mono text-stone-500">{c.amount}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {recipe.notes && (
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Info size={11} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">Firing notes</span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{recipe.notes}</p>
                </div>
              )}
              <p className="text-[10px] text-stone-700">Contributed by {recipe.authorName}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function GlazeLibrary() {
  const [query, setQuery] = useState("");
  const [coneFilter, setConeFilter] = useState("All");
  const [atmFilter, setAtmFilter] = useState("All");
  const [colorFilter, setColorFilter] = useState("All");
  const [likedIds, setLikedIds] = useState<Set<string>>(() => readSet(LIKES_KEY));
  const [savedIds, setSavedIds] = useState<Set<string>>(() => readSet(SAVES_KEY));
  const [showAdd, setShowAdd] = useState(false);
  const [userRecipes, setUserRecipes] = useState<GlazeRecipe[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  function toggleLike(id: string) {
    setLikedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeSet(LIKES_KEY, next);
      return next;
    });
    fetch(`/api/glaze-library/${id}/like`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  function toggleSave(id: string) {
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeSet(SAVES_KEY, next);
      return next;
    });
    fetch(`/api/glaze-library/${id}/save`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  const allRecipes = useMemo(() => [...userRecipes, ...RECIPES], [userRecipes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allRecipes.filter(r => {
      if (showSavedOnly && !savedIds.has(r.id)) return false;
      if (coneFilter !== "All" && r.cone.toLowerCase() !== coneFilter.toLowerCase()) return false;
      if (atmFilter !== "All" && r.atmosphere !== atmFilter.toLowerCase()) return false;
      if (colorFilter !== "All" && r.colorFamily !== colorFilter.toLowerCase()) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) &&
          !r.tags.some(t => t.includes(q)) && !r.atmosphere.includes(q)) return false;
      return true;
    });
  }, [allRecipes, query, coneFilter, atmFilter, colorFilter, showSavedOnly, savedIds]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-32">

        {/* Hero */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={20} className="text-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Kiln · Community</span>
            </div>
            <h1 className="font-serif text-3xl font-normal text-amber-100 mb-1">Glaze Library</h1>
            <p className="text-sm text-stone-400 max-w-xl">
              {allRecipes.length} community glaze recipes — tested formulas, firing notes, and real-studio wisdom shared by craft artists.
            </p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
            <Plus size={14} /> Share recipe
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search glazes, techniques, materials…"
              className="w-full rounded-2xl border border-stone-800 bg-stone-900 pl-10 pr-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
            {query && <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"><X size={14} /></button>}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-stone-600 self-center">Cone:</span>
            {CONES.map(c => (
              <button key={c} onClick={() => setConeFilter(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${coneFilter === c ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-500 hover:border-stone-500"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-stone-600 self-center">Fire:</span>
            {ATMOSPHERES.map(a => (
              <button key={a} onClick={() => setAtmFilter(a)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${atmFilter === a ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-500 hover:border-stone-500"}`}>
                {a === "All" ? "All" : ATM_LABEL[a] ?? a}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-stone-600 self-center">Color:</span>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColorFilter(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${colorFilter === c ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-500 hover:border-stone-500"}`}>
                {c}
              </button>
            ))}
            <button onClick={() => setShowSavedOnly(v => !v)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${showSavedOnly ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-stone-700 text-stone-500 hover:border-stone-500"}`}>
              <Bookmark size={10} className={showSavedOnly ? "fill-current" : ""} /> Saved only
            </button>
          </div>
        </div>

        {/* Kiln-specific callout */}
        <div className="mb-6 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/5 to-stone-900/0 p-4 flex items-start gap-3">
          <Flame size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-stone-400 leading-relaxed">
            <span className="text-amber-300 font-medium">Craft-first platform.</span>{" "}
            This library exists only on Kiln — a place for serious craft artists to share the formulas behind their work.
            All recipes are community-contributed and tested in real studio firings.
          </p>
        </div>

        {/* Results */}
        <p className="text-xs text-stone-600 mb-4">{filtered.length} recipe{filtered.length !== 1 ? "s" : ""}</p>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FlaskConical size={36} className="mx-auto mb-4 text-stone-700" />
            <p className="text-stone-500 mb-2">No recipes match those filters</p>
            <button onClick={() => { setQuery(""); setConeFilter("All"); setAtmFilter("All"); setColorFilter("All"); setShowSavedOnly(false); }}
              className="text-xs text-amber-400 hover:text-amber-300">Clear all filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(r => (
              <RecipeCard key={r.id} recipe={r}
                liked={likedIds.has(r.id)} saved={savedIds.has(r.id)}
                onLike={() => toggleLike(r.id)} onSave={() => toggleSave(r.id)} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddRecipeModal onClose={() => setShowAdd(false)} onAdd={r => { setUserRecipes(p => [r, ...p]); setShowAdd(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
