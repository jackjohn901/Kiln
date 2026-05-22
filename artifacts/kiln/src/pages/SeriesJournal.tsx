import { Link } from "wouter";
import { ChevronLeft, Eye, ChevronRight, Clock, CheckCircle, BookOpen, Play } from "lucide-react";
import Nav from "@/components/Nav";
import { ALL_SERIES, type ProcessSeries } from "@/data/processSeries";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";


function SeriesCard({ series }: { series: ProcessSeries }) {
  const lastStep = series.steps[series.steps.length - 1];
  const completed = series.status === "completed";

  return (
    <Link href={`/series/${series.id}`}>
      <div className="group overflow-hidden rounded-2xl border border-white/8 bg-stone-900/60 hover:border-amber-500/20 transition-all cursor-pointer">
        {/* Cover image */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={series.coverImageUrl}
            alt={series.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${series.id}/600/340`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            {completed ? (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400 backdrop-blur-sm">
                <CheckCircle size={9} /> Completed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-400 backdrop-blur-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> In progress
              </span>
            )}
          </div>

          {/* Step count */}
          <div className="absolute bottom-3 right-3">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-stone-950/80 px-2.5 py-1 text-[10px] font-semibold text-stone-300 backdrop-blur-sm">
              <BookOpen size={9} /> {series.steps.length} steps
            </span>
          </div>

          {/* Artist avatar */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <img
              src={series.avatarUrl}
              alt={series.artistName}
              className="h-6 w-6 rounded-full object-cover border border-white/20"
              onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${series.artistId}/60/60`; }}
            />
            <span className="text-xs font-semibold text-stone-200">{series.artistName}</span>
          </div>
        </div>

        {/* Card body */}
        <div className="px-4 py-4">
          <div className="mb-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider">{series.medium}</div>
          <h3 className="font-serif text-base text-stone-200 leading-snug mb-2 group-hover:text-amber-200 transition-colors">
            {series.title}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-3">{series.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {series.tags.slice(0, 4).map(t => (
              <span key={t} className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-600">#{t}</span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-stone-600">
            <span className="flex items-center gap-1"><Eye size={9} /> {series.watcherCount.toLocaleString()} watching</span>
            <div className="flex items-center gap-3">
              {completed && series.finalSalePrice && (
                <span className="text-emerald-400 font-semibold">Sold: {series.finalSalePrice}</span>
              )}
              <span className="flex items-center gap-1"><Clock size={9} /> Latest <RelativeTime since={lastStep.postedAt} className="" /></span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SeriesJournal() {
  const inProgress = ALL_SERIES.filter(s => s.status === "in-progress");
  const completed = ALL_SERIES.filter(s => s.status === "completed");

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/discover" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Process Journals</h1>
            <p className="text-xs text-stone-500 mt-0.5">Follow artists through a complete work — step by step</p>
          </div>
        </div>

        {/* What is this? */}
        <div className="mb-8 rounded-2xl border border-white/8 bg-gradient-to-br from-amber-500/5 to-stone-900/60 p-5">
          <p className="text-sm font-semibold text-amber-200 mb-1.5">What is a Process Journal?</p>
          <p className="text-xs text-stone-400 leading-relaxed">
            Artists document a single work from first material to finished piece — each step posted as it happens. You follow the arc of creation: the mistakes, the pivots, the technical decisions. At the end: the finished piece.
          </p>
        </div>

        {/* In progress */}
        {inProgress.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Currently in progress
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {inProgress.map(s => <SeriesCard key={s.id} series={s} />)}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle size={13} className="text-emerald-400" />
                Completed journals
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {completed.map(s => <SeriesCard key={s.id} series={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
