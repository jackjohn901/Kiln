import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Radar, Sliders, TrendingUp, Heart, Bookmark, Eye, Sparkles, ChevronRight, RefreshCw, Users } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";
import { ALL_REELS } from "@/data/reels";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { Link } from "wouter";

const TASTE_TWINS = [
  { id: "tw-1", name: "Priya N.", avatarUrl: "https://picsum.photos/seed/priya/60/60", interests: ["Glass", "Experimental"], discovers: "Underground enamel & neon artists", weights: { glass: 88, ceramics: 25, metal: 40, fiber: 20, enamel: 60, experimental: 85, sculptural: 75, functional: 30, traditional: 20, intimate: 65, monumental: 50, colorful: 70 } },
  { id: "tw-2", name: "Kenji W.", avatarUrl: "https://picsum.photos/seed/kenji/60/60", interests: ["Ceramics", "Traditional"], discovers: "Japanese wood-fired revival work", weights: { glass: 30, ceramics: 90, metal: 25, fiber: 35, enamel: 45, experimental: 30, sculptural: 55, functional: 80, traditional: 90, intimate: 70, monumental: 30, colorful: 40 } },
  { id: "tw-3", name: "Amara L.", avatarUrl: "https://picsum.photos/seed/amara/60/60", interests: ["Fiber", "Sculptural"], discovers: "Large-scale textile installations", weights: { glass: 35, ceramics: 45, metal: 30, fiber: 95, enamel: 20, experimental: 75, sculptural: 90, functional: 25, traditional: 35, intimate: 40, monumental: 85, colorful: 80 } },
  { id: "tw-4", name: "Felix R.", avatarUrl: "https://picsum.photos/seed/felix/60/60", interests: ["Metal", "Experimental"], discovers: "Industrial & raw material artists", weights: { glass: 45, ceramics: 30, metal: 92, fiber: 20, enamel: 35, experimental: 88, sculptural: 65, functional: 45, traditional: 15, intimate: 30, monumental: 70, colorful: 25 } },
];

function computeTwinSimilarity(w1: TasteWeights, w2: Record<string, number>): number {
  const keys = Object.keys(w1) as (keyof TasteWeights)[];
  let sumSq = 0;
  keys.forEach(k => {
    const diff = w1[k] - (w2[k] ?? 50);
    sumSq += diff * diff;
  });
  return Math.max(0, Math.round(100 - Math.sqrt(sumSq / keys.length)));
}

const STORAGE_KEY = "kiln_taste_graph_v1";

interface TasteWeights {
  glass: number;
  ceramics: number;
  metal: number;
  fiber: number;
  enamel: number;
  sculptural: number;
  functional: number;
  traditional: number;
  experimental: number;
  intimate: number;
  monumental: number;
  colorful: number;
}

const DEFAULT_WEIGHTS: TasteWeights = {
  glass: 50, ceramics: 50, metal: 50, fiber: 50, enamel: 50,
  sculptural: 50, functional: 50, traditional: 50, experimental: 50,
  intimate: 50, monumental: 50, colorful: 50,
};

const MEDIUM_KEYS: (keyof TasteWeights)[] = ["glass", "ceramics", "metal", "fiber", "enamel"];
const AESTHETIC_KEYS: (keyof TasteWeights)[] = ["sculptural", "functional", "traditional", "experimental", "intimate", "monumental", "colorful"];

const TECHNIQUE_MEDIUM_MAP: Record<string, keyof TasteWeights> = {
  "Glass Blowing": "glass",
  "Flameworking": "glass",
  "Kiln Forming": "glass",
  "Glass Casting": "glass",
  "Murrine": "glass",
  "Neon Glass": "glass",
  "Raku": "ceramics",
  "Porcelain": "ceramics",
  "Ceramics": "ceramics",
  "Wood-Fired": "ceramics",
  "Metal Forging": "metal",
  "Bronze Casting": "metal",
  "Blacksmithing": "metal",
  "Welding": "metal",
  "Enamel": "enamel",
  "Fiber Arts": "fiber",
  "Textile": "fiber",
};

function readWeights(): TasteWeights {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_WEIGHTS, ...JSON.parse(raw) } : DEFAULT_WEIGHTS;
  } catch { return DEFAULT_WEIGHTS; }
}

function saveWeights(w: TasteWeights) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)); } catch {}
}

function computeMatchScore(artistId: string, weights: TasteWeights, reelLikes: Record<string, boolean>, reelSaves: Record<string, boolean>): number {
  const reels = ALL_REELS.filter(r => r.artistId === artistId);
  if (!reels.length) return 50;

  let score = 50;
  const techniques = new Set(reels.map(r => r.technique));
  techniques.forEach(t => {
    const mediumKey = TECHNIQUE_MEDIUM_MAP[t];
    if (mediumKey) score += (weights[mediumKey] - 50) * 0.3;
  });

  const likedReels = reels.filter(r => reelLikes[r.id]);
  const savedReels = reels.filter(r => reelSaves[r.id]);
  score += likedReels.length * 8 + savedReels.length * 12;

  const avgCraft = reels.reduce((s, r) => s + r.craftScore, 0) / reels.length;
  if (avgCraft > 90) score += (weights.experimental - 50) * 0.15;
  if (avgCraft < 85) score += (weights.traditional - 50) * 0.1;

  return Math.min(100, Math.max(5, Math.round(score)));
}

function computeFromActivity(reelLikes: Record<string, boolean>, reelSaves: Record<string, boolean>): Partial<TasteWeights> {
  const engaged = ALL_REELS.filter(r => reelLikes[r.id] || reelSaves[r.id]);
  if (!engaged.length) return {};

  const counts: Partial<Record<keyof TasteWeights, number>> = {};
  engaged.forEach(r => {
    const key = TECHNIQUE_MEDIUM_MAP[r.technique];
    if (key) counts[key] = (counts[key] ?? 0) + (reelSaves[r.id] ? 2 : 1);
  });

  const result: Partial<TasteWeights> = {};
  Object.entries(counts).forEach(([key, count]) => {
    result[key as keyof TasteWeights] = Math.min(95, 40 + count * 10);
  });
  return result;
}

const ALL_ARTISTS = [...artists, ...seedArtists];

function TasteNode({ label, value, color, size }: { label: string; value: number; color: string; size: number }) {
  const opacity = 0.2 + (value / 100) * 0.8;
  const scale = 0.5 + (value / 100) * 0.5;
  return (
    <div className="flex flex-col items-center gap-1" style={{ opacity }}>
      <div className="rounded-full flex items-center justify-center font-bold text-stone-950 transition-all duration-300"
        style={{ width: size * scale, height: size * scale, background: color, fontSize: Math.max(8, size * scale * 0.3) }}>
        {value}
      </div>
      <span className="text-[9px] text-stone-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function TasteGraph() {
  const { reelLikes, reelSaves, following } = useSocial();
  const [weights, setWeights] = useState<TasteWeights>(() => {
    const base = readWeights();
    const computed = computeFromActivity(reelLikes, reelSaves);
    return { ...base, ...computed };
  });
  const [activeSection, setActiveSection] = useState<"graph" | "sliders" | "matches">("graph");
  const [autoComputed, setAutoComputed] = useState(false);
  const weightsRef = useRef(weights);
  useEffect(() => { weightsRef.current = weights; }, [weights]);

  useEffect(() => {
    fetch("/api/me/settings", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const tw = data?.settings?.tasteWeights;
        if (tw && typeof tw === "object") {
          setWeights(prev => ({ ...prev, ...tw }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveWeights(weights);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/me/settings", { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        await fetch("/api/me/settings", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { ...(data.settings ?? {}), tasteWeights: weightsRef.current } }),
        });
      } catch { /* ignore, localStorage already saved */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [weights]);

  function autoCompute() {
    const computed = computeFromActivity(reelLikes, reelSaves);
    setWeights(prev => ({ ...prev, ...computed }));
    setAutoComputed(true);
    setTimeout(() => setAutoComputed(false), 2000);
  }

  const topMatches = ALL_ARTISTS
    .map(a => ({ ...a, match: computeMatchScore(a.id, weights, reelLikes, reelSaves) }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 8);

  const MEDIUM_COLORS: Record<string, string> = {
    glass: "#60a5fa", ceramics: "#c2855e", metal: "#f59e0b", fiber: "#a78bfa", enamel: "#34d399",
  };
  const AESTHETIC_COLORS: Record<string, string> = {
    sculptural: "#f472b6", functional: "#fb923c", traditional: "#86efac", experimental: "#818cf8",
    intimate: "#fda4af", monumental: "#67e8f9", colorful: "#fde047",
  };

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        <div className="pt-10 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Radar size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-amber-100">Taste Graph</h1>
          </div>
          <p className="text-xs text-stone-500">Your transparent taste profile — see exactly why you're matched with artists.</p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-2xl bg-stone-900 border border-white/8 p-1">
          {(["graph", "sliders", "matches"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveSection(tab)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition-all ${activeSection === tab ? "bg-amber-500 text-stone-950" : "text-stone-500"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeSection === "graph" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-stone-500">Bubble size = strength of preference</p>
              <button onClick={autoCompute} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] transition-all ${autoComputed ? "border-emerald-500/30 text-emerald-400" : "border-white/15 text-stone-400"}`}>
                <RefreshCw size={10} className={autoComputed ? "text-emerald-400" : ""} />
                {autoComputed ? "Updated!" : "Auto-compute"}
              </button>
            </div>

            <div className="rounded-3xl bg-stone-900/60 border border-white/8 p-5 mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-4">Medium Preferences</p>
              <div className="flex justify-around items-end h-28">
                {MEDIUM_KEYS.map(k => (
                  <TasteNode key={k} label={k} value={weights[k]} color={MEDIUM_COLORS[k]} size={56} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-stone-900/60 border border-white/8 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-4">Aesthetic Preferences</p>
              <div className="flex flex-wrap justify-around gap-y-4 items-end min-h-28">
                {AESTHETIC_KEYS.map(k => (
                  <TasteNode key={k} label={k} value={weights[k]} color={AESTHETIC_COLORS[k]} size={48} />
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-900/40 border border-white/8 p-3">
              <p className="text-[11px] text-stone-500">Unlike algorithmic feeds, your Taste Graph is fully visible and editable. Adjust the <button onClick={() => setActiveSection("sliders")} className="text-amber-400 underline">sliders</button> to tune your profile, or let Kiln auto-compute from your activity.</p>
            </div>
          </div>
        )}

        {activeSection === "sliders" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Medium Affinity</p>
              <div className="space-y-4">
                {MEDIUM_KEYS.map(k => (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs capitalize text-stone-300">{k}</span>
                      <span className="text-xs font-bold" style={{ color: MEDIUM_COLORS[k] }}>{weights[k]}</span>
                    </div>
                    <input type="range" min="0" max="100" value={weights[k]}
                      onChange={e => setWeights(prev => ({ ...prev, [k]: parseInt(e.target.value) }))}
                      className="w-full accent-amber-500 h-1.5 rounded-full bg-stone-800 appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Aesthetic Sensibility</p>
              <div className="space-y-4">
                {AESTHETIC_KEYS.map(k => (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs capitalize text-stone-300">{k}</span>
                      <span className="text-xs font-bold" style={{ color: AESTHETIC_COLORS[k] }}>{weights[k]}</span>
                    </div>
                    <input type="range" min="0" max="100" value={weights[k]}
                      onChange={e => setWeights(prev => ({ ...prev, [k]: parseInt(e.target.value) }))}
                      className="w-full accent-amber-500 h-1.5 rounded-full bg-stone-800 appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setWeights(DEFAULT_WEIGHTS)} className="w-full rounded-full border border-white/10 py-3 text-xs text-stone-500 hover:text-stone-300 transition-colors">
              Reset to defaults
            </button>
          </div>
        )}

        {activeSection === "matches" && (
          <div>
            <p className="text-xs text-stone-500 mb-4">Artists ranked by how closely they match your Taste Graph. Adjust sliders to see rankings change in real-time.</p>
            <div className="space-y-2.5">
              {topMatches.map((artist, i) => {
                const avatarUrl = "avatarUrl" in artist ? String(artist.avatarUrl) : "https://picsum.photos/seed/" + artist.id + "/60/60";
                const matchColor = artist.match >= 80 ? "text-emerald-400" : artist.match >= 60 ? "text-amber-400" : "text-stone-400";
                return (
                  <Link key={artist.id} href={`/artists/${artist.id}`}>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/60 p-3 hover:border-amber-500/20 transition-colors cursor-pointer">
                      <span className="text-[10px] font-black text-stone-600 w-4 shrink-0">#{i + 1}</span>
                      <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-100 truncate">{artist.name}</p>
                        <p className="text-xs text-stone-500 truncate">{artist.medium}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${matchColor}`}>{artist.match}%</p>
                        <p className="text-[9px] text-stone-600">match</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-4 text-center text-[10px] text-stone-600">Match % is calculated transparently from your Taste Graph sliders + engagement history. No hidden signals.</p>

            {/* Taste Twins */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-2">
                <Users size={13} className="text-amber-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Taste Twins</p>
              </div>
              <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">People with nearly identical Taste Graphs — see what they're discovering that you haven't found yet.</p>
              <div className="space-y-2.5">
                {TASTE_TWINS.map(twin => {
                  const sim = computeTwinSimilarity(weights, twin.weights);
                  const simColor = sim >= 75 ? "text-emerald-400" : sim >= 60 ? "text-amber-400" : "text-stone-400";
                  return (
                    <div key={twin.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/60 p-3">
                      <img src={twin.avatarUrl} alt={twin.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-100">{twin.name}</p>
                        <p className="text-[10px] text-stone-500">Into: {twin.interests.join(", ")}</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">Discovering: {twin.discovers}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${simColor}`}>{sim}%</p>
                        <p className="text-[9px] text-stone-600">twin match</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
