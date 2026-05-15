import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, Clock, CheckCircle2, ChevronRight, Users } from "lucide-react";
import Nav from "@/components/Nav";
import { DROPS, getLiveDrops, getUpcomingDrops, getTimeUntilDrop, type Drop } from "@/data/drops";
import { useSocial } from "@/contexts/SocialContext";
import DropModal from "@/components/DropModal";

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function CountdownBadge({ dropDate }: { dropDate: string }) {
  const [time, setTime] = useState(getTimeUntilDrop(dropDate));
  useEffect(() => {
    const iv = setInterval(() => setTime(getTimeUntilDrop(dropDate)), 10000);
    return () => clearInterval(iv);
  }, [dropDate]);
  return (
    <span className="flex items-center gap-1 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-mono font-medium text-amber-300 border border-amber-500/20">
      <Clock size={10} className="text-amber-400" />
      {time}
    </span>
  );
}

function DropCard({ drop, onOpen }: { drop: Drop; onOpen: (d: Drop) => void }) {
  const { isOnDropWaitlist } = useSocial();
  const onWaitlist = isOnDropWaitlist(drop.id);

  return (
    <div
      onClick={() => drop.status !== "sold" && onOpen(drop)}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-stone-900/60 transition-all duration-200 ${
        drop.status !== "sold" ? "cursor-pointer hover:border-amber-500/30 hover:bg-stone-900/80" : "opacity-60"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={drop.imageUrl} alt={drop.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          {drop.status === "live" && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Live Now
            </span>
          )}
          {drop.status === "upcoming" && <CountdownBadge dropDate={drop.dropDate} />}
          {drop.status === "sold" && (
            <span className="flex items-center gap-1.5 rounded-full bg-stone-700 px-3 py-1 text-xs font-medium text-stone-400">
              <CheckCircle2 size={10} />
              Sold Out
            </span>
          )}
        </div>

        {/* Waitlist badge */}
        {onWaitlist && drop.status !== "sold" && (
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-stone-950">On waitlist</span>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-serif text-lg font-medium text-white leading-tight">{drop.title}</p>
          <p className="text-sm text-stone-400">{drop.artistName}</p>
        </div>
      </div>

      {/* Detail row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-amber-300">{formatPrice(drop.price)}</p>
          <p className="text-xs text-stone-500">{drop.technique}</p>
        </div>
        <div className="text-right">
          {drop.spotsTotal > 1 ? (
            <p className="text-sm font-medium text-stone-300">
              {drop.spotsLeft} of {drop.spotsTotal} left
            </p>
          ) : (
            <p className="text-sm font-medium text-stone-300">Unique piece</p>
          )}
          {drop.waitlistCount > 0 && (
            <p className="flex items-center justify-end gap-1 text-xs text-stone-600">
              <Users size={10} />
              {drop.waitlistCount} waiting
            </p>
          )}
        </div>
        {drop.status !== "sold" && (
          <ChevronRight size={16} className="text-stone-600 group-hover:text-amber-400 transition-colors ml-2" />
        )}
      </div>
    </div>
  );
}

export default function Drops() {
  const [, navigate] = useLocation();
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "sold">("all");

  const liveDrops = getLiveDrops();
  const upcomingDrops = getUpcomingDrops();
  const soldDrops = DROPS.filter((d) => d.status === "sold");

  const filtered =
    filter === "all" ? DROPS :
    filter === "live" ? liveDrops :
    filter === "upcoming" ? upcomingDrops :
    soldDrops;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={22} className="text-amber-400" />
            <h1 className="font-serif text-3xl text-amber-100">Limited Drops</h1>
          </div>
          <p className="text-stone-400 max-w-xl">
            Artists release one-of-a-kind works and limited editions at a specific moment. Join the waitlist before they go live.
          </p>
        </div>

        {/* Live drop banner */}
        {liveDrops.length > 0 && filter === "all" && (
          <div className="mb-8 rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-green-400">{liveDrops.length} drop{liveDrops.length > 1 ? "s" : ""} live right now</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {liveDrops.map((drop) => (
                <DropCard key={drop.id} drop={drop} onOpen={setSelectedDrop} />
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-5 flex gap-2 flex-wrap">
          {(["all", "live", "upcoming", "sold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filter === f ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-400 hover:text-amber-200"
              }`}
            >
              {f === "all" ? `All (${DROPS.length})` : f === "live" ? `Live (${liveDrops.length})` : f === "upcoming" ? `Upcoming (${upcomingDrops.length})` : `Sold (${soldDrops.length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((drop) => (
            <DropCard key={drop.id} drop={drop} onOpen={setSelectedDrop} />
          ))}
        </div>

        {/* Explainer */}
        <div className="mt-12 rounded-2xl border border-white/8 bg-stone-900/40 p-6 text-center">
          <h3 className="font-serif text-lg text-amber-200 mb-2">How drops work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-stone-400 mt-4">
            <div>
              <p className="text-amber-400 font-medium mb-1">1. Artist announces</p>
              <p>Artists schedule a specific date and time for their work to release — you see it here first.</p>
            </div>
            <div>
              <p className="text-amber-400 font-medium mb-1">2. You join the waitlist</p>
              <p>Add yourself to the waitlist before the drop goes live. You'll get a notification at release time.</p>
            </div>
            <div>
              <p className="text-amber-400 font-medium mb-1">3. First in line wins</p>
              <p>When the drop goes live, waitlist members get first access. Unclaimed pieces open to everyone.</p>
            </div>
          </div>
          {/* Artist CTA */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-stone-500 text-sm mb-3">Are you an artist? Schedule your next drop when you post.</p>
            <button
              onClick={() => navigate("/create")}
              className="rounded-full bg-amber-500/20 border border-amber-500/30 px-5 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Schedule a drop
            </button>
          </div>
        </div>
      </div>

      {selectedDrop && (
        <DropModal drop={selectedDrop} onClose={() => setSelectedDrop(null)} />
      )}
    </div>
  );
}
