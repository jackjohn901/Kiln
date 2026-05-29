import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, ZoomIn, ArrowRight, X, ChevronRight, Flame, Layers } from "lucide-react";
import { Link } from "wouter";
import { TECHNIQUE_NODES, TECHNIQUE_EDGES, MEDIUM_COLORS, type TechniqueGraphNode } from "@/data/techniqueGraph";

const RELATIONSHIP_LABELS: Record<string, string> = {
  "evolved-from": "evolved from",
  "shares-materials": "shares materials with",
  "shares-tools": "shares tools with",
  "cultural-exchange": "developed via cultural exchange with",
  "parallel-development": "developed in parallel with",
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  "evolved-from": "#f59e0b",
  "shares-materials": "#60a5fa",
  "shares-tools": "#34d399",
  "cultural-exchange": "#a78bfa",
  "parallel-development": "#f472b6",
};

function getConnectedNodes(nodeId: string): { node: TechniqueGraphNode; edge: typeof TECHNIQUE_EDGES[0]; direction: "from" | "to" }[] {
  const result: { node: TechniqueGraphNode; edge: typeof TECHNIQUE_EDGES[0]; direction: "from" | "to" }[] = [];
  TECHNIQUE_EDGES.forEach(edge => {
    if (edge.from === nodeId) {
      const n = TECHNIQUE_NODES.find(n => n.id === edge.to);
      if (n) result.push({ node: n, edge, direction: "to" });
    }
    if (edge.to === nodeId) {
      const n = TECHNIQUE_NODES.find(n => n.id === edge.from);
      if (n) result.push({ node: n, edge, direction: "from" });
    }
  });
  return result;
}

function MediumBadge({ medium }: { medium: string }) {
  const color = MEDIUM_COLORS[medium] ?? "#888";
  return (
    <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold" style={{ color, borderColor: color + "40", background: color + "15" }}>
      {medium}
    </span>
  );
}

function NodeBubble({ node, onSelect, isSelected }: { node: TechniqueGraphNode; onSelect: () => void; isSelected: boolean }) {
  const color = MEDIUM_COLORS[node.medium] ?? "#888";
  return (
    <button onClick={onSelect}
      className="absolute flex flex-col items-center transition-all duration-200 hover:scale-110 active:scale-95"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="rounded-full border-2 flex items-center justify-center text-center transition-all shadow-lg"
        style={{
          width: isSelected ? 64 : 48,
          height: isSelected ? 64 : 48,
          borderColor: isSelected ? color : color + "60",
          background: isSelected ? color + "30" : color + "15",
          boxShadow: isSelected ? `0 0 16px ${color}50` : "none",
        }}>
        <span className="text-[8px] font-bold leading-tight px-1 text-center" style={{ color }}>
          {node.name.split(" ").slice(0, 2).join("\n")}
        </span>
      </div>
    </button>
  );
}

export default function TechniqueGenetics() {
  const [selected, setSelected] = useState<TechniqueGraphNode | null>(null);
  const [filterMedium, setFilterMedium] = useState<string | null>(null);
  const [highlightRelType, setHighlightRelType] = useState<string | null>(null);

  const mediums = Array.from(new Set(TECHNIQUE_NODES.map(n => n.medium)));
  const visibleNodes = filterMedium ? TECHNIQUE_NODES.filter(n => n.medium === filterMedium) : TECHNIQUE_NODES;
  const connectedNodes = selected ? getConnectedNodes(selected.id) : [];

  const visibleEdges = TECHNIQUE_EDGES.filter(e => {
    const fromVisible = visibleNodes.some(n => n.id === e.from);
    const toVisible = visibleNodes.some(n => n.id === e.to);
    return fromVisible && toVisible;
  });

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        <div className="pt-10 pb-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Dna size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-amber-100">Technique Genetics</h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Curated reference</span>
          </div>
          <p className="text-xs text-stone-500">A curated family tree of craft — a hand-built reference for how techniques relate to one another.</p>
        </div>

        {/* Medium filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button onClick={() => setFilterMedium(null)} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors ${!filterMedium ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500"}`}>
            All ({TECHNIQUE_NODES.length})
          </button>
          {mediums.map(m => {
            const color = MEDIUM_COLORS[m] ?? "#888";
            const isActive = filterMedium === m;
            return (
              <button key={m} onClick={() => setFilterMedium(isActive ? null : m)}
                className="rounded-full border px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors"
                style={{ borderColor: isActive ? color + "60" : "rgba(255,255,255,0.1)", background: isActive ? color + "20" : "transparent", color: isActive ? color : "#6b7280" }}>
                {m}
              </button>
            );
          })}
        </div>

        {/* Relationship type legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(RELATIONSHIP_COLORS).map(([rel, color]) => (
            <button key={rel} onClick={() => setHighlightRelType(highlightRelType === rel ? null : rel)}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold capitalize transition-colors"
              style={{ borderColor: highlightRelType === rel || !highlightRelType ? color + "60" : "rgba(255,255,255,0.1)", background: highlightRelType === rel ? color + "20" : "transparent", color: highlightRelType === rel ? color : highlightRelType ? "#374151" : color }}>
              <div className="h-1.5 w-3 rounded-full" style={{ background: color }} />
              {rel.replace(/-/g, " ")}
            </button>
          ))}
        </div>

        {/* Graph map */}
        <div className="relative rounded-3xl bg-stone-900/60 border border-white/8 overflow-hidden mb-5" style={{ height: 480 }}>
          {/* SVG edges */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {visibleEdges.map((edge, i) => {
              const from = TECHNIQUE_NODES.find(n => n.id === edge.from);
              const to = TECHNIQUE_NODES.find(n => n.id === edge.to);
              if (!from || !to) return null;
              const isHighlighted = !highlightRelType || edge.relationship === highlightRelType;
              const isConnectedToSelected = selected && (edge.from === selected.id || edge.to === selected.id);
              const color = RELATIONSHIP_COLORS[edge.relationship] ?? "#888";
              return (
                <line key={i}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isConnectedToSelected ? color : isHighlighted ? color + "50" : "rgba(255,255,255,0.04)"}
                  strokeWidth={isConnectedToSelected ? 0.4 : 0.2}
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {visibleNodes.map(node => (
            <NodeBubble key={node.id} node={node}
              isSelected={selected?.id === node.id}
              onSelect={() => setSelected(selected?.id === node.id ? null : node)} />
          ))}

          <div className="absolute bottom-3 right-3 text-[9px] text-stone-700">Tap a technique to explore</div>
        </div>

        {/* Selected node detail */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className="rounded-3xl border overflow-hidden mb-4"
              style={{ borderColor: MEDIUM_COLORS[selected.medium] + "30" }}>
              <div className="p-4" style={{ background: MEDIUM_COLORS[selected.medium] + "10" }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-amber-100">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <MediumBadge medium={selected.medium} />
                      <span className="text-[10px] text-stone-500">{selected.origin} · {selected.era}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded-full bg-stone-800 p-1.5 text-stone-400"><X size={13} /></button>
                </div>
                <p className="text-sm text-stone-300 leading-relaxed">{selected.description}</p>
              </div>

              {connectedNodes.length > 0 && (
                <div className="p-4 border-t border-white/8">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-3">Connections ({connectedNodes.length})</p>
                  <div className="space-y-2">
                    {connectedNodes.map(({ node, edge, direction }) => {
                      const relColor = RELATIONSHIP_COLORS[edge.relationship] ?? "#888";
                      const nodeColor = MEDIUM_COLORS[node.medium] ?? "#888";
                      const label = direction === "to"
                        ? `${selected.name} ${RELATIONSHIP_LABELS[edge.relationship]} ${node.name}`
                        : `${node.name} ${RELATIONSHIP_LABELS[edge.relationship]} ${selected.name}`;
                      return (
                        <button key={node.id} onClick={() => setSelected(node)}
                          className="w-full flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/60 p-2.5 hover:border-amber-500/20 transition-colors text-left">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border"
                            style={{ background: nodeColor + "20", borderColor: nodeColor + "40" }}>
                            <Layers size={12} style={{ color: nodeColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-100">{node.name}</p>
                            <p className="text-[9px] leading-tight mt-0.5" style={{ color: relColor }}>
                              {edge.label}
                            </p>
                          </div>
                          <span className="text-[9px] rounded-full border px-1.5 py-0.5 shrink-0 capitalize" style={{ color: relColor, borderColor: relColor + "40" }}>
                            {edge.relationship.replace(/-/g, " ")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* All techniques list */}
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">All Techniques ({visibleNodes.length})</p>
        <div className="space-y-2">
          {visibleNodes.map(node => {
            const color = MEDIUM_COLORS[node.medium] ?? "#888";
            const connections = getConnectedNodes(node.id).length;
            return (
              <button key={node.id} onClick={() => setSelected(selected?.id === node.id ? null : node)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3 transition-colors text-left ${selected?.id === node.id ? "border-amber-500/30 bg-amber-500/5" : "border-white/8 bg-stone-900/60 hover:border-white/15"}`}>
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 border"
                  style={{ background: color + "20", borderColor: color + "40" }}>
                  <Layers size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-100">{node.name}</p>
                  <p className="text-[10px] text-stone-500">{node.origin} · {node.era}</p>
                </div>
                <div className="text-right shrink-0">
                  <MediumBadge medium={node.medium} />
                  <p className="text-[9px] text-stone-600 mt-1">{connections} connection{connections !== 1 ? "s" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
