import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { BookOpen, ChevronRight, ArrowLeft, Wrench, Layers, Clock, Star, Users, Film } from "lucide-react";
import Nav from "@/components/Nav";
import { TECHNIQUES, getTechniquesByMedium, type Technique } from "@/data/techniques";
import { ALL_REELS } from "@/data/reels";

const MEDIUMS = ["All", "Glass", "Metal", "Ceramics", "Fiber", "Enamel", "Wood"];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "text-green-400 bg-green-500/10 border-green-500/20",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Advanced: "text-red-400 bg-red-500/10 border-red-500/20",
};

function TechniqueCard({ technique, onClick }: { technique: Technique; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border border-white/10 bg-stone-900/60 overflow-hidden hover:border-amber-500/30 hover:bg-stone-900/80 transition-all"
    >
      <div className="aspect-video overflow-hidden relative">
        <img src={technique.imageUrl} alt={technique.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${DIFFICULTY_COLORS[technique.difficulty]}`}>
            {technique.difficulty}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-serif text-lg text-amber-100 leading-tight">{technique.name}</h3>
            <p className="text-xs text-stone-500">{technique.medium}</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-stone-600 group-hover:text-amber-400 transition-colors mt-1" />
        </div>
        <p className="text-sm text-stone-400 line-clamp-2">{technique.tagline}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-stone-600">
          <span className="flex items-center gap-1"><Wrench size={10} />{technique.tools.length} tools</span>
          <span className="flex items-center gap-1"><Users size={10} />{technique.artistIds.length} artists</span>
        </div>
      </div>
    </button>
  );
}

function TechniqueDetail({ technique, onBack }: { technique: Technique; onBack: () => void }) {
  const [, navigate] = useLocation();
  const techniqueReels = ALL_REELS.filter((r) => r.technique === technique.name);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-amber-300 transition-colors mb-6 text-sm">
        <ArrowLeft size={15} />
        All techniques
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl mb-8">
        <img src={technique.imageUrl} alt={technique.name} className="w-full h-56 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium mb-2 ${DIFFICULTY_COLORS[technique.difficulty]}`}>
            {technique.difficulty}
          </span>
          <h1 className="font-serif text-3xl text-white mb-1">{technique.name}</h1>
          <p className="text-stone-400 text-sm">{technique.medium}</p>
        </div>
      </div>

      <p className="text-amber-200 text-lg font-medium mb-4 font-serif leading-relaxed">{technique.tagline}</p>
      <p className="text-stone-300 leading-relaxed mb-6">{technique.description}</p>

      {/* History */}
      <div className="mb-8">
        <h2 className="font-serif text-xl text-amber-100 mb-3">A brief history</h2>
        <p className="text-stone-400 leading-relaxed">{technique.history}</p>
      </div>

      {/* Process */}
      <div className="mb-8">
        <h2 className="font-serif text-xl text-amber-100 mb-4">The process</h2>
        <div className="space-y-3">
          {technique.process.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 text-sm font-bold text-amber-400">
                {i + 1}
              </div>
              <p className="text-stone-300 pt-0.5 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tools + Materials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5">
          <h3 className="flex items-center gap-2 font-medium text-amber-200 mb-3">
            <Wrench size={14} />
            Tools
          </h3>
          <ul className="space-y-1.5">
            {technique.tools.map((tool) => (
              <li key={tool} className="flex items-start gap-2 text-sm text-stone-400">
                <span className="text-amber-500/60 mt-1">·</span>
                {tool}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5">
          <h3 className="flex items-center gap-2 font-medium text-amber-200 mb-3">
            <Layers size={14} />
            Materials
          </h3>
          <ul className="space-y-1.5">
            {technique.materials.map((m) => (
              <li key={m} className="flex items-start gap-2 text-sm text-stone-400">
                <span className="text-amber-500/60 mt-1">·</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Learn time */}
      <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <Clock size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-300">How long to learn?</p>
          <p className="text-sm text-stone-400">{technique.learnTime}</p>
        </div>
      </div>

      {/* Featured artists */}
      {technique.artistIds.length > 0 && (
        <div>
          <h2 className="font-serif text-xl text-amber-100 mb-4">Featured artists</h2>
          <div className="flex flex-wrap gap-3">
            {technique.artistIds.map((id) => (
              <button
                key={id}
                onClick={() => navigate(`/artists/${id}`)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:border-amber-500/30 hover:text-amber-200 transition-all"
              >
                <img
                  src={`https://picsum.photos/seed/${id}/40/40`}
                  alt={id}
                  className="h-5 w-5 rounded-full object-cover"
                />
                {id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reels on Kiln */}
      {techniqueReels.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-xl text-amber-100 mb-4 flex items-center gap-2">
            <Film size={16} className="text-amber-400" />
            {techniqueReels.length} reel{techniqueReels.length !== 1 ? "s" : ""} on Kiln
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {techniqueReels.slice(0, 6).map((r) => (
              <div key={r.id} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-stone-900">
                <img
                  src={r.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/200/360`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[10px] font-semibold text-white leading-tight truncate">{r.artistName}</p>
                </div>
              </div>
            ))}
          </div>
          {techniqueReels.length > 6 && (
            <p className="text-xs text-stone-600 mt-2">+{techniqueReels.length - 6} more reels from this technique</p>
          )}
        </div>
      )}

      {/* Related techniques */}
      {technique.relatedTechniqueIds.length > 0 && (
        <div className="mt-8 mb-4">
          <h2 className="font-serif text-xl text-amber-100 mb-3">Related techniques</h2>
          <div className="flex flex-wrap gap-2">
            {technique.relatedTechniqueIds.map((relId) => {
              const rel = TECHNIQUES.find((t) => t.id === relId);
              if (!rel) return null;
              return (
                <button
                  key={relId}
                  onClick={() => navigate(`/techniques/${relId}`)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-stone-800/60 px-4 py-2 text-sm text-stone-300 hover:border-amber-500/30 hover:text-amber-200 transition-all"
                >
                  <ChevronRight size={12} className="text-stone-600" />
                  {rel.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Techniques() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const [medium, setMedium] = useState("All");
  const [search, setSearch] = useState("");

  const selectedTechnique = params.id ? TECHNIQUES.find((t) => t.id === params.id) : null;

  const filtered = TECHNIQUES.filter((t) => {
    const matchMedium = medium === "All" || t.medium === medium;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tagline.toLowerCase().includes(search.toLowerCase());
    return matchMedium && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      {selectedTechnique ? (
        <TechniqueDetail
          technique={selectedTechnique}
          onBack={() => navigate("/techniques")}
        />
      ) : (
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen size={22} className="text-amber-400" />
              <h1 className="font-serif text-3xl text-amber-100">Technique Wiki</h1>
            </div>
            <p className="text-stone-400 max-w-xl">
              Deep guides to the processes behind the work — tools, materials, history, and step-by-step.
            </p>
          </div>

          {/* Search */}
          <div className="mb-5">
            <input
              type="text"
              placeholder="Search techniques…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-white/10 bg-stone-900 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {/* Medium filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {MEDIUMS.map((m) => (
              <button
                key={m}
                onClick={() => setMedium(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  medium === m ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-400 hover:text-amber-200"
                }`}
              >
                {m}
                {m !== "All" && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    ({getTechniquesByMedium(m).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Difficulty legend */}
          <div className="mb-6 flex gap-4 text-xs">
            {Object.entries(DIFFICULTY_COLORS).map(([level, cls]) => (
              <span key={level} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${cls}`}>
                <Star size={9} />
                {level}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((technique) => (
              <TechniqueCard
                key={technique.id}
                technique={technique}
                onClick={() => navigate(`/techniques/${technique.id}`)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <BookOpen size={28} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500">No techniques match your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
