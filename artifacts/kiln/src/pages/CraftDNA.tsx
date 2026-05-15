import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Dna, TrendingUp, RefreshCw, Info, Flame, Eye, Layers, Heart, Sparkles, Users } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";
import { ALL_REELS } from "@/data/reels";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

interface DNADimension {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  score: number;
  description: string;
}

const COMPARE_ARTISTS = [...artists.slice(0, 6), ...seedArtists.slice(0, 6)];

function computeArtistDNA(artistId: string, reelLikes: Record<string, boolean>, reelSaves: Record<string, boolean>, subscriptions: string[]): DNADimension[] {
  const artistReels = ALL_REELS.filter(r => r.artistId === artistId);
  const techniques = new Set(artistReels.map(r => r.technique));
  const techDiversity = Math.min(100, (techniques.size / 8) * 100);

  const totalLikes = artistReels.reduce((s, r) => s + r.likes, 0);
  const avgLikes = artistReels.length ? totalLikes / artistReels.length : 0;
  const engagement = Math.min(100, (avgLikes / 1500) * 100);

  const craftScores = artistReels.map(r => r.craftScore);
  const avgCraft = craftScores.length ? craftScores.reduce((a, b) => a + b, 0) / craftScores.length : 85;
  const consistency = Math.min(100, avgCraft);

  const hasPatronOnly = artistReels.some(r => r.patronOnly);
  const transparency = hasPatronOnly ? 70 : 85;

  const available = artistReels.filter(r => r.available).length;
  const availableRatio = artistReels.length ? (available / artistReels.length) * 100 : 50;

  const isSubscribed = subscriptions.includes(artistId);
  const collectability = Math.min(100, availableRatio + (isSubscribed ? 15 : 0));

  return [
    { key: "technique", label: "Technique Diversity", icon: Layers, color: "#60a5fa", score: Math.round(techDiversity), description: `${techniques.size} distinct technique${techniques.size !== 1 ? "s" : ""} across ${artistReels.length} posts` },
    { key: "engagement", label: "Community Pull", icon: Heart, color: "#f472b6", score: Math.round(engagement), description: `Avg ${Math.round(avgLikes).toLocaleString()} likes per reel` },
    { key: "consistency", label: "Craft Consistency", icon: Flame, color: "#f59e0b", score: Math.round(consistency), description: `Avg craft score of ${Math.round(avgCraft)}/100` },
    { key: "transparency", label: "Process Transparency", icon: Eye, color: "#34d399", score: Math.round(transparency), description: hasPatronOnly ? "Some process content is patron-only" : "Process content fully public" },
    { key: "collectability", label: "Collectability", icon: Sparkles, color: "#a78bfa", score: Math.round(collectability), description: `${available} of ${artistReels.length} pieces available` },
    { key: "community", label: "Community Depth", icon: Users, color: "#fb923c", score: Math.round(Math.min(100, (subscriptions.length * 15) + 40)), description: `Connected to ${subscriptions.length} artists as patron` },
  ];
}

function computeCollectorDNA(reelLikes: Record<string, boolean>, reelSaves: Record<string, boolean>, following: string[]): DNADimension[] {
  const likedIds = Object.keys(reelLikes).filter(id => reelLikes[id]);
  const savedIds = Object.keys(reelSaves).filter(id => reelSaves[id]);
  const likedReels = ALL_REELS.filter(r => likedIds.includes(r.id));
  const savedReels = ALL_REELS.filter(r => savedIds.includes(r.id));

  const allEngaged = [...likedReels, ...savedReels];
  const techniques = new Set(allEngaged.map(r => r.technique));
  const mediumDiversity = Math.min(100, (techniques.size / 6) * 100);

  const avgCraftScore = allEngaged.length ? allEngaged.reduce((s, r) => s + r.craftScore, 0) / allEngaged.length : 80;
  const tasteLevel = Math.min(100, avgCraftScore);

  const curation = Math.min(100, (savedIds.length / Math.max(likedIds.length, 1)) * 100 * 1.5 + 20);
  const exploration = Math.min(100, (following.length / 20) * 100);
  const depth = Math.min(100, ((likedIds.length + savedIds.length * 2) / 30) * 100);
  const patronScore = Math.min(100, following.length * 12 + 30);

  return [
    { key: "diversity", label: "Taste Diversity", icon: Layers, color: "#60a5fa", score: Math.round(mediumDiversity), description: `${techniques.size} technique categories explored` },
    { key: "taste", label: "Craft Discernment", icon: Sparkles, color: "#f59e0b", score: Math.round(tasteLevel), description: `Avg craft score of engaged pieces: ${Math.round(avgCraftScore)}/100` },
    { key: "curation", label: "Curation Ratio", icon: Heart, color: "#f472b6", score: Math.round(curation), description: `${savedIds.length} saved vs ${likedIds.length} liked — selective saves show depth` },
    { key: "exploration", label: "Exploration Drive", icon: Eye, color: "#34d399", score: Math.round(exploration), description: `Following ${following.length} artists` },
    { key: "depth", label: "Collection Depth", icon: Flame, color: "#a78bfa", score: Math.round(depth), description: `${likedIds.length + savedIds.length} total interactions` },
    { key: "community", label: "Artist Connection", icon: Users, color: "#fb923c", score: Math.round(patronScore), description: `Active in community with ${following.length} followed artists` },
  ];
}

function RadarChart({ dimensions, size = 200 }: { dimensions: DNADimension[]; size?: number }) {
  const center = size / 2;
  const radius = size * 0.38;
  const n = dimensions.length;

  const points = dimensions.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  });

  const scoredPoints = dimensions.map((d, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = (d.score / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const gpts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const r = level * radius;
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(" ");
        return <polygon key={level} points={gpts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}
      {points.map((p, i) => (
        <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      <polygon
        points={scoredPoints.map(p => `${p.x},${p.y}`).join(" ")}
        fill="rgba(245,158,11,0.15)"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
      {scoredPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={dimensions[i].color} />
      ))}
      {dimensions.map((d, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const labelR = radius * 1.25;
        const Icon = d.icon;
        const lx = center + labelR * Math.cos(angle);
        const ly = center + labelR * Math.sin(angle);
        return (
          <g key={i}>
            <circle cx={lx} cy={ly} r="9" fill={d.color + "22"} />
            <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={d.color}>
              {d.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CraftDNA() {
  const { reelLikes, reelSaves, following, subscriptions } = useSocial();
  const [mode, setMode] = useState<"artist" | "collector">("artist");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [hoveredDim, setHoveredDim] = useState<DNADimension | null>(null);

  const myArtistDNA = computeArtistDNA("__current_user__", reelLikes, reelSaves, subscriptions);
  const myCollectorDNA = computeCollectorDNA(reelLikes, reelSaves, following);
  const myDNA = mode === "artist" ? myArtistDNA : myCollectorDNA;

  const compareArtist = compareId ? COMPARE_ARTISTS.find(a => a.id === compareId) : null;
  const compareDNA = compareArtist ? computeArtistDNA(compareArtist.id, {}, {}, []) : null;

  const overallScore = Math.round(myDNA.reduce((s, d) => s + d.score, 0) / myDNA.length);

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        <div className="pt-10 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <Dna size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-amber-100">Craft DNA</h1>
          </div>
          <p className="text-xs text-stone-500">Your unique creative signature, generated from your activity</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex rounded-full bg-stone-900 border border-white/8 p-1">
          {(["artist", "collector"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize transition-all ${mode === m ? "bg-amber-500 text-stone-950" : "text-stone-500"}`}>
              {m} Profile
            </button>
          ))}
        </div>

        {/* Radar */}
        <div className="relative mb-6">
          <div className="rounded-3xl bg-stone-900/60 border border-white/8 p-6 flex flex-col items-center">
            <div className="relative">
              <RadarChart dimensions={myDNA} size={220} />
              {compareDNA && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                  <RadarChart dimensions={compareDNA} size={220} />
                </div>
              )}
            </div>
            <div className="text-center mt-2">
              <p className="text-3xl font-black text-amber-400">{overallScore}</p>
              <p className="text-xs text-stone-500">Overall {mode === "artist" ? "Craft" : "Collector"} Score</p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {myDNA.map((d) => (
              <button key={d.key} onMouseEnter={() => setHoveredDim(d)} onMouseLeave={() => setHoveredDim(null)}
                className="rounded-xl bg-stone-900/60 border border-white/8 p-2.5 text-center hover:border-amber-500/20 transition-colors">
                <p className="text-sm font-bold" style={{ color: d.color }}>{d.score}</p>
                <p className="text-[9px] text-stone-500 mt-0.5 leading-tight">{d.label}</p>
              </button>
            ))}
          </div>

          {hoveredDim && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-stone-800/80 border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <hoveredDim.icon size={13} style={{ color: hoveredDim.color }} />
                <span className="text-xs font-semibold text-amber-100">{hoveredDim.label}</span>
                <span className="ml-auto text-sm font-bold" style={{ color: hoveredDim.color }}>{hoveredDim.score}/100</span>
              </div>
              <p className="text-xs text-stone-400">{hoveredDim.description}</p>
            </motion.div>
          )}
        </div>

        {/* Compare section */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Compare with Artist</p>
          <div className="grid grid-cols-3 gap-2">
            {COMPARE_ARTISTS.slice(0, 6).map((a) => (
              <button key={a.id} onClick={() => setCompareId(compareId === a.id ? null : a.id)}
                className={`rounded-xl border p-2 flex flex-col items-center gap-1.5 transition-all ${compareId === a.id ? "border-amber-500/40 bg-amber-500/10" : "border-white/8 bg-stone-900/60"}`}>
                <img src={"avatarUrl" in a ? String(a.avatarUrl) : ""} alt="" className="h-9 w-9 rounded-full object-cover" />
                <span className="text-[9px] text-stone-400 text-center leading-tight line-clamp-2">{a.name}</span>
              </button>
            ))}
          </div>
          {compareArtist && (
            <p className="mt-3 text-[11px] text-stone-500 text-center">Comparing your DNA with <span className="text-amber-300">{compareArtist.name}</span> — faded overlay shown on radar.</p>
          )}
        </div>

        {/* Insight cards */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Your Craft Insights</p>
          {myDNA.sort((a, b) => b.score - a.score).slice(0, 2).map((d) => (
            <div key={d.key} className="rounded-2xl bg-stone-900/60 border border-white/8 p-4 flex items-start gap-3">
              <d.icon size={16} style={{ color: d.color }} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-100">{d.label} is your strength</p>
                <p className="text-xs text-stone-400 mt-0.5">{d.description}</p>
              </div>
              <span className="ml-auto text-sm font-bold shrink-0" style={{ color: d.color }}>{d.score}</span>
            </div>
          ))}
          {myDNA.sort((a, b) => a.score - b.score).slice(0, 1).map((d) => (
            <div key={d.key} className="rounded-2xl bg-stone-900/60 border border-white/8 p-4 flex items-start gap-3">
              <TrendingUp size={16} className="text-stone-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-100">Grow your {d.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{d.description}</p>
              </div>
              <span className="ml-auto text-sm font-bold shrink-0 text-stone-500">{d.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
