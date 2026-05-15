import { useParams, Link } from "wouter";
import { ChevronLeft, Eye, Clock, CheckCircle, BookOpen, ExternalLink, ChevronDown, ChevronUp, Wrench, Thermometer, Timer } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { getSeriesById } from "@/data/processSeries";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 30) return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const series = getSeriesById(id ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set([series?.steps[series.steps.length - 1]?.id ?? ""]));
  const [watching, setWatching] = useState(false);

  if (!series) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex items-center justify-center p-24 text-stone-600">Journal not found.</div>
      </div>
    );
  }

  function toggleStep(id: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const completed = series.status === "completed";

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={series.coverImageUrl}
          alt={series.title}
          className="h-full w-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${series.id}/800/400`; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12100e] via-[#12100e]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6">
          <div className="mx-auto max-w-2xl">
            <Link href="/series" className="mb-3 flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={12} /> Process Journals
            </Link>
            <div className="flex items-center gap-2 mb-2">
              {completed ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                  <CheckCircle size={9} /> Completed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> In progress
                </span>
              )}
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">{series.medium}</span>
            </div>
            <h1 className="font-serif text-2xl text-amber-100 leading-tight">{series.title}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-20">
        {/* Artist + meta row */}
        <div className="mb-6 flex items-center gap-3 py-4 border-b border-white/8">
          <Link href={`/artists/${series.artistId}`}>
            <img src={series.avatarUrl} alt={series.artistName}
              className="h-10 w-10 rounded-full object-cover border border-white/10 hover:border-amber-500/30 transition-colors"
              onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${series.artistId}/80/80`; }} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/artists/${series.artistId}`} className="text-sm font-semibold text-stone-200 hover:text-amber-300 transition-colors">
              {series.artistName}
            </Link>
            <div className="flex items-center gap-3 text-[10px] text-stone-600 mt-0.5">
              <span className="flex items-center gap-1"><BookOpen size={9} /> {series.steps.length} steps</span>
              <span className="flex items-center gap-1"><Eye size={9} /> {series.watcherCount.toLocaleString()} watching</span>
              {series.startedAt && <span className="flex items-center gap-1"><Clock size={9} /> Started {new Date(series.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            </div>
          </div>
          <button
            onClick={() => setWatching(w => !w)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${watching ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-amber-500 text-stone-950 hover:bg-amber-400"}`}
          >
            {watching ? "✓ Watching" : "Watch Journal"}
          </button>
        </div>

        {/* Description */}
        <p className="mb-6 text-sm text-stone-400 leading-relaxed">{series.description}</p>

        {/* Tags */}
        <div className="mb-8 flex flex-wrap gap-1.5">
          {series.tags.map(t => (
            <span key={t} className="rounded-full border border-white/10 bg-stone-800/80 px-2.5 py-0.5 text-[11px] text-stone-500">#{t}</span>
          ))}
        </div>

        {/* Final sale */}
        {completed && series.finalSalePrice && (
          <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Finished piece sold for</p>
              <p className="text-xl font-bold text-emerald-300">{series.finalSalePrice}</p>
            </div>
            <CheckCircle size={24} className="text-emerald-400" />
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>{series.steps.length} steps posted</span>
            {completed && <span className="text-emerald-400 font-semibold">Complete</span>}
          </div>
          <div className="relative h-1.5 rounded-full bg-stone-800">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: completed ? "100%" : `${Math.min((series.steps.length / (series.steps.length + 2)) * 100, 85)}%` }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {series.steps.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-amber-500/80" />
            ))}
            {!completed && (
              <>
                <div className="h-1.5 flex-1 rounded-full bg-stone-800 border border-dashed border-stone-700" />
                <div className="h-1.5 flex-1 rounded-full bg-stone-800 border border-dashed border-stone-700" />
              </>
            )}
          </div>
        </div>

        {/* Steps — reverse chronological (latest first) */}
        <div className="flex flex-col gap-4">
          {[...series.steps].reverse().map((step, idx) => {
            const isLatest = idx === 0 && !completed;
            const isOpen = expanded.has(step.id);

            return (
              <div
                key={step.id}
                className={`overflow-hidden rounded-2xl border transition-all ${isLatest ? "border-amber-500/30 bg-amber-500/5" : "border-white/8 bg-stone-900/60"}`}
              >
                <button className="w-full text-left px-5 py-4" onClick={() => toggleStep(step.id)}>
                  <div className="flex items-start gap-3">
                    {/* Step number */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${isLatest ? "border-amber-500/40 bg-amber-500/15 text-amber-400" : "border-white/10 bg-stone-800 text-stone-500"}`}>
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isLatest && <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Latest</span>}
                        <span className="text-[10px] text-stone-600">{timeAgo(step.postedAt)}</span>
                      </div>
                      <h3 className={`text-sm font-semibold leading-snug ${isLatest ? "text-stone-100" : "text-stone-300"}`}>{step.title}</h3>
                      {!isOpen && <p className="mt-1 text-xs text-stone-500 line-clamp-1">{step.description}</p>}
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-stone-600 shrink-0 mt-1" /> : <ChevronDown size={14} className="text-stone-600 shrink-0 mt-1" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-white/8">
                        {/* Image */}
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={step.imageUrl}
                            alt={step.title}
                            className="h-full w-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${step.id}/600/340`; }}
                          />
                        </div>

                        <div className="px-5 py-5 space-y-4">
                          <p className="text-sm text-stone-300 leading-relaxed">{step.description}</p>

                          {step.materials && step.materials.length > 0 && (
                            <div>
                              <p className="flex items-center gap-1.5 text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-2">
                                <Wrench size={9} /> Materials Used
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {step.materials.map(m => (
                                  <span key={m} className="rounded-full border border-sky-500/20 bg-sky-500/5 px-2.5 py-0.5 text-[11px] text-sky-300">{m}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.technicalNotes && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Technical Notes</p>
                              <p className="text-xs text-stone-400 leading-relaxed font-mono">{step.technicalNotes}</p>
                            </div>
                          )}

                          {step.kilnSchedule && (
                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">
                                <Thermometer size={9} /> Kiln Schedule
                              </p>
                              <p className="text-xs text-stone-400 leading-relaxed font-mono">{step.kilnSchedule}</p>
                            </div>
                          )}

                          {step.timeSpent && (
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <Timer size={12} className="text-stone-600" />
                              <span>Time: <span className="text-stone-300 font-medium">{step.timeSpent}</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {!completed && (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse mx-auto mb-3" />
            <p className="text-sm text-stone-500">This journal is still in progress.</p>
            <p className="text-xs text-stone-600 mt-1">New steps will appear here as {series.artistName.split(" ")[0]} posts them.</p>
          </div>
        )}
      </div>
    </div>
  );
}
