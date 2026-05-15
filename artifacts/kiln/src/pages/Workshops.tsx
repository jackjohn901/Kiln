import { useState } from "react";
import { MapPin, Clock, Users, ChevronRight, Star, X } from "lucide-react";
import { useLocation } from "wouter";
import { workshops, workshopMediums, Workshop } from "@/data/workshops";
import Nav from "@/components/Nav";
import CommissionModal from "@/components/CommissionModal";
import { useSocial } from "@/contexts/SocialContext";

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Advanced: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  "All levels": "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

function WorkshopCard({ w, onReserve }: { w: Workshop; onReserve: (w: Workshop) => void }) {
  const [, navigate] = useLocation();
  const spotsRemaining = w.spotsLeft;
  const soldOut = spotsRemaining === 0;

  return (
    <div className="bg-stone-900 rounded-2xl overflow-hidden hover:ring-1 hover:ring-amber-500/40 transition-all group">
      <div className="relative aspect-video">
        <img src={w.imageUrl} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
        <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full border text-xs font-medium ${LEVEL_COLORS[w.level] ?? "text-stone-400 bg-stone-800 border-stone-700"}`}>
          {w.level}
        </span>
        {soldOut && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-stone-900/90 text-rose-400 text-xs font-medium border border-rose-500/30">
            Sold out
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-stone-100 mb-1 leading-snug">{w.title}</h3>

        <button
          onClick={() => navigate(`/artists/${w.artistId}`)}
          className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          <img src={w.artistAvatarUrl} alt={w.artistName} className="w-5 h-5 rounded-full object-cover" />
          <span className="text-xs text-amber-400">{w.artistName}</span>
        </button>

        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed mb-3">{w.description}</p>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Star size={11} className="text-amber-400 flex-shrink-0" />
            <span>{w.startDate}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <MapPin size={11} className="text-stone-500 flex-shrink-0" />
            <span>{w.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Clock size={11} className="text-stone-500 flex-shrink-0" />
            <span>{w.duration}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Users size={11} className="text-stone-500 flex-shrink-0" />
            <span>{soldOut ? "Sold out" : `${spotsRemaining} of ${w.spots} spots left`}</span>
          </div>
        </div>

        {w.includes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {w.includes.slice(0, 3).map((inc) => (
              <span key={inc} className="px-2 py-0.5 rounded-full bg-stone-800 text-xs text-stone-400">
                {inc}
              </span>
            ))}
            {w.includes.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-stone-800 text-xs text-stone-500">
                +{w.includes.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-stone-100">${w.price}</span>
          <button
            onClick={() => onReserve(w)}
            disabled={soldOut}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-xs hover:bg-amber-400 transition-colors"
          >
            {soldOut ? "Waitlist" : "Reserve spot"}
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Workshops() {
  const [medium, setMedium] = useState("All");
  const [reserving, setReserving] = useState<Workshop | null>(null);
  const { getArtistCommissionStatus } = useSocial();

  const filtered = medium === "All" ? workshops : workshops.filter((w) => w.medium === medium);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-4 pb-12">
          <div className="py-8">
            <h1 className="text-2xl font-bold text-stone-100 mb-1">Workshops</h1>
            <p className="text-sm text-stone-400">Hands-on craft workshops taught by working artists — small classes, big technique</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {workshopMediums.map((m) => (
              <button
                key={m}
                onClick={() => setMedium(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  medium === m
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-stone-700 text-stone-400 hover:border-stone-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <p className="text-xs text-stone-500 mb-4">{filtered.length} workshop{filtered.length !== 1 ? "s" : ""}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((w) => (
              <WorkshopCard key={w.id} w={w} onReserve={setReserving} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              <p className="text-sm">No workshops in this medium yet.</p>
            </div>
          )}
        </div>
      </div>

      {reserving && (
        <CommissionModal
          artistId={reserving.artistId}
          artistName={reserving.artistName}
          artistAvatarUrl={reserving.artistAvatarUrl}
          commissionStatus={getArtistCommissionStatus(reserving.artistId)}
          onClose={() => setReserving(null)}
        />
      )}
    </div>
  );
}
