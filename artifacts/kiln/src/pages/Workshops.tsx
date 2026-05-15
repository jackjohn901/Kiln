import { useState } from "react";
import { MapPin, Clock, Users, ChevronRight, Star, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { workshops, workshopMediums, Workshop } from "@/data/workshops";
import Nav from "@/components/Nav";

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Advanced: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  "All levels": "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

const WORKSHOP_REVIEWS: Record<string, Array<{ name: string; rating: number; text: string }>> = {
  "ws-glass-01": [
    { name: "James T.", rating: 5, text: "Absolutely transformative. Gather technique is now intuitive for me." },
    { name: "Sarah K.", rating: 5, text: "Best workshop I've taken. Marcus explains the physics beautifully." },
    { name: "Priya M.", rating: 4, text: "Small class size means real hands-on time. Worth every penny." },
  ],
  "ws-ceramic-01": [
    { name: "Leo W.", rating: 5, text: "Finally cracked the Raku process. The reduction atmosphere section was gold." },
    { name: "Anna R.", rating: 5, text: "Incredible teacher. I left with three finished pieces and new friends." },
  ],
};

function getWorkshopReviews(id: string): Array<{ name: string; rating: number; text: string }> {
  if (WORKSHOP_REVIEWS[id]) return WORKSHOP_REVIEWS[id]!;
  const hash = id.split("").reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  const names = ["Elena V.", "Chris B.", "Mai L.", "James P.", "Rona S.", "Tariq H."];
  const texts = [
    "Excellent instruction and studio space. Highly recommended.",
    "The artist is so knowledgeable. I'll definitely be back.",
    "Small group made it feel very personal. Learned a ton.",
    "Perfect mix of theory and hands-on practice.",
  ];
  const count = 2 + (Math.abs(hash) % 2);
  return Array.from({ length: count }, (_, i) => ({
    name: names[(Math.abs(hash) + i) % names.length]!,
    rating: 4 + (Math.abs(hash + i) % 2),
    text: texts[(Math.abs(hash) + i) % texts.length]!,
  }));
}

function StarRating({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= value ? "#f59e0b" : "none"}
          className={s <= value ? "text-amber-400" : "text-stone-700"}
        />
      ))}
    </div>
  );
}

function WorkshopCard({ w }: { w: Workshop }) {
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

        {/* Workshop reviews */}
        {(() => {
          const reviews = getWorkshopReviews(w.id);
          const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
          return (
            <div className="mb-4 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <StarRating value={Math.round(avg)} />
                <span className="text-xs font-bold text-amber-300">{avg.toFixed(1)}</span>
                <span className="text-[10px] text-stone-600 flex items-center gap-1">
                  <MessageSquare size={9} /> {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {reviews.slice(0, 2).map((r, i) => (
                  <div key={i} className="rounded-lg bg-stone-800/40 px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <StarRating value={r.rating} size={9} />
                      <span className="text-[10px] text-stone-500">{r.name}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-stone-100">${w.price}</span>
          <button
            onClick={() => navigate(soldOut ? `/workshops` : `/workshops/book/${w.id}`)}
            disabled={soldOut}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold text-xs hover:bg-amber-400 transition-colors"
          >
            {soldOut ? "Waitlist" : "Reserve Spot"}
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Workshops() {
  const [medium, setMedium] = useState("All");

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
              <WorkshopCard key={w.id} w={w} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-stone-500">
              <p className="text-sm">No workshops in this medium yet.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
